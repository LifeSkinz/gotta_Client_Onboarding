import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateReminderEmailTemplate = (recipient: 'coach' | 'client', session: any, profile: any, sessionUrl: string) => {
  const scheduledTime = new Date(session.scheduled_time);
  const sessionDate = scheduledTime.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const sessionTime = scheduledTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short' 
  });

  const baseStyles = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 32px; font-weight: 700; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 18px; }
    .content { padding: 40px 30px; }
    .alert-box { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; padding: 30px; margin: 20px 0; text-align: center; color: white; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3); }
    .alert-box h2 { margin: 0 0 10px 0; font-size: 28px; }
    .alert-box p { margin: 0; font-size: 16px; opacity: 0.95; }
    .session-card { background: #f7fafc; border-radius: 8px; padding: 25px; margin: 20px 0; }
    .session-card p { margin: 10px 0; color: #2d3748; font-size: 16px; }
    .join-button { display: inline-block; padding: 18px 50px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 20px; margin: 20px 0; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4); transition: all 0.3s; }
    .join-button:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(16, 185, 129, 0.5); }
    .tips { background: #e6fffa; border-left: 4px solid #38b2ac; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .tips h3 { margin: 0 0 15px 0; color: #2c7a7b; }
    .tips ul { margin: 0; padding-left: 20px; }
    .tips li { margin: 8px 0; color: #2d3748; }
    .footer { background: #f7fafc; padding: 25px; text-align: center; font-size: 14px; color: #718096; border-top: 1px solid #e2e8f0; }
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Session Starting Soon</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Session Reminder</h1>
          <p>Your session starts in 10 minutes!</p>
        </div>
        <div class="content">
          
          <div class="alert-box">
            <h2>⏰ Get Ready!</h2>
            <p>Your coaching session begins at ${sessionTime}</p>
          </div>

          <div class="session-card">
            <p><strong>📅 Date:</strong> ${sessionDate}</p>
            <p><strong>⏰ Time:</strong> ${sessionTime}</p>
            <p><strong>⏱️ Duration:</strong> ${session.duration_minutes || 15} minutes</p>
            ${recipient === 'coach' 
              ? `<p><strong>👤 Client:</strong> ${profile?.full_name || 'Client'}</p>`
              : `<p><strong>👨‍🏫 Coach:</strong> ${session.coaches?.name || 'Coach'}</p>`
            }
            <p><strong>🆔 Session ID:</strong> ${session.id.slice(0, 8)}...</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${sessionUrl}" class="join-button">
              🎥 Join Session Now
            </a>
          </div>

          <div class="tips">
            <h3>✨ Last-Minute Checklist</h3>
            <ul>
              <li>✅ Test your camera and microphone</li>
              <li>✅ Find a quiet, well-lit space</li>
              <li>✅ Have water and any materials ready</li>
              <li>✅ Close other apps for better connection</li>
              ${recipient === 'coach' 
                ? '<li>✅ Review client goals and notes</li>'
                : '<li>✅ Prepare any questions for your coach</li>'
              }
            </ul>
          </div>

          ${recipient === 'coach' ? `
          <div style="background: #fef5e7; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #744210;"><strong>💡 Coach Tips:</strong></p>
            <p style="margin: 10px 0 0 0; color: #744210;">Join 5 minutes early to ensure a smooth start. The client is counting on you!</p>
          </div>
          ` : `
          <div style="background: #fef5e7; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; color: #744210;"><strong>💡 Session Tips:</strong></p>
            <p style="margin: 10px 0 0 0; color: #744210;">Come with an open mind and be ready to engage. Your coach is here to support you!</p>
          </div>
          `}

        </div>
        <div class="footer">
          <p><strong>Need Help?</strong> Contact support if you experience any issues joining.</p>
          <p style="margin-top: 15px; font-size: 12px;">© 2024 Coaching Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
    const earliestReminder = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

    console.log('Checking for sessions needing reminders between', earliestReminder, 'and', reminderWindow);

    // Find sessions that need reminders (10-15 minutes before start)
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        *,
        coaches (
          id, name, title, notification_email
        )
      `)
      .gte('scheduled_time', earliestReminder.toISOString())
      .lte('scheduled_time', reminderWindow.toISOString())
      .in('status', ['confirmed', 'scheduled'])
      .is('reminder_sent_at', null)
      .limit(50);

    if (sessionsError) {
      throw new Error(`Error fetching sessions: ${sessionsError.message}`);
    }

    if (!sessions || sessions.length === 0) {
      console.log('No sessions found needing reminders');
      return new Response(
        JSON.stringify({ message: 'No sessions need reminders at this time', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${sessions.length} sessions needing reminders`);

    const reminderResults = [];

    for (const session of sessions) {
      try {
        const sessionUrl = `https://your-actual-website.com/session-portal/${session.id}`;

        // Fetch client profile
        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.client_id)
          .single();

        // Fetch client email from auth.users
        const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(session.client_id);

        const coachEmail = session.coaches?.notification_email;
        const clientEmail = clientUser?.email;

        if (!coachEmail && !clientEmail) {
          console.log(`No email addresses found for session ${session.id}`);
          continue;
        }

        // Send reminder to coach
        if (coachEmail) {
          const coachEmailHtml = generateReminderEmailTemplate('coach', session, clientProfile, sessionUrl);
          await resend.emails.send({
            from: 'Coaching Platform <sessions@resend.dev>',
            to: [coachEmail],
            subject: `🔔 Session Starting in 10 Minutes - ${clientProfile?.full_name || 'Client'}`,
            html: coachEmailHtml,
          });
          console.log(`Reminder sent to coach: ${coachEmail}`);
        }

        // Send reminder to client
        if (clientEmail) {
          const clientEmailHtml = generateReminderEmailTemplate('client', session, clientProfile, sessionUrl);
          await resend.emails.send({
            from: 'Coaching Platform <sessions@resend.dev>',
            to: [clientEmail],
            subject: `🔔 Your Session Starts in 10 Minutes!`,
            html: clientEmailHtml,
          });
          console.log(`Reminder sent to client: ${clientEmail}`);
        }

        // Mark reminder as sent
        await supabase
          .from('sessions')
          .update({ reminder_sent_at: now.toISOString() })
          .eq('id', session.id);

        reminderResults.push({
          sessionId: session.id,
          success: true,
          coachNotified: !!coachEmail,
          clientNotified: !!clientEmail
        });

      } catch (error) {
        console.error(`Error sending reminder for session ${session.id}:`, error);
        reminderResults.push({
          sessionId: session.id,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${sessions.length} session reminders`,
        results: reminderResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-session-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});