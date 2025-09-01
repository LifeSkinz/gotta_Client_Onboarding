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
    const { sessionId, endTime, clientNotes, coachNotes, goals } = await req.json();

    if (!sessionId || !endTime) {
      throw new Error('Session ID and end time are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session and recording data
    const [sessionResponse, recordingResponse] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
      supabase.from('session_recordings').select('*').eq('session_id', sessionId).single()
    ]);

    if (sessionResponse.error) {
      throw new Error(`Session not found: ${sessionResponse.error.message}`);
    }

    const session = sessionResponse.data;
    const recording = recordingResponse.data;

    // Calculate final duration
    const startTime = new Date(session.actual_start_time || session.scheduled_time);
    const finalEndTime = new Date(endTime);
    const durationSeconds = Math.floor((finalEndTime.getTime() - startTime.getTime()) / 1000);

    console.log('Finalizing session recording:', {
      sessionId,
      durationSeconds,
      hasTranscript: !!recording?.transcript,
      hasNotes: !!(clientNotes || coachNotes)
    });

    // Generate comprehensive AI analysis
    let aiAnalysis = {};
    let keyTopics: string[] = [];
    let personalityInsights = {};

    if (recording?.transcript && recording.transcript.length > 50) {
      try {
        const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert coaching session analyst. Analyze this coaching session transcript and provide comprehensive insights.

Return a JSON object with:
- summary: Brief session summary (2-3 sentences)
- key_topics: Array of main discussion topics
- progress_indicators: Areas where client showed growth
- areas_for_improvement: Areas needing attention
- coach_effectiveness: Analysis of coaching techniques used
- client_engagement: Assessment of client participation
- emotional_journey: How client's emotions evolved
- action_items: Suggested next steps
- personality_insights: Client personality traits observed
- communication_patterns: Notable communication styles
- breakthrough_moments: Key insights or realizations
- session_quality_score: Overall session quality (1-10)`
              },
              {
                role: 'user',
                content: `
Session Transcript:
${recording.transcript}

Client Notes:
${clientNotes || 'No client notes provided'}

Coach Notes:
${coachNotes || 'No coach notes provided'}

Session Goals:
${goals ? JSON.stringify(goals) : 'No specific goals recorded'}
                `
              }
            ],
            temperature: 0.3,
          }),
        });

        if (analysisResponse.ok) {
          const analysisResult = await analysisResponse.json();
          const analysisText = analysisResult.choices?.[0]?.message?.content;
          
          try {
            aiAnalysis = JSON.parse(analysisText);
            keyTopics = aiAnalysis.key_topics || [];
            personalityInsights = aiAnalysis.personality_insights || {};
          } catch (parseError) {
            console.error('Failed to parse AI analysis:', parseError);
            aiAnalysis = { error: 'Failed to parse analysis', raw: analysisText };
          }
        }
      } catch (error) {
        console.error('AI analysis error:', error);
        aiAnalysis = { error: error.message };
      }
    }

    // Update session recording with final data
    const { error: recordingUpdateError } = await supabase
      .from('session_recordings')
      .update({
        ended_at: endTime,
        duration_seconds: durationSeconds,
        ai_summary: aiAnalysis.summary || 'Session completed successfully',
        key_topics: keyTopics,
        personality_insights: personalityInsights,
        emotional_journey: aiAnalysis.emotional_journey || [],
        coaching_effectiveness_score: aiAnalysis.session_quality_score || null,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    if (recordingUpdateError) {
      console.error('Failed to update recording:', recordingUpdateError);
    }

    // Store comprehensive session insights
    const { error: insightsError } = await supabase
      .from('session_insights')
      .insert({
        session_id: sessionId,
        insight_type: 'comprehensive_analysis',
        insight_data: {
          ...aiAnalysis,
          session_metadata: {
            duration_seconds: durationSeconds,
            client_notes: clientNotes,
            coach_notes: coachNotes,
            goals_count: goals?.length || 0,
            transcript_length: recording?.transcript?.length || 0
          }
        },
        confidence_score: 0.85,
        ai_model_version: 'gpt-4o-mini'
      });

    if (insightsError) {
      console.error('Failed to store insights:', insightsError);
    }

    // Trigger behavioral pattern analysis
    try {
      await supabase.functions.invoke('analyze-user-behavior', {
        body: {
          userId: session.client_id,
          sessionId: sessionId,
          sessionData: {
            transcript: recording?.transcript,
            duration: durationSeconds,
            insights: aiAnalysis,
            goals: goals
          }
        }
      });
    } catch (error) {
      console.error('Failed to trigger behavior analysis:', error);
    }

    console.log('Session recording finalized successfully:', {
      sessionId,
      durationSeconds,
      analysisKeys: Object.keys(aiAnalysis),
      topicsCount: keyTopics.length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        durationSeconds,
        aiAnalysis,
        keyTopics,
        message: 'Session recording finalized and analyzed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in finalize-session-recording:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});