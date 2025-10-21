import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp',
};

interface DailyWebhookEvent {
  type: string;
  data: any;
  timestamp: string;
}

interface MeetingEvent {
  type: 'meeting.started' | 'meeting.ended';
  data: {
    room_name: string;
    room_url: string;
    room_id: string;
    meeting_id: string;
    started_at?: string;
    ended_at?: string;
    duration?: number;
  };
}

interface ParticipantEvent {
  type: 'participant.joined' | 'participant.left';
  data: {
    room_name: string;
    room_url: string;
    participant: {
      user_id: string;
      user_name?: string;
      user_data?: any;
      joined_at?: string;
      left_at?: string;
    };
  };
}

interface RecordingEvent {
  type: 'recording.started' | 'recording.ready-to-download' | 'recording.error';
  data: {
    room_name: string;
    recording_id: string;
    started_at?: string;
    ready_at?: string;
    error?: string;
    download_url?: string;
  };
}

interface TranscriptionEvent {
  type: 'transcript.started' | 'transcript.ready-to-download' | 'transcript.error';
  data: {
    room_name: string;
    transcript_id: string;
    started_at?: string;
    ready_at?: string;
    error?: string;
    download_url?: string;
  };
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

    // Get the request body
    const body = await req.text();
    
    // Verify webhook signature if secret is configured
    if (dailyWebhookSecret) {
      const signature = req.headers.get('x-webhook-signature');
      const timestamp = req.headers.get('x-webhook-timestamp');
      
      if (!signature || !timestamp) {
        console.error('Missing Daily webhook signature or timestamp');
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      // Verify timestamp (should be within 5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      const eventTime = parseInt(timestamp);
      if (Math.abs(currentTime - eventTime) > 300) {
        console.error('Webhook timestamp too old');
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      // Verify signature
      const expectedSignature = createHmac('sha256', dailyWebhookSecret)
        .update(timestamp + body)
        .digest('hex');
      
      const providedSignature = signature.replace('sha256=', '');
      
      if (expectedSignature !== providedSignature) {
        console.error('Invalid webhook signature');
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }
    }

    // Parse the webhook event
    const event: DailyWebhookEvent = JSON.parse(body);
    console.log('Received Daily.co webhook:', event.type, event.data);

    // Handle different event types
    switch (event.type) {
      case 'meeting.started':
        await handleMeetingStarted(event as MeetingEvent, supabase);
        break;
      case 'meeting.ended':
        await handleMeetingEnded(event as MeetingEvent, supabase);
        break;
      case 'participant.joined':
        await handleParticipantJoined(event as ParticipantEvent, supabase);
        break;
      case 'participant.left':
        await handleParticipantLeft(event as ParticipantEvent, supabase);
        break;
      case 'recording.started':
        await handleRecordingStarted(event as RecordingEvent, supabase);
        break;
      case 'recording.ready-to-download':
        await handleRecordingReady(event as RecordingEvent, supabase);
        break;
      case 'recording.error':
        await handleRecordingError(event as RecordingEvent, supabase);
        break;
      case 'transcript.started':
        await handleTranscriptionStarted(event as TranscriptionEvent, supabase);
        break;
      case 'transcript.ready-to-download':
        await handleTranscriptionReady(event as TranscriptionEvent, supabase);
        break;
      case 'transcript.error':
        await handleTranscriptionError(event as TranscriptionEvent, supabase);
        break;
      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return new Response('OK', { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Internal Server Error', { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });
  }
});

async function handleMeetingStarted(event: MeetingEvent, supabase: any) {
  const { room_name, room_url, meeting_id, started_at } = event.data;
  
  console.log('Meeting started:', { room_name, meeting_id, started_at });

  // Find the session by room name or URL
  const { data: sessions, error } = await supabase
    .from('session_video_details')
    .select('session_id')
    .eq('video_room_id', room_name)
    .or(`video_join_url.eq.${room_url}`)
    .limit(1);

  if (error || !sessions || sessions.length === 0) {
    console.error('Could not find session for room:', room_name);
    return;
  }

  const sessionId = sessions[0].session_id;

  // Update session state
  await supabase
    .from('sessions')
    .update({
      status: 'in_progress',
      actual_start_time: started_at || new Date().toISOString(),
      session_state: 'in_progress',
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  // Log meeting start
  await supabase
    .from('session_events')
    .insert({
      session_id: sessionId,
      event_type: 'meeting_started',
      event_data: {
        room_name,
        room_url,
        meeting_id,
        started_at
      },
      created_at: new Date().toISOString()
    });

  console.log('Meeting start logged for session:', sessionId);
}

async function handleMeetingEnded(event: MeetingEvent, supabase: any) {
  const { room_name, room_url, meeting_id, ended_at, duration } = event.data;
  
  console.log('Meeting ended:', { room_name, meeting_id, ended_at, duration });

  // Find the session
  const { data: sessions, error } = await supabase
    .from('session_video_details')
    .select('session_id')
    .eq('video_room_id', room_name)
    .or(`video_join_url.eq.${room_url}`)
    .limit(1);

  if (error || !sessions || sessions.length === 0) {
    console.error('Could not find session for room:', room_name);
    return;
  }

  const sessionId = sessions[0].session_id;

  // Update session state
  await supabase
    .from('sessions')
    .update({
      status: 'completed',
      actual_end_time: ended_at || new Date().toISOString(),
      session_state: 'completed',
      duration_minutes: duration ? Math.round(duration / 60) : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  // Log meeting end
  await supabase
    .from('session_events')
    .insert({
      session_id: sessionId,
      event_type: 'meeting_ended',
      event_data: {
        room_name,
        room_url,
        meeting_id,
        ended_at,
        duration
      },
      created_at: new Date().toISOString()
    });

  console.log('Meeting end logged for session:', sessionId);
}

async function handleParticipantJoined(event: ParticipantEvent, supabase: any) {
  const { room_name, participant } = event.data;
  
  console.log('Participant joined:', { room_name, participant_id: participant.user_id });

  // Find the session
  const { data: sessions, error } = await supabase
    .from('session_video_details')
    .select('session_id')
    .eq('video_room_id', room_name)
    .limit(1);

  if (error || !sessions || sessions.length === 0) {
    console.error('Could not find session for room:', room_name);
    return;
  }

  const sessionId = sessions[0].session_id;

  // Log participant joined
  await supabase
    .from('session_events')
    .insert({
      session_id: sessionId,
      event_type: 'participant_joined',
      event_data: {
        room_name,
        participant: participant
      },
      created_at: new Date().toISOString()
    });

  console.log('Participant joined logged for session:', sessionId);
}

async function handleParticipantLeft(event: ParticipantEvent, supabase: any) {
  const { room_name, participant } = event.data;
  
  console.log('Participant left:', { room_name, participant_id: participant.user_id });

  // Find the session
  const { data: sessions, error } = await supabase
    .from('session_video_details')
    .select('session_id')
    .eq('video_room_id', room_name)
    .limit(1);

  if (error || !sessions || sessions.length === 0) {
    console.error('Could not find session for room:', room_name);
    return;
  }

  const sessionId = sessions[0].session_id;

  // Log participant left
  await supabase
    .from('session_events')
    .insert({
      session_id: sessionId,
      event_type: 'participant_left',
      event_data: {
        room_name,
        participant: participant
      },
      created_at: new Date().toISOString()
    });

  console.log('Participant left logged for session:', sessionId);
}

async function handleRecordingStarted(event: RecordingEvent, supabase: any) {
  const { room_name, recording_id } = event.data;
  
  console.log('Recording started:', { room_name, recording_id });

  // Find the session
  const { data: sessions, error } = await supabase
    .from('session_video_details')
    .select('session_id')
    .eq('video_room_id', room_name)
    .limit(1);

  if (error || !sessions || sessions.length === 0) {
    console.error('Could not find session for room:', room_name);
    return;
  }

  const sessionId = sessions[0].session_id;

  // Update recording status
  await supabase
    .from('session_recordings')
    .upsert({
      session_id: sessionId,
      recording_id: recording_id,
      recording_status: 'active',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'session_id'
    });

  console.log('Recording started logged for session:', sessionId);
}

async function handleRecordingReady(event: RecordingEvent, supabase: any) {
  const { room_name, recording_id, download_url } = event.data;
  
  console.log('Recording ready:', { room_name, recording_id });

  // Find the session
  const { data: sessions, error } = await supabase
    .from('session_video_details')
    .select('session_id')
    .eq('video_room_id', room_name)
    .limit(1);

  if (error || !sessions || sessions.length === 0) {
    console.error('Could not find session for room:', room_name);
    return;
  }

  const sessionId = sessions[0].session_id;

  // Update recording status
  await supabase
    .from('session_recordings')
    .upsert({
      session_id: sessionId,
      recording_id: recording_id,
      recording_status: 'ready',
      recording_url: download_url,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'session_id'
    });

  console.log('Recording ready logged for session:', sessionId);
}

async function handleRecordingError(event: RecordingEvent, supabase: any) {
  const { room_name, recording_id, error } = event.data;
  
  console.log('Recording error:', { room_name, recording_id, error });

  // Find the session
  const { data: sessions, error: sessionError } = await supabase
    .from('session_video_details')
    .select('session_id')
    .eq('video_room_id', room_name)
    .limit(1);

  if (sessionError || !sessions || sessions.length === 0) {
    console.error('Could not find session for room:', room_name);
    return;
  }

  const sessionId = sessions[0].session_id;

  // Update recording status
  await supabase
    .from('session_recordings')
    .upsert({
      session_id: sessionId,
      recording_id: recording_id,
      recording_status: 'error',
      error_message: error,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'session_id'
    });

  console.log('Recording error logged for session:', sessionId);
}

async function handleTranscriptionStarted(event: TranscriptionEvent, supabase: any) {
  const { room_name, transcript_id } = event.data;
  
  console.log('Transcription started:', { room_name, transcript_id });

  // Find the session
  const { data: sessions, error } = await supabase
    .from('session_video_details')
    .select('session_id')
    .eq('video_room_id', room_name)
    .limit(1);

  if (error || !sessions || sessions.length === 0) {
    console.error('Could not find session for room:', room_name);
    return;
  }

  const sessionId = sessions[0].session_id;

  // Update transcription status
  await supabase
    .from('session_recordings')
    .upsert({
      session_id: sessionId,
      transcription_id: transcript_id,
      transcription_status: 'active',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'session_id'
    });

  console.log('Transcription started logged for session:', sessionId);
}

async function handleTranscriptionReady(event: TranscriptionEvent, supabase: any) {
  const { room_name, transcript_id, download_url } = event.data;
  
  console.log('Transcription ready:', { room_name, transcript_id });

  // Find the session
  const { data: sessions, error } = await supabase
    .from('session_video_details')
    .select('session_id')
    .eq('video_room_id', room_name)
    .limit(1);

  if (error || !sessions || sessions.length === 0) {
    console.error('Could not find session for room:', room_name);
    return;
  }

  const sessionId = sessions[0].session_id;

  // Update transcription status
  await supabase
    .from('session_recordings')
    .upsert({
      session_id: sessionId,
      transcription_id: transcript_id,
      transcription_status: 'ready',
      transcription_url: download_url,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'session_id'
    });

  console.log('Transcription ready logged for session:', sessionId);
}

async function handleTranscriptionError(event: TranscriptionEvent, supabase: any) {
  const { room_name, transcript_id, error } = event.data;
  
  console.log('Transcription error:', { room_name, transcript_id, error });

  // Find the session
  const { data: sessions, error: sessionError } = await supabase
    .from('session_video_details')
    .select('session_id')
    .eq('video_room_id', room_name)
    .limit(1);

  if (sessionError || !sessions || sessions.length === 0) {
    console.error('Could not find session for room:', room_name);
    return;
  }

  const sessionId = sessions[0].session_id;

  // Update transcription status
  await supabase
    .from('session_recordings')
    .upsert({
      session_id: sessionId,
      transcription_id: transcript_id,
      transcription_status: 'error',
      error_message: error,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'session_id'
    });

  console.log('Transcription error logged for session:', sessionId);
}
