import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';
import ical from 'npm:ical-generator@7.1.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionEmailData {
  sessionId: string;
  clientEmail: string;
  clientName?: string;
  coachName?: string;
  emailType: 'confirmation' | 'reminder' | 'summary';
  customMessage?: string;
}

const generateSessionCalendarEvent = (session: any, coach: any, goals: any[]) => {
  const calendar = ical({ name: 'Coaching Session' });
  
  const startTime = new Date(session.scheduled_time);
  const endTime = new Date(startTime.getTime() + (session.duration_minutes || 60) * 60000);
  
  calendar.createEvent({
    start: startTime,
    end: endTime,
    summary: `Coaching Session with ${coach?.name || 'Your Coach'}`,
    description: `
Coaching Session Details:
- Coach: ${coach?.name || 'Your assigned coach'}
- Duration: ${session.duration_minutes || 60} minutes
- Session Goals: ${goals.map(g => g.goal_description).join(', ') || 'To be discussed'}

Join Link: ${session.join_token ? `${Deno.env.get('SUPABASE_URL')?.replace('/supabase', '')}/join-session?token=${session.join_token}` : 'Will be provided before session'}

Preparation Notes:
- Review your goals and progress since last session
- Prepare any questions or challenges you'd like to discuss
- Find a quiet, well-lit space for the video call
    `,
    location: 'Video Conference',
    url: session.join_token ? `${Deno.env.get('SUPABASE_URL')?.replace('/supabase', '')}/join-session?token=${session.join_token}` : session.video_join_url,
    organizer: {
      name: coach?.name || 'Coaching Platform',
      email: 'sessions@coaching-platform.com'
    },
    // Note: Attendees field removed to fix calendar generation issue
  });
  
  return calendar.toString();
};

const generateEmailTemplate = (type: string, data: any) => {
  const { session, coach, goals, clientName, customMessage } = data;
  
  const baseStyles = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
    .content { padding: 40px 30px; }
    .section { margin-bottom: 30px; }
    .section h2 { color: #2d3748; margin: 0 0 15px 0; font-size: 20px; font-weight: 600; }
    .session-card { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 20px 0; }
    .coach-info { display: flex; align-items: center; gap: 15px; margin: 20px 0; }
    .coach-avatar { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #667eea; }
    /* Responsive CTA: full-width on small screens, centered and constrained on desktop */
    .join-button { display: inline-block; width: 100%; max-width: 360px; box-sizing: border-box; padding: 14px 22px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; margin: 16px auto; font-weight: 600; font-size: 16px; transition: all 0.3s; text-align: center; }
    .join-button:hover { background: #5a6fd8; transform: translateY(-2px); }
    .goals-list { background: #edf2f7; border-radius: 8px; padding: 20px; margin: 15px 0; }
    .goal-item { padding: 10px 0; border-bottom: 1px solid #cbd5e0; }
    .goal-item:last-child { border-bottom: none; }
    .preparation-tips { background: #e6fffa; border-left: 4px solid #38b2ac; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .footer { background: #f7fafc; padding: 30px; text-align: center; font-size: 14px; color: #718096; border-top: 1px solid #e2e8f0; }
    .highlight { color: #667eea; font-weight: 600; }
    @media (max-width: 600px) {
      .container { margin: 10px; }
      .content { padding: 30px 20px; }
      .coach-info { flex-direction: column; text-align: center; }
    }
  `;

  const scheduledTime = new Date(session.scheduled_time);
  const sessionDate = scheduledTime.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const sessionTime = scheduledTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short' 
  });

  const templates = {
    confirmation: {
      subject: `Session Confirmed: ${sessionDate} with ${coach?.name || 'Your Coach'}`,
      title: "🎯 Your Session is Confirmed!",
      subtitle: "Everything is set up for your coaching session",
      mainContent: `
        <div class="session-card">
          <h3 style="margin: 0 0 15px 0; color: #2d3748;">Session Details</h3>
          <p><strong>📅 Date:</strong> ${sessionDate}</p>
          <p><strong>🕐 Time:</strong> ${sessionTime}</p>
          <p><strong>⏱️ Duration:</strong> ${session.duration_minutes || 60} minutes</p>
          <p><strong>💰 Cost:</strong> ${session.coin_cost || 100} coins</p>
        </div>
        
        ${coach ? `
        <div class="coach-info">
          ${coach.avatar_url ? `<img src="${coach.avatar_url}" alt="${coach.name}" class="coach-avatar">` : ''}
          <div>
            <h3 style="margin: 0; color: #2d3748;">${coach.name}</h3>
            <p style="margin: 5px 0 0 0; color: #718096;">${coach.title || 'Professional Coach'}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #4a5568;">${coach.years_experience || 5}+ years experience</p>
          </div>
        </div>
        ` : ''}
      `
    },
    reminder: {
      subject: `Reminder: Session Tomorrow with ${coach?.name || 'Your Coach'}`,
      title: "⏰ Session Reminder",
      subtitle: "Your coaching session is coming up soon",
      mainContent: `
        <div class="session-card">
          <h3 style="margin: 0 0 15px 0; color: #2d3748;">Tomorrow's Session</h3>
          <p><strong>📅 Date:</strong> ${sessionDate}</p>
          <p><strong>🕐 Time:</strong> ${sessionTime}</p>
          <p><strong>👩‍💼 Coach:</strong> ${coach?.name || 'Your assigned coach'}</p>
        </div>
      `
    },
    summary: {
      subject: `Session Summary: Key Insights & Next Steps`,
      title: "📋 Session Summary",
      subtitle: "Here's what we accomplished and your next steps",
      mainContent: `
        <div class="session-card">
          <h3 style="margin: 0 0 15px 0; color: #2d3748;">Session Completed</h3>
          <p><strong>📅 Date:</strong> ${sessionDate}</p>
          <p><strong>👩‍💼 Coach:</strong> ${coach?.name || 'Your coach'}</p>
          <p><strong>⏱️ Duration:</strong> ${session.actual_duration || session.duration_minutes || 60} minutes</p>
        </div>
        
        ${customMessage ? `
        <div class="section">
          <h2>📝 Session Notes</h2>
          <div style="background: #f7fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
            ${customMessage}
          </div>
        </div>
        ` : ''}
      `
    }
  };

  const template = templates[type] || templates.confirmation;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.subject}</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${template.title}</h1>
          <p>${template.subtitle}</p>
        </div>
        <div class="content">
          ${template.mainContent}
          
          ${goals?.length > 0 ? `
          <div class="section">
            <h2>🎯 Session Goals</h2>
            <div class="goals-list">
              ${goals.map(goal => `
                <div class="goal-item">
                  <strong>${goal.goal_category}:</strong> ${goal.goal_description}
                  ${goal.progress_notes ? `<br><small style="color: #718096;">Progress: ${goal.progress_notes}</small>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          ${session.join_token && type !== 'summary' ? `
          <div class="section">
            <h2>🎥 Join Your Session</h2>
            <p>Click the button below to join your video session. You can join up to 5 minutes before the scheduled time.</p>
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('/supabase', '')}/join-session?token=${session.join_token}" class="join-button">Join Video Session</a>
          </div>
          ` : ''}
          
          ${type === 'confirmation' || type === 'reminder' ? `
          <div class="preparation-tips">
            <h3 style="margin: 0 0 15px 0; color: #2d3748;">🚀 Preparation Tips</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Test your camera and microphone beforehand</li>
              <li>Find a quiet, well-lit space for the session</li>
              <li>Review your goals and any progress since your last session</li>
              <li>Prepare specific questions or challenges you'd like to discuss</li>
              <li>Have a notepad ready for insights and action items</li>
            </ul>
          </div>
          ` : ''}
          
          ${type === 'summary' ? `
          <div class="section">
            <h2>📅 Add Goals to Your Calendar</h2>
            <p>Your session goals and action items are attached as a calendar file. Import it to your calendar app to set reminders for your next steps.</p>
          </div>
          ` : ''}
          
          <div class="section">
            <h2>💬 Need Help?</h2>
            <p>If you experience any technical issues or need to reschedule, please contact our support team. We're here to ensure you have the best coaching experience possible.</p>
          </div>
        </div>
        <div class="footer">
          <p>This session was scheduled through our coaching platform.</p>
          <p>For support or to reschedule, contact us as soon as possible.</p>
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
    const { sessionId, clientEmail, clientName, coachName, emailType = 'confirmation', customMessage }: SessionEmailData = await req.json();

    if (!sessionId || !clientEmail) {
      throw new Error('Missing required parameters: sessionId and clientEmail');
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Fetch session details with coach info and video details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        coaches!fk_sessions_coach (
          id, name, title, bio, avatar_url, years_experience, 
          specialties, coaching_expertise, coaching_style
        ),
        session_video_details (
          video_join_url,
          video_room_id
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw new Error(`Session not found: ${sessionError.message}`);
    }

    // Fetch session goals and analytics
    const { data: goals } = await supabase
      .from('session_analytics')
      .select('goal_description, goal_category, action_items, progress_notes')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .maybeSingle();

    // Prepare email data with video URL from joined table
    const videoUrl = session.session_video_details?.[0]?.video_join_url;
    const goalArray = goals ? [{
      goal_category: goals.goal_category || 'General',
      goal_description: goals.goal_description || 'Session coaching',
      progress_notes: goals.progress_notes || ''
    }] : [];
    const emailData = {
      session: {
        ...session,
        video_join_url: videoUrl, // Use the joined video URL
        client_email: clientEmail,
        client_name: clientName || 'Client'
      },
      coach: session.coaches,
      goals: goalArray,
      clientName: clientName || 'Client',
      customMessage
    };

    // Generate email content
    const emailHtml = generateEmailTemplate(emailType, emailData);
    const template = emailType === 'confirmation' ? 'confirmation' : emailType === 'reminder' ? 'reminder' : 'summary';
    const subjectMap = {
      confirmation: `Session Confirmed: ${new Date(session.scheduled_time).toLocaleDateString()} with ${session.coaches?.name || 'Your Coach'}`,
      reminder: `Reminder: Session Tomorrow with ${session.coaches?.name || 'Your Coach'}`,
      summary: `Session Summary: Key Insights & Next Steps`
    };

    // Generate calendar attachment for confirmation and reminder emails
    let attachments = [];
    if (emailType === 'confirmation' || emailType === 'reminder') {
      const calendarEvent = generateSessionCalendarEvent(session, session.coaches, goals || []);
      attachments.push({
        filename: 'session.ics',
        content: btoa(calendarEvent), // Use btoa instead of Buffer (Deno compatible)
        type: 'text/calendar',
        disposition: 'attachment'
      });
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: 'Coaching Platform <sessions@resend.dev>',
      to: ['eyeskinz@gmail.com'],  // Test mode: send only to verified email
      subject: subjectMap[template],
      html: emailHtml,
      attachments: attachments
    });

    console.log('Enhanced session email sent:', emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Enhanced session email sent successfully',
        emailId: emailResponse.data?.id,
        type: emailType
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-enhanced-session-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});