import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      userId, 
      goalContext = null, 
      sessionContext = null,
      recommendationType = 'general' // 'pre-session', 'post-session', 'goal-specific', 'general'
    } = await req.json();

    console.log('Generating resource recommendations for userId:', userId);

    // Fetch comprehensive user data for recommendations
    const [userProfileResult, userPatternsResult, resourceInteractionsResult, recentSessionsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single(),
      
      supabase
        .from('user_behavioral_patterns')
        .select('*')
        .eq('user_id', userId),
      
      supabase
        .from('resource_interactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      
      supabase
        .from('sessions')
        .select(`
          *,
          session_outcomes(*),
          coaches(name, specialties, coaching_style)
        `)
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    if (userProfileResult.error) throw userProfileResult.error;
    if (userPatternsResult.error) throw userPatternsResult.error;
    if (resourceInteractionsResult.error) throw resourceInteractionsResult.error;
    if (recentSessionsResult.error) throw recentSessionsResult.error;

    const analysisData = {
      userProfile: userProfileResult.data,
      behavioralPatterns: userPatternsResult.data,
      resourceHistory: resourceInteractionsResult.data,
      recentSessions: recentSessionsResult.data,
      goalContext,
      sessionContext,
      recommendationType
    };

    // AI-powered resource recommendation engine
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are an expert learning and development specialist with deep knowledge of coaching resources, learning materials, and personal development tools. 

            Generate personalized resource recommendations based on:
            1. User's personality profile and learning preferences
            2. Current goals and coaching context
            3. Past resource engagement patterns
            4. Session outcomes and feedback
            5. Behavioral insights and growth areas

            Recommend diverse resource types:
            - Articles and research papers
            - Books and audiobooks
            - Podcasts and videos
            - Tools and assessments
            - Exercises and worksheets
            - Apps and digital platforms
            - Courses and workshops

            Return comprehensive recommendations:
            {
              "resourceRecommendations": [
                {
                  "id": string,
                  "title": string,
                  "type": "article|book|podcast|video|tool|exercise|app|course",
                  "description": string,
                  "relevanceScore": number (0-100),
                  "personalizedReason": string,
                  "expectedImpact": string,
                  "timeToComplete": string,
                  "difficulty": "beginner|intermediate|advanced",
                  "tags": string[],
                  "url": string (if available),
                  "priority": "high|medium|low"
                }
              ],
              "learningPath": {
                "sequence": string[],
                "timeframe": string,
                "milestones": string[]
              },
              "contextualInsights": {
                "learningGaps": string[],
                "strengthsToLeverage": string[],
                "optimizationSuggestions": string[]
              },
              "engagementStrategy": {
                "recommendedApproach": string,
                "motivationalFactors": string[],
                "potentialBarriers": string[]
              }
            }`
          },
          {
            role: 'user',
            content: JSON.stringify(analysisData)
          }
        ],
        max_completion_tokens: 3000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const recommendationData = JSON.parse(result.choices[0].message.content);

    // Store recommendation patterns for learning
    await supabase.rpc('update_behavioral_pattern', {
      p_user_id: userId,
      p_pattern_type: `resource_recommendations_${recommendationType}`,
      p_pattern_data: {
        ...recommendationData,
        generatedAt: new Date().toISOString(),
        context: { goalContext, sessionContext, recommendationType }
      },
      p_confidence_score: 0.85
    });

    // Track the recommendation generation
    await supabase.rpc('track_user_activity', {
      p_user_id: userId,
      p_session_token: crypto.randomUUID(),
      p_activity_type: 'resource_recommendation_generated',
      p_page_url: '/recommendations',
      p_action_details: {
        recommendationType,
        resourceCount: recommendationData.resourceRecommendations.length
      },
      p_metadata: {
        goalContext: goalContext?.id || null,
        sessionContext: sessionContext?.id || null
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: recommendationData,
        metadata: {
          recommendationType,
          resourceCount: recommendationData.resourceRecommendations.length,
          generatedAt: new Date().toISOString()
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating resource recommendations:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate resource recommendations'
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