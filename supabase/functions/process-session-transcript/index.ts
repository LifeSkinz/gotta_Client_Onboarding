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
    const { sessionId, audioChunk, timestamp, isComplete = false } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let transcriptText = '';

    // Process audio chunk with OpenAI Whisper if audio data provided
    if (audioChunk) {
      console.log('Processing audio chunk for session:', sessionId);

      // Convert base64 audio to binary
      const binaryAudio = atob(audioChunk);
      const audioBuffer = new Uint8Array(binaryAudio.length);
      for (let i = 0; i < binaryAudio.length; i++) {
        audioBuffer[i] = binaryAudio.charCodeAt(i);
      }

      // Prepare form data for Whisper API
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/webm' });
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'verbose_json');

      // Call OpenAI Whisper API
      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
        },
        body: formData,
      });

      if (!whisperResponse.ok) {
        throw new Error(`Whisper API error: ${await whisperResponse.text()}`);
      }

      const whisperResult = await whisperResponse.json();
      transcriptText = whisperResult.text || '';

      console.log('Transcription result:', {
        sessionId,
        textLength: transcriptText.length,
        timestamp
      });
    }

    // Get current recording
    const { data: recording, error: recordingError } = await supabase
      .from('session_recordings')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (recordingError) {
      throw new Error(`Recording not found: ${recordingError.message}`);
    }

    // Update transcript
    const currentTranscript = recording.transcript || '';
    const updatedTranscript = transcriptText 
      ? `${currentTranscript}\n[${timestamp}] ${transcriptText}`.trim()
      : currentTranscript;

    // Perform real-time sentiment analysis on new text
    let sentimentUpdate = {};
    if (transcriptText && transcriptText.length > 10) {
      try {
        const sentimentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                content: 'Analyze the sentiment and emotional tone of this coaching session transcript segment. Return a JSON object with sentiment (positive/neutral/negative), emotional_intensity (0-1), key_emotions (array), and confidence (0-1).'
              },
              {
                role: 'user',
                content: transcriptText
              }
            ],
            temperature: 0.3,
          }),
        });

        if (sentimentResponse.ok) {
          const sentimentResult = await sentimentResponse.json();
          const sentimentText = sentimentResult.choices?.[0]?.message?.content;
          
          try {
            sentimentUpdate = JSON.parse(sentimentText);
          } catch (parseError) {
            console.error('Failed to parse sentiment analysis:', parseError);
          }
        }
      } catch (error) {
        console.error('Sentiment analysis error:', error);
      }
    }

    // Update recording with new transcript and sentiment data
    const { error: updateError } = await supabase
      .from('session_recordings')
      .update({
        transcript: updatedTranscript,
        sentiment_analysis: {
          ...recording.sentiment_analysis,
          latest_segment: sentimentUpdate,
          updated_at: timestamp
        },
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    if (updateError) {
      throw new Error(`Failed to update transcript: ${updateError.message}`);
    }

    // If session is complete, trigger comprehensive analysis
    if (isComplete) {
      console.log('Session complete, triggering comprehensive analysis for:', sessionId);
      
      // Trigger background analysis
      await supabase.functions.invoke('analyze-session-outcome', {
        body: {
          sessionId,
          fullTranscript: updatedTranscript,
          isComplete: true
        }
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        transcriptLength: updatedTranscript.length,
        sentimentUpdate,
        message: 'Transcript processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-session-transcript:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});