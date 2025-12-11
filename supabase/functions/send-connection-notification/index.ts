import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CONFIG } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Direct Resend API helper
async function sendViaResend(payload: {
  from: string;
  to: string[];
  subject: string;
  html: string;
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

// Generate simple, direct email with video link (Google Meet style)
function generateSimpleEmailTemplate(context: any) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Coaching Session</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; 
      line-height: 1.6; 
      background: #f5f5f5;
      padding: 20px;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .header { 
      background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 { 
      color: white; 
      font-size: 28px; 
      font-weight: 700; 
      margin-bottom: 8px;
    }
    .header p { 
      color: rgba(255,255,255,0.9); 
      font-size: 16px;
    }
    .content { 
      padding: 40px 30px;
    }
    .client-info {
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .client-info h3 {
      color: #374151;
      margin-bottom: 16px;
      font-size: 18px;
    }
    .detail-row { 
      display: flex;
      margin-bottom: 12px;
    }
    .detail-label { 
      font-weight: 600;
      color: #6b7280;
      min-width: 80px;
    }
    .detail-value { 
      color: #111827;
    }
    .join-section {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 16px;
      padding: 32px;
      margin: 32px 0;
      text-align: center;
    }
    .join-section h2 {
      color: white;
      font-size: 22px;
      margin-bottom: 16px;
    }
    .join-section p {
      color: rgba(255,255,255,0.9);
      margin-bottom: 24px;
    }
    .join-btn { 
      display: inline-block;
      padding: 18px 48px;
      background: white;
      color: #059669;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 18px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }
    .join-btn:hover {
      transform: translateY(-2px);
    }
    .url-fallback {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 16px;
      margin-top: 24px;
      word-break: break-all;
    }
    .url-fallback p {
      color: #166534;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .url-fallback code {
      color: #15803d;
      font-size: 11px;
    }
    .tips {
      background: #eff6ff;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }
    .tips h4 {
      color: #1e40af;
      margin-bottom: 12px;
    }
    .tips ul {
      margin-left: 20px;
      color: #3b82f6;
    }
    .footer { 
      background: #f9fafb;
      padding: 24px 30px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    @media (max-width: 600px) {
      .join-btn { 
        padding: 16px 32px;
        font-size: 16px;
        display: block;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎥 New Coaching Session</h1>
      <p>A client is ready to connect with you!</p>
    </div>
    
    <div class="content">
      <div class="client-info">
        <h3>👤 Client Details</h3>
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${context.clientName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Goal:</span>
          <span class="detail-value">${context.goalTitle}</span>
        </div>
        ${context.clientBio ? `
        <div class="detail-row">
          <span class="detail-label">About:</span>
          <span class="detail-value">${context.clientBio}</span>
        </div>
        ` : ''}
      </div>

      <div class="join-section">
        <h2>🚀 Join the Session</h2>
        <p>Click the button below to start your video session. No login required!</p>
        <a href="${context.videoJoinUrl}" class="join-btn">Join Video Call</a>
        
        <div class="url-fallback">
          <p>Or copy this link:</p>
          <code>${context.videoJoinUrl}</code>
        </div>
      </div>

      <div class="tips">
        <h4>💡 Quick Tips</h4>
        <ul>
          <li>Join from a quiet, well-lit space</li>
          <li>Test your audio/video before the client joins</li>
          <li>The session will auto-record for your notes</li>
        </ul>
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated notification from your coaching platform.</p>
      <p>The video link works like Google Meet - just click and join!</p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, coachId, clientId, userGoal, clientBio, type, videoJoinUrl } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    console.log('Processing coach notification for session:', sessionId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session details with coach info
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        coach:coaches!fk_sessions_coach(*)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw new Error(`Failed to fetch session: ${sessionError.message}`);
    }

    // Get video URL if not passed directly
    let finalVideoUrl = videoJoinUrl;
    if (!finalVideoUrl) {
      const { data: videoDetails } = await supabase
        .from('session_video_details')
        .select('video_join_url')
        .eq('session_id', sessionId)
        .single();
      finalVideoUrl = videoDetails?.video_join_url;
    }

    if (!finalVideoUrl) {
      throw new Error('Video URL not available for this session');
    }

    // Get client profile
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', clientId)
      .single();

    const clientName = clientProfile?.full_name || 'A client';
    const clientBioData = clientBio || clientProfile?.bio || '';
    const goalTitle = userGoal || 'their coaching goals';
    
    const coachEmail = sessionData.coach.notification_email;
    const coachPhone = sessionData.coach.notification_phone;
    
    if (!coachEmail) {
      console.error('No coach email configured');
      throw new Error('Coach email not configured');
    }

    console.log('Sending email to coach:', coachEmail);
    
    // Generate simple email with direct video link
    const emailContext = {
      coachName: sessionData.coach.name,
      clientName,
      clientBio: clientBioData,
      goalTitle,
      videoJoinUrl: finalVideoUrl,
      isInstant: type === 'instant'
    };

    const emailHtml = generateSimpleEmailTemplate(emailContext);
    const emailSubject = `🎥 New Session: ${clientName} wants to connect`;

    try {
      const emailResponse = await sendViaResend({
        from: 'Coaching Platform <onboarding@resend.dev>',
        to: [coachEmail],
        subject: emailSubject,
        html: emailHtml,
      });

      console.log('Email sent successfully to:', coachEmail, emailResponse);

      // WhatsApp notification placeholder
      if (coachPhone) {
        const whatsappMessage = `New session with ${clientName}! Join: ${finalVideoUrl}`;
        console.log('WhatsApp notification would be sent to:', coachPhone);
        console.log('WhatsApp message:', whatsappMessage);
      }

    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent with direct video link',
        videoUrl: finalVideoUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-connection-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
