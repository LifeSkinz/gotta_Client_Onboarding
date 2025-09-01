import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const { sessionId, userId, coachId, feedback, fullTranscript, isComplete = false } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Analyzing session outcome:', {
      sessionId,
      hasUserId: !!userId,
      hasCoachId: !!coachId,
      hasFeedback: !!feedback,
      hasTranscript: !!fullTranscript,
      isComplete
    });

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw new Error(`Session not found: ${sessionError.message}`);
    }

    // Get existing session recording and insights
    const [recordingResponse, insightsResponse] = await Promise.all([
      supabase.from('session_recordings').select('*').eq('session_id', sessionId).single(),
      supabase.from('session_insights').select('*').eq('session_id', sessionId)
    ]);

    const recording = recordingResponse.data;
    const existingInsights = insightsResponse.data || [];

    // Prepare analysis data
    const analysisContext = {
      session: session,
      transcript: fullTranscript || recording?.transcript,
      feedback: feedback,
      recording_data: recording,
      existing_insights: existingInsights,
      completion_status: isComplete ? 'complete' : 'partial'
    };

    // Generate comprehensive outcome analysis using AI
    let outcomeAnalysis = {};
    
    if (analysisContext.transcript || feedback) {
      try {
        const prompt = `You are an expert coaching session analyst. Analyze this session outcome and provide detailed insights.

Context:
- Session Duration: ${session.duration_minutes || 'Unknown'} minutes
- Session Status: ${session.status}
- Has Transcript: ${!!analysisContext.transcript}
- Has User Feedback: ${!!feedback}
- Analysis Type: ${isComplete ? 'Final Analysis' : 'Interim Analysis'}

${analysisContext.transcript ? `Transcript:\n${analysisContext.transcript}\n` : ''}

${feedback ? `User Feedback:
- Session Satisfaction: ${feedback.sessionSatisfaction}/10
- Goal Achievement: ${feedback.goalAchievement}/10  
- Coach Effectiveness: ${feedback.coachEffectiveness}/10
- Platform Experience: ${feedback.platformEase}
- Feeling After Session: ${feedback.feelingAfter}
- Notes: ${feedback.notes || 'None'}
- Breakthroughs: ${feedback.breakthroughs || 'None'}
- Challenges: ${feedback.challenges || 'None'}
` : ''}

Provide a comprehensive JSON analysis with:
- overall_assessment: Summary of session effectiveness
- client_progress: Observable progress indicators
- coaching_quality: Assessment of coaching delivery
- engagement_metrics: Client participation analysis
- emotional_intelligence: Emotional dynamics observed
- goal_alignment: How well session aligned with objectives
- follow_up_recommendations: Specific next steps
- risk_factors: Any concerns or areas needing attention
- success_indicators: Positive outcomes achieved
- personalized_insights: Tailored recommendations for this client
- session_effectiveness_score: Overall effectiveness (1-10)
- confidence_score: Analysis confidence level (0-1)`;

        const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert coaching session analyst. Provide detailed, actionable insights in valid JSON format.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
          }),
        });

        if (analysisResponse.ok) {
          const analysisResult = await analysisResponse.json();
          const analysisText = analysisResult.choices?.[0]?.message?.content;
          
          try {
            outcomeAnalysis = JSON.parse(analysisText);
          } catch (parseError) {
            console.error('Failed to parse outcome analysis:', parseError);
            outcomeAnalysis = { 
              error: 'Failed to parse analysis',
              raw_response: analysisText,
              fallback_summary: 'Session completed with user feedback provided'
            };
          }
        }
      } catch (error) {
        console.error('AI outcome analysis error:', error);
        outcomeAnalysis = { 
          error: error.message,
          fallback_summary: 'Analysis unavailable due to technical error'
        };
      }
    }

    // Store outcome analysis insights
    if (Object.keys(outcomeAnalysis).length > 0) {
      const { error: insightsError } = await supabase
        .from('session_insights')
        .insert({
          session_id: sessionId,
          insight_type: isComplete ? 'final_outcome_analysis' : 'interim_outcome_analysis',
          insight_data: {
            ...outcomeAnalysis,
            analysis_metadata: {
              has_transcript: !!analysisContext.transcript,
              has_feedback: !!feedback,
              feedback_scores: feedback ? {
                satisfaction: feedback.sessionSatisfaction,
                goal_achievement: feedback.goalAchievement,
                coach_effectiveness: feedback.coachEffectiveness
              } : null,
              analysis_timestamp: new Date().toISOString(),
              completion_status: isComplete ? 'complete' : 'partial'
            }
          },
          confidence_score: outcomeAnalysis.confidence_score || 0.8,
          ai_model_version: 'gpt-4o-mini'
        });

      if (insightsError) {
        console.error('Failed to store outcome insights:', insightsError);
      }
    }

    // If feedback provided and this is complete analysis, update behavioral patterns
    if (feedback && isComplete && (userId || session.client_id)) {
      try {
        const clientId = userId || session.client_id;
        
        // Update behavioral patterns based on session outcome
        await supabase.rpc('update_behavioral_pattern', {
          p_user_id: clientId,
          p_pattern_type: 'session_satisfaction',
          p_pattern_data: {
            satisfaction_score: feedback.sessionSatisfaction,
            goal_achievement: feedback.goalAchievement,
            coach_effectiveness: feedback.coachEffectiveness,
            platform_ease: feedback.platformEase,
            emotional_state: feedback.feelingAfter,
            session_date: session.scheduled_time,
            coach_id: coachId || session.coach_id
          },
          p_confidence_score: 0.9
        });

        // If low satisfaction, create attention pattern
        if (feedback.sessionSatisfaction < 7 || feedback.goalAchievement < 7) {
          await supabase.rpc('update_behavioral_pattern', {
            p_user_id: clientId,
            p_pattern_type: 'needs_attention',
            p_pattern_data: {
              reason: 'low_session_satisfaction',
              satisfaction_score: feedback.sessionSatisfaction,
              goal_achievement: feedback.goalAchievement,
              challenges: feedback.challenges,
              session_id: sessionId,
              requires_follow_up: true
            },
            p_confidence_score: 0.95
          });
        }

      } catch (error) {
        console.error('Failed to update behavioral patterns:', error);
      }
    }

    console.log('Session outcome analysis completed:', {
      sessionId,
      analysisType: isComplete ? 'final' : 'interim',
      hasOutcomeAnalysis: Object.keys(outcomeAnalysis).length > 0,
      effectivenessScore: outcomeAnalysis.session_effectiveness_score
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: outcomeAnalysis,
        analysis_type: isComplete ? 'final' : 'interim',
        message: 'Session outcome analyzed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-session-outcome:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});