import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, sessionData, responses, personalityResponses } = await req.json();

    console.log('Analyzing user behavior for userId:', userId);

    // Fetch user's activity logs
    const { data: activityLogs, error: activityError } = await supabase
      .from('user_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (activityError) {
      console.error('Error fetching activity logs:', activityError);
      throw activityError;
    }

    // Fetch existing behavioral patterns
    const { data: existingPatterns, error: patternsError } = await supabase
      .from('user_behavioral_patterns')
      .select('*')
      .eq('user_id', userId);

    if (patternsError) {
      console.error('Error fetching behavioral patterns:', patternsError);
      throw patternsError;
    }

    // Prepare data for AI analysis
    const analysisData = {
      userResponses: responses,
      personalityResponses,
      activityLogs: activityLogs?.slice(0, 50), // Limit for API efficiency
      existingPatterns,
      sessionData
    };

    // Call OpenAI for comprehensive behavioral analysis
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert behavioral analyst specializing in personality assessment and coaching compatibility. Analyze the provided user data and generate comprehensive behavioral insights.

            Focus on:
            1. Big 5 personality traits (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)
            2. Communication style preferences
            3. Learning patterns and engagement behaviors
            4. Motivation triggers and success patterns
            5. Coaching style compatibility

            Return a JSON object with these exact fields:
            {
              "personalityTraits": {
                "openness": number (0-100),
                "conscientiousness": number (0-100),
                "extraversion": number (0-100),
                "agreeableness": number (0-100),
                "neuroticism": number (0-100)
              },
              "communicationStyle": {
                "directness": number (0-100),
                "analyticalThinking": number (0-100),
                "emotionalExpression": number (0-100),
                "conflictStyle": "collaborative" | "competitive" | "accommodating" | "avoiding"
              },
              "engagementPatterns": {
                "sessionPreferences": string,
                "interactionStyle": string,
                "feedbackReceptivity": string
              },
              "motivationTriggers": string[],
              "coachingRecommendations": {
                "idealCoachingStyle": string,
                "sessionStructure": string,
                "communicationApproach": string
              },
              "insights": string[]
            }`
          },
          {
            role: 'user',
            content: JSON.stringify(analysisData)
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorText}`);
    }

    const openaiResult = await openaiResponse.json();
    const analysisContent = openaiResult.choices[0].message.content;

    let behavioralAnalysis;
    try {
      behavioralAnalysis = JSON.parse(analysisContent);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw new Error('Failed to parse AI analysis response');
    }

    // Store behavioral patterns in database
    const patterns = [
      {
        pattern_type: 'personality_traits',
        pattern_data: behavioralAnalysis.personalityTraits,
        confidence_score: 0.85
      },
      {
        pattern_type: 'communication_style',
        pattern_data: behavioralAnalysis.communicationStyle,
        confidence_score: 0.80
      },
      {
        pattern_type: 'engagement_patterns',
        pattern_data: behavioralAnalysis.engagementPatterns,
        confidence_score: 0.75
      }
    ];

    // Update behavioral patterns using the stored procedure
    for (const pattern of patterns) {
      await supabase.rpc('update_behavioral_pattern', {
        p_user_id: userId,
        p_pattern_type: pattern.pattern_type,
        p_pattern_data: pattern.pattern_data,
        p_confidence_score: pattern.confidence_score
      });
    }

    // Update user profile with insights
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        personality_traits: behavioralAnalysis.personalityTraits,
        communication_style: behavioralAnalysis.communicationStyle,
        engagement_patterns: behavioralAnalysis.engagementPatterns,
        motivation_triggers: behavioralAnalysis.motivationTriggers,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't throw here, as the analysis was successful
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: behavioralAnalysis,
        patternsUpdated: patterns.length,
        profileUpdated: !profileError
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-user-behavior function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to analyze user behavior'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});