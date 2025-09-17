import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-daily-signature',
};

interface TranscriptionEvent {
  type: 'transcription.completed';
  data: {
    session_id: string;
    recording_id: string;
    transcript_url: string;
    duration_seconds: number;
    created_at: string;
  };
}

interface PausedSegment {
  start: number;
  end: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dailyWebhookSecret = Deno.env.get('DAILY_WEBHOOK_SECRET');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook signature if secret is configured
    if (dailyWebhookSecret) {
      const signature = req.headers.get('x-daily-signature');
      const body = await req.text();
      
      if (!signature) {
        console.error('Missing Daily webhook signature');
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      const expectedSignature = createHmac('sha256', dailyWebhookSecret).update(body).digest('hex');
      const providedSignature = signature.replace('sha256=', '');
      
      if (expectedSignature !== providedSignature) {
        console.error('Invalid Daily webhook signature');
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      var event: TranscriptionEvent = JSON.parse(body);
    } else {
      var event: TranscriptionEvent = await req.json();
    }

    console.log('Received transcription webhook:', event.type);

    if (event.type !== 'transcription.completed') {
      console.log('Ignoring non-transcription event:', event.type);
      return new Response('OK', { headers: corsHeaders });
    }

    const { session_id, recording_id, transcript_url, duration_seconds } = event.data;

    // Check for existing processing (idempotency)
    const { data: existingRecording } = await supabase
      .from('session_recordings')
      .select('id, transcription_status')
      .eq('session_id', session_id)
      .eq('recording_url', transcript_url)
      .maybeSingle();

    if (existingRecording?.transcription_status === 'completed') {
      console.log('Transcript already processed for session:', session_id);
      return new Response('Already processed', { headers: corsHeaders });
    }

    // Download transcript from Daily.co
    console.log('Downloading transcript from:', transcript_url);
    const transcriptResponse = await fetch(transcript_url);
    
    if (!transcriptResponse.ok) {
      throw new Error(`Failed to download transcript: ${transcriptResponse.status}`);
    }

    const transcriptData = await transcriptResponse.text();

    // Get session recording with privacy settings
    const { data: sessionRecording, error: recordingError } = await supabase
      .from('session_recordings')
      .select('id, transcription_paused_segments, privacy_settings')
      .eq('session_id', session_id)
      .maybeSingle();

    if (recordingError) {
      console.error('Error fetching session recording:', recordingError);
      throw recordingError;
    }

    let processedTranscript = transcriptData;
    
    // Apply privacy redaction if paused segments exist
    if (sessionRecording?.transcription_paused_segments) {
      const pausedSegments = sessionRecording.transcription_paused_segments as PausedSegment[];
      const privacySettings = sessionRecording.privacy_settings || {};
      
      if (pausedSegments.length > 0 && privacySettings.auto_redact_pauses) {
        console.log('Applying privacy redaction to transcript');
        processedTranscript = await redactPausedSegments(transcriptData, pausedSegments, privacySettings);
      }
    }

    // Update or create session recording
    const recordingData = {
      session_id,
      recording_url: transcript_url,
      transcript: processedTranscript,
      duration_seconds,
      transcription_status: 'completed',
      updated_at: new Date().toISOString(),
    };

    if (sessionRecording?.id) {
      // Update existing recording
      const { error: updateError } = await supabase
        .from('session_recordings')
        .update(recordingData)
        .eq('id', sessionRecording.id);

      if (updateError) {
        console.error('Error updating session recording:', updateError);
        throw updateError;
      }
    } else {
      // Create new recording
      const { error: insertError } = await supabase
        .from('session_recordings')
        .insert(recordingData);

      if (insertError) {
        console.error('Error creating session recording:', insertError);
        throw insertError;
      }
    }

    console.log('Successfully processed transcript for session:', session_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Transcript processed successfully',
        session_id,
        redacted_segments: sessionRecording?.transcription_paused_segments?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing transcription webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function redactPausedSegments(
  transcript: string, 
  pausedSegments: PausedSegment[], 
  privacySettings: any
): Promise<string> {
  try {
    // Parse transcript (assuming VTT or similar format)
    const lines = transcript.split('\n');
    const redactionMethod = privacySettings.redaction_method || 'silence';
    
    let processedLines = [];
    
    for (const line of lines) {
      // Look for timestamp lines (e.g., "00:01:30.000 --> 00:01:35.000")
      const timestampMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      
      if (timestampMatch) {
        const startTime = parseTimestamp(timestampMatch[1]);
        const endTime = parseTimestamp(timestampMatch[2]);
        
        // Check if this segment overlaps with any paused segments
        const isInPausedSegment = pausedSegments.some(segment => 
          (startTime >= segment.start && startTime <= segment.end) ||
          (endTime >= segment.start && endTime <= segment.end) ||
          (startTime <= segment.start && endTime >= segment.end)
        );
        
        if (isInPausedSegment) {
          processedLines.push(line); // Keep timestamp
          // Add redacted content based on method
          if (redactionMethod === 'silence') {
            processedLines.push('[REDACTED - Transcription was paused]');
          } else {
            processedLines.push('[CONTENT REMOVED FOR PRIVACY]');
          }
        } else {
          processedLines.push(line);
        }
      } else {
        // Non-timestamp line, keep as-is unless we're in a redaction context
        processedLines.push(line);
      }
    }
    
    return processedLines.join('\n');
  } catch (error) {
    console.error('Error applying redaction:', error);
    // Return original transcript if redaction fails
    return transcript;
  }
}

function parseTimestamp(timestamp: string): number {
  const [time, milliseconds] = timestamp.split('.');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(milliseconds) / 1000;
}
