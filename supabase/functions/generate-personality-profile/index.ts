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

    const { userId, includeHistoricalData = false } = await req.json();

    console.log('Generating personality profile for userId:', userId);

    // Fetch comprehensive user data
    const [activityResult, responsesResult, sessionsResult, patternsResult] = await Promise.all([
      supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200),
      
      supabase
        .from('user_responses')
        .select('*')
        .eq('user_id', userId),
      
      supabase
        .from('sessions')
        .select(`
          *,
          session_outcomes(*),
          session_recordings(
            sentiment_analysis,
            personality_insights,
            emotional_journey,
            key_topics
          )
        `)
        .eq('client_id', userId)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('user_behavioral_patterns')
        .select('*')
        .eq('user_id', userId)
    ]);

    if (activityResult.error) throw activityResult.error;
    if (responsesResult.error) throw responsesResult.error;
    if (sessionsResult.error) throw sessionsResult.error;
    if (patternsResult.error) throw patternsResult.error;

    const analysisData = {
      activityLogs: activityResult.data,
      responses: responsesResult.data,
      sessions: sessionsResult.data,
      existingPatterns: patternsResult.data,
      analysisDepth: includeHistoricalData ? 'comprehensive' : 'current'
    };

    // Enhanced OpenAI prompt for personality profiling
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
            content: `You are an expert psychologist specializing in personality assessment and coaching psychology. Analyze user data to create a comprehensive personality profile.

            Generate insights across multiple dimensions:
            1. Core personality traits (Big 5 + coaching-specific traits)
            2. Cognitive patterns and learning preferences
            3. Emotional intelligence and regulation patterns
            4. Communication and interpersonal styles
            5. Motivation systems and success drivers
            6. Growth mindset and adaptability indicators
            7. Temporal patterns and behavioral consistency

            Return JSON with this structure:
            {
              "personalityProfile": {
                "bigFive": {
                  "openness": {"score": number, "confidence": number, "evidence": string[]},
                  "conscientiousness": {"score": number, "confidence": number, "evidence": string[]},
                  "extraversion": {"score": number, "confidence": number, "evidence": string[]},
                  "agreeableness": {"score": number, "confidence": number, "evidence": string[]},
                  "neuroticism": {"score": number, "confidence": number, "evidence": string[]}
                },
                "coachingTraits": {
                  "coachability": number,
                  "selfAwareness": number,
                  "goalOrientation": number,
                  "resilience": number,
                  "growthMindset": number
                }
              },
              "cognitiveProfile": {
                "learningStyle": string,
                "processingSpeed": string,
                "informationPreference": string,
                "decisionMakingStyle": string
              },
              "emotionalProfile": {
                "emotionalIntelligence": number,
                "stressManagement": string,
                "motivationalDrivers": string[],
                "emotionalPatterns": string[]
              },
              "communicationProfile": {
                "preferredChannels": string[],
                "directnessLevel": number,
                "feedbackStyle": string,
                "conflictApproach": string
              },
              "behavioralInsights": {
                "consistencyScore": number,
                "adaptabilityScore": number,
                "engagementPatterns": string[],
                "successIndicators": string[]
              },
              "coachingRecommendations": {
                "optimalCoachingStyle": string,
                "sessionStructure": string,
                "communicationApproach": string,
                "motivationalTechniques": string[],
                "potentialChallenges": string[]
              },
              "confidenceMetrics": {
                "dataQuality": number,
                "sampleSize": number,
                "temporalConsistency": number,
                "overallConfidence": number
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
    const profileData = JSON.parse(result.choices[0].message.content);

    // Store comprehensive personality profile
    const patterns = [
      {
        pattern_type: 'personality_profile_v2',
        pattern_data: profileData.personalityProfile,
        confidence_score: profileData.confidenceMetrics.overallConfidence
      },
      {
        pattern_type: 'cognitive_profile',
        pattern_data: profileData.cognitiveProfile,
        confidence_score: profileData.confidenceMetrics.dataQuality
      },
      {
        pattern_type: 'emotional_profile',
        pattern_data: profileData.emotionalProfile,
        confidence_score: profileData.confidenceMetrics.temporalConsistency
      },
      {
        pattern_type: 'communication_profile',
        pattern_data: profileData.communicationProfile,
        confidence_score: 0.85
      }
    ];

    // Update patterns in database
    for (const pattern of patterns) {
      await supabase.rpc('update_behavioral_pattern', {
        p_user_id: userId,
        p_pattern_type: pattern.pattern_type,
        p_pattern_data: pattern.pattern_data,
        p_confidence_score: pattern.confidence_score
      });
    }

    // Update user profile with enhanced data
    await supabase
      .from('profiles')
      .update({
        personality_traits: profileData.personalityProfile.bigFive,
        communication_style: profileData.communicationProfile,
        engagement_patterns: profileData.behavioralInsights,
        learning_preferences: profileData.cognitiveProfile,
        success_patterns: profileData.coachingRecommendations,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({
        success: true,
        profile: profileData,
        confidence: profileData.confidenceMetrics,
        patternsStored: patterns.length
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating personality profile:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to generate personality profile'
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