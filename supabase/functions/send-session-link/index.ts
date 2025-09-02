import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

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
    const { sessionId, clientEmail, coachName, videoLink } = await req.json();

    if (!sessionId || !clientEmail || !videoLink) {
      throw new Error('Missing required parameters');
    }

    // Initialize Supabase and Resend clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw new Error(`Session not found: ${sessionError.message}`);
    }

    const scheduledTime = new Date(session.scheduled_time);
    const sessionDate = scheduledTime.toLocaleDateString();
    const sessionTime = scheduledTime.toLocaleTimeString();

    // Create email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Coaching Session is Ready</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .video-link { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; }
          .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          @media (max-width: 600px) {
            .container { margin: 10px; }
            .content { padding: 20px 15px; }
            .video-link { display: block; text-align: center; margin: 20px 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Your Session is Ready!</h1>
            <p>Get ready for your coaching session with ${coachName || 'your coach'}</p>
          </div>
          <div class="content">
            <h2>Session Details</h2>
            <div class="details">
              <p><strong>📅 Date:</strong> ${sessionDate}</p>
              <p><strong>🕐 Time:</strong> ${sessionTime}</p>
              <p><strong>👩‍💼 Coach:</strong> ${coachName || 'Your assigned coach'}</p>
              <p><strong>⏱️ Duration:</strong> ${session.duration_minutes || 60} minutes</p>
            </div>
            
            <h3>Join Your Session</h3>
            <p>Click the button below to join your video session. You can join up to 5 minutes before the scheduled time.</p>
            
            <a href="${videoLink}" class="video-link">🎥 Join Video Session</a>
            
            <h3>Before You Join</h3>
            <ul>
              <li>Test your camera and microphone</li>
              <li>Find a quiet, well-lit space</li>
              <li>Have a notepad ready for insights</li>
              <li>Prepare any questions you'd like to discuss</li>
            </ul>
            
            <h3>Need Help?</h3>
            <p>If you experience any technical issues, please contact our support team. We're here to ensure you have the best coaching experience possible.</p>
          </div>
          <div class="footer">
            <p>This session was scheduled through our coaching platform.</p>
            <p>If you need to reschedule or cancel, please contact support as soon as possible.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to client
    const emailResponse = await resend.emails.send({
      from: 'Coaching Platform <onboarding@resend.dev>',
      to: [clientEmail],
      subject: `Your coaching session with ${coachName} is ready - ${sessionDate}`,
      html: emailHtml,
    });

    console.log('Session link email sent:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Session link sent successfully',
        emailId: emailResponse.data?.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-session-link:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});