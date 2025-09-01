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
      coachId = null,
      sessionId = null,
      insightType = 'pre-session' // 'pre-session', 'post-session', 'progress-review', 'goal-adjustment'
    } = await req.json();

    console.log('Generating coaching insights for userId:', userId, 'insightType:', insightType);

    // Fetch comprehensive coaching context
    const [userProfileResult, userPatternsResult, sessionHistoryResult, currentSessionResult, coachInfoResult] = await Promise.all([
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
        .from('sessions')
        .select(`
          *,
          session_outcomes(*),
          session_recordings(sentiment_analysis, key_topics, ai_summary),
          coaches(name, coaching_style, specialties)
        `)
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
      
      sessionId ? supabase
        .from('sessions')
        .select(`
          *,
          session_outcomes(*),
          session_recordings(*)
        `)
        .eq('id', sessionId)
        .single() : Promise.resolve({ data: null, error: null }),
      
      coachId ? supabase
        .from('coaches')
        .select('*')
        .eq('id', coachId)
        .single() : Promise.resolve({ data: null, error: null })
    ]);

    if (userProfileResult.error) throw userProfileResult.error;
    if (userPatternsResult.error) throw userPatternsResult.error;
    if (sessionHistoryResult.error) throw sessionHistoryResult.error;

    const analysisData = {
      userProfile: userProfileResult.data,
      behavioralPatterns: userPatternsResult.data,
      sessionHistory: sessionHistoryResult.data,
      currentSession: currentSessionResult.data,
      coachInfo: coachInfoResult.data,
      insightType
    };

    // AI-powered coaching insights generation
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are an expert coaching supervisor with deep expertise in coaching psychology, behavioral change, and session optimization. Generate actionable insights for coaches.

            Based on the insight type, provide:

            PRE-SESSION INSIGHTS:
            - Client's current state and readiness
            - Key areas of focus for the session
            - Potential conversation starters
            - Communication approach recommendations
            - Anticipated challenges and opportunities

            POST-SESSION INSIGHTS:
            - Session effectiveness analysis
            - Progress indicators and breakthroughs
            - Areas for follow-up
            - Homework and action item suggestions
            - Next session preparation

            PROGRESS REVIEW:
            - Long-term trend analysis
            - Goal achievement assessment
            - Behavioral pattern evolution
            - Success factors and obstacles
            - Strategic coaching adjustments

            Return comprehensive insights:
            {
              "primaryInsights": [
                {
                  "category": string,
                  "insight": string,
                  "evidence": string[],
                  "actionItems": string[],
                  "priority": "high|medium|low"
                }
              ],
              "clientReadiness": {
                "motivationLevel": number (0-100),
                "receptivityToFeedback": number (0-100),
                "changeReadiness": number (0-100),
                "emotionalState": string
              },
              "coachingRecommendations": {
                "approachStrategy": string,
                "communicationStyle": string,
                "sessionStructure": string,
                "focusAreas": string[],
                "avoidanceTopics": string[]
              },
              "conversationStarters": string[],
              "potentialBreakthroughs": string[],
              "riskFactors": string[],
              "successMetrics": {
                "shortTerm": string[],
                "longTerm": string[]
              },
              "followUpActions": {
                "immediate": string[],
                "withinWeek": string[],
                "strategic": string[]
              }
            }`
          },
          {
            role: 'user',
            content: JSON.stringify(analysisData)
          }
        ],
        max_completion_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const insightData = JSON.parse(result.choices[0].message.content);

    // Store insights for tracking and improvement
    await supabase
      .from('session_insights')
      .insert({
        session_id: sessionId,
        insight_type: insightType,
        insight_data: {
          ...insightData,
          generatedAt: new Date().toISOString(),
          aiModelVersion: 'gpt-5-2025-08-07',
          userId,
          coachId
        },
        confidence_score: 0.88,
        ai_model_version: 'gpt-5-2025-08-07'
      });

    // Track insight generation activity
    await supabase.rpc('track_user_activity', {
      p_user_id: userId,
      p_session_token: crypto.randomUUID(),
      p_activity_type: 'coaching_insights_generated',
      p_page_url: '/coaching-insights',
      p_action_details: {
        insightType,
        coachId,
        sessionId,
        insightCount: insightData.primaryInsights.length
      },
      p_metadata: {
        clientReadiness: insightData.clientReadiness,
        generatedAt: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        insights: insightData,
        metadata: {
          insightType,
          generatedAt: new Date().toISOString(),
          aiModel: 'gpt-5-2025-08-07',
          sessionId,
          coachId
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
    console.error('Error generating coaching insights:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate coaching insights'
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