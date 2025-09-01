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

    const { userId, coachIds = [], analysisMode = 'compatibility' } = await req.json();

    console.log('Predicting coach compatibility for userId:', userId);

    // Fetch user's comprehensive profile
    const [userProfileResult, userPatternsResult, userSessionsResult] = await Promise.all([
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
          coaches(*),
          session_outcomes(*)
        `)
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    // Fetch coaches data
    const coachesResult = await supabase
      .from('coaches')
      .select(`
        *,
        sessions(
          id,
          session_outcomes(*)
        )
      `)
      .in('id', coachIds.length > 0 ? coachIds : [])
      .eq('is_active', true);

    if (userProfileResult.error) throw userProfileResult.error;
    if (userPatternsResult.error) throw userPatternsResult.error;
    if (userSessionsResult.error) throw userSessionsResult.error;
    if (coachesResult.error) throw coachesResult.error;

    const analysisData = {
      userProfile: userProfileResult.data,
      userPatterns: userPatternsResult.data,
      userSessionHistory: userSessionsResult.data,
      coaches: coachesResult.data,
      analysisMode
    };

    // AI-powered compatibility analysis
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
            content: `You are an expert in coaching psychology and personality matching. Analyze user-coach compatibility using personality theory, behavioral patterns, and coaching effectiveness research.

            Calculate compatibility scores based on:
            1. Personality complementarity (not just similarity)
            2. Communication style alignment
            3. Learning preference matching
            4. Goal achievement probability
            5. Motivational approach compatibility
            6. Conflict resolution style fit
            7. Growth trajectory alignment

            For each coach, provide detailed compatibility analysis:
            {
              "compatibilityResults": [
                {
                  "coachId": string,
                  "overallScore": number (0-100),
                  "compatibilityFactors": {
                    "personalityMatch": number,
                    "communicationAlignment": number,
                    "learningStyleFit": number,
                    "motivationalCompatibility": number,
                    "goalAchievementPotential": number
                  },
                  "strengths": string[],
                  "potentialChallenges": string[],
                  "successPrediction": {
                    "shortTerm": number,
                    "longTerm": number,
                    "confidence": number
                  },
                  "recommendations": {
                    "sessionStructure": string,
                    "communicationApproach": string,
                    "focusAreas": string[]
                  }
                }
              ],
              "matchingInsights": {
                "bestMatches": string[],
                "riskFactors": string[],
                "optimizationSuggestions": string[]
              },
              "predictiveFactors": {
                "strongestPredictors": string[],
                "uncertaintyAreas": string[],
                "dataQuality": number
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
    const compatibilityData = JSON.parse(result.choices[0].message.content);

    // Store compatibility predictions for future reference
    for (const compatibility of compatibilityData.compatibilityResults) {
      await supabase.rpc('update_behavioral_pattern', {
        p_user_id: userId,
        p_pattern_type: `coach_compatibility_${compatibility.coachId}`,
        p_pattern_data: {
          ...compatibility,
          analysisDate: new Date().toISOString(),
          analysisMode
        },
        p_confidence_score: compatibility.successPrediction.confidence
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        compatibility: compatibilityData,
        analysisMetadata: {
          analysisMode,
          coachesAnalyzed: compatibilityData.compatibilityResults.length,
          dataQuality: compatibilityData.predictiveFactors.dataQuality
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
    console.error('Error predicting coach compatibility:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to predict coach compatibility'
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