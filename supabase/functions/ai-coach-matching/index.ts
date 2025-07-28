import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserResponse {
  selectedGoal: any;
  responses: Array<{ question: string; answer: string; type: string }>;
  userId?: string;
}

interface Coach {
  id: string;
  name: string;
  title: string;
  bio: string;
  years_experience: number;
  specialties: string[];
  similar_experiences: string[];
  rating: number;
  total_reviews: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const { selectedGoal, responses, userId }: UserResponse = await req.json();

    // Fetch all active coaches
    const { data: coaches, error: coachError } = await supabase
      .from('coaches')
      .select('*')
      .eq('is_active', true);

    if (coachError) {
      throw new Error(`Failed to fetch coaches: ${coachError.message}`);
    }

    console.log(`Fetched ${coaches?.length || 0} coaches for matching`);

    // Create AI prompt for coach matching
    const prompt = `
As an AI coach matching expert, analyze the user's responses and match them with the most suitable coaches from the available options.

USER'S GOAL: ${JSON.stringify(selectedGoal)}

USER'S RESPONSES:
${responses.map(r => `Q: ${r.question}\nA: ${r.answer}`).join('\n\n')}

AVAILABLE COACHES:
${coaches?.map(coach => `
Coach: ${coach.name}
Title: ${coach.title}
Experience: ${coach.years_experience} years
Specialties: ${coach.specialties.join(', ')}
Similar Experiences: ${coach.similar_experiences.join(', ')}
Bio: ${coach.bio}
Rating: ${coach.rating}/5.0 (${coach.total_reviews} reviews)
ID: ${coach.id}
`).join('\n---\n') || 'No coaches available'}

MATCHING CRITERIA:
1. Similar experiences to user's situation
2. Relevant specialties for the user's goal
3. Appropriate experience level (15+ years preferred for complex transitions)
4. Personality/approach fit based on user responses
5. Proven track record (high ratings)

Please analyze and return EXACTLY 5 coaches ranked by best fit. For each coach, provide:
1. A personalized explanation (2-3 sentences) of why this coach is a good match
2. The specific experiences or specialties that align with the user's needs
3. A confidence score (1-10) for the match quality

Respond in JSON format:
{
  "analysis": "Brief overall analysis of user needs",
  "recommendations": [
    {
      "coachId": "uuid",
      "coachName": "Name",
      "matchReason": "Personalized explanation",
      "keyAlignments": ["alignment1", "alignment2"],
      "confidenceScore": 8
    }
  ]
}

Ensure exactly 5 recommendations, prioritizing quality of match over other factors.
`;

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert AI coach matching system. Always respond with valid JSON format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status} ${openAIResponse.statusText}`);
    }

    const openAIData = await openAIResponse.json();
    const aiAnalysis = JSON.parse(openAIData.choices[0].message.content);

    console.log('AI Analysis completed:', aiAnalysis.analysis);
    console.log(`Generated ${aiAnalysis.recommendations?.length || 0} recommendations`);

    // Store the analysis in user_responses table
    const { error: storeError } = await supabase
      .from('user_responses')
      .insert({
        user_id: userId || null,
        selected_goal: selectedGoal,
        responses: responses,
        ai_analysis: aiAnalysis,
        recommended_coaches: aiAnalysis.recommendations?.map((r: any) => r.coachId) || []
      });

    if (storeError) {
      console.error('Failed to store user responses:', storeError);
      // Don't throw error, just log it
    }

    // Return the AI analysis with coach details
    const recommendedCoaches = aiAnalysis.recommendations?.map((rec: any) => {
      const coach = coaches?.find(c => c.id === rec.coachId);
      return {
        ...rec,
        coach: coach || null
      };
    }).filter((rec: any) => rec.coach) || [];

    return new Response(JSON.stringify({
      analysis: aiAnalysis.analysis,
      recommendations: recommendedCoaches,
      totalRecommendations: recommendedCoaches.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-coach-matching function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      analysis: "Unable to process coach matching at this time",
      recommendations: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});