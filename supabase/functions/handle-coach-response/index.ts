import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CONFIG } from '../_shared/config.ts';

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
    // Support both GET (query params) and POST (JSON body)
    const url = new URL(req.url);
    let action: string | null = null;
    let sessionId: string | null = null;

    // Try JSON body first (from CoachResponsePage)
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        action = body.action;
        sessionId = body.sessionId;
        console.log('Received POST request:', { action, sessionId });
      } catch {
        // Fall back to query params
      }
    }

    // Fall back to query params if POST didn't work
    if (!action || !sessionId) {
      action = url.searchParams.get('action');
      sessionId = url.searchParams.get('sessionId');
      console.log('Using query params:', { action, sessionId });
    }

    if (!action || !sessionId) {
      throw new Error('Missing required parameters: action and sessionId');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session details with proper joins using new foreign key
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        coach:coaches!fk_sessions_coach(*),
        session_video_details (
          video_join_url,
          video_room_id
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      throw new Error(`Session not found: ${sessionError?.message}`);
    }

    // Get comprehensive client data including responses and AI analysis
    const { data: clientInsights, error: insightsError } = await supabase
      .from('user_responses')
      .select('selected_goal, responses, ai_analysis')
      .eq('user_id', sessionData.client_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();


    // Get client details from auth.users and profiles
    console.log('Fetching client details for client_id:', sessionData.client_id);
    
    let clientEmail = null;
    let clientName = 'Client';
    
    try {
      const { data: clientAuthData, error: authError } = await supabase.auth.admin.getUserById(sessionData.client_id);
      if (authError) {
        console.error('Error fetching auth user:', authError);
      } else {
        clientEmail = clientAuthData?.user?.email;
        console.log('Client email found:', clientEmail);
      }
    } catch (authError) {
      console.error('Exception fetching auth user:', authError);
    }

    try {
      const { data: clientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', sessionData.client_id)
        .maybeSingle();
        
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (clientProfile) {
        clientName = clientProfile.full_name || 'Client';
        console.log('Client name found:', clientName);
      } else {
        console.log('No profile found for user');
      }
    } catch (profileError) {
      console.error('Exception fetching profile:', profileError);
    }

    const coachName = sessionData.coach?.name || 'Coach';
    console.log('Final client details - Email:', clientEmail, 'Name:', clientName, 'Coach:', coachName);

    // Generate comprehensive coach email content
    const generateCoachEmailContent = (action: string, session: any, sessionUrl: string) => {
      console.log('🔍 generateCoachEmailContent called with action:', action);
      console.log('clientInsights available:', !!clientInsights, 'Data:', {
        goal: clientInsights?.selected_goal?.title || 'none',
        responsesCount: clientInsights?.responses?.length || 0,
        analysisLength: clientInsights?.ai_analysis?.analysis?.length || 0
      });
      const scheduledTime = new Date(session.scheduled_time);
      const now = new Date();
      const minutesUntilSession = Math.floor((scheduledTime.getTime() - now.getTime()) / (1000 * 60));
      const isImmediate = minutesUntilSession <= 30;

      const clientGoal = clientInsights?.selected_goal;
      const responses = clientInsights?.responses || [];
      const analysis = clientInsights?.ai_analysis?.analysis || '';
      
      const goalSection = clientGoal ? `
        <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #1e40af;">🎯 Client's Primary Goal</h3>
          <h4 style="margin: 0 0 8px 0; color: #374151;">${clientGoal.title}</h4>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">${clientGoal.description}</p>
        </div>
      ` : '';

      const responsesSection = responses.length > 0 ? `
        <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 12px 0; color: #059669;">💬 Client Responses</h3>
          ${responses.map(r => `
            <div style="margin-bottom: 12px;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #374151; font-size: 14px;">${r.question}</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px; font-style: italic;">"${r.answer}"</p>
            </div>
          `).join('')}
        </div>
      ` : '';

      const insightsSection = analysis ? `
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px 0; color: #d97706;">🧠 AI Analysis & Insights</h3>
          <p style="margin: 0; color: #92400e; font-size: 14px;">${analysis}</p>
        </div>
      ` : '';

      const starterQuestions = clientGoal ? `
        <div style="background: #ede9fe; border-left: 4px solid #8b5cf6; padding: 16px; margin: 16px 0;">
          <h3 style="margin: 0 0 12px 0; color: #7c3aed;">❓ Suggested Starter Questions</h3>
          <ul style="margin: 0; padding-left: 20px; color: #5b21b6;">
            <li style="margin-bottom: 8px;">What specific aspect of ${clientGoal.title.toLowerCase()} feels most challenging right now?</li>
            <li style="margin-bottom: 8px;">What have you already tried to address this goal?</li>
            <li style="margin-bottom: 8px;">What would success look like to you in this area?</li>
            <li style="margin-bottom: 8px;">What's holding you back from achieving this goal?</li>
          </ul>
        </div>
      ` : '';

      if (action === 'accept' || action.startsWith('accept_')) {
        return `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #059669; margin: 0;">🎉 Session Request Accepted!</h1>
              <p style="color: #6b7280; margin: 8px 0 0 0;">Here's everything you need to prepare for your session with ${clientName}</p>
            </div>

            ${goalSection}
            ${responsesSection}
            ${insightsSection}
            ${starterQuestions}

            ${isImmediate ? `
            <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 12px; padding: 30px; margin: 24px 0; text-align: center; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3);">
              <h2 style="color: white; margin: 0 0 10px 0; font-size: 24px;">🔴 IMMEDIATE SESSION</h2>
              <p style="color: rgba(255,255,255,0.95); margin: 0 0 16px 0; font-size: 14px;">
                Client is waiting online • Session ID: ${session.id.slice(0, 8)}...
              </p>
              <a href="${sessionUrl}" style="display: inline-block; width:100%; max-width:360px; box-sizing:border-box; padding: 12px 20px; background: white; color: #dc2626; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); margin: 12px auto; text-align: center;">
                🎥 Join Session Now
              </a>
            </div>
            ` : `
            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
              <h3 style="margin: 0 0 12px 0; color: #334155;">🎥 Session Link</h3>
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
                Session ID: ${session.id.slice(0, 8)}...
              </p>
              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">
                You'll receive a reminder email 10 minutes before the session
              </p>
              <a href="${sessionUrl}" style="display: inline-block; width:100%; max-width:360px; box-sizing:border-box; background: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 12px auto; text-align: center;">View Session Details →</a>
            </div>
            `}

            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h4 style="margin: 0 0 8px 0; color: #374151;">💡 Coaching Tips</h4>
              <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px;">
                <li>Review the client's responses and AI insights before the session</li>
                <li>Start with open-ended questions to understand their current situation</li>
                <li>Listen for underlying concerns that may not be explicitly stated</li>
                <li>Be prepared to adapt your coaching style based on their responses</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This email contains confidential client information. Please handle with care and maintain professional confidentiality.
              </p>
            </div>
          </div>
        `;
      }
      
      if (action === 'decline') {
        return `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #64748b; margin: 0;">Session Declined</h1>
              <p style="color: #6b7280; margin: 8px 0 0 0;">Your response has been recorded</p>
            </div>

            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 16px 0;">
              <p style="margin: 0; color: #374151; font-size: 14px;">
                Thank you for your response. We've notified <strong>${clientName}</strong> that you're unable to accept this session request at this time.
              </p>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Note:</strong> The client will be automatically matched with another coach from our network who specializes in <strong>${clientGoal?.title || 'their goals'}</strong>.
              </p>
            </div>

            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h4 style="margin: 0 0 8px 0; color: #374151;">💡 Update Your Availability</h4>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                To avoid future requests during unavailable times, please update your availability settings in your coach dashboard.
              </p>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${CONFIG.WEBSITE_URL}/coach-dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Go to Dashboard
              </a>
            </div>

            <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Session ID: ${session.id.slice(0, 8)}... • Declined on ${new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        `;
      }
      
      if (action === 'reschedule') {
        return `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #f59e0b; margin: 0;">📅 Reschedule Request Submitted</h1>
              <p style="color: #6b7280; margin: 8px 0 0 0;">We'll coordinate with ${clientName} for a new time</p>
            </div>

            ${goalSection}

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
              <h4 style="margin: 0 0 8px 0; color: #92400e;">🔄 Next Steps</h4>
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                We've notified <strong>${clientName}</strong> that you're interested but need to reschedule. They'll be able to propose alternative times, and we'll send you a follow-up email with their availability.
              </p>
            </div>

            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h4 style="margin: 0 0 8px 0; color: #374151;">📋 Client Details (For Reference)</h4>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Goal:</strong> ${clientGoal?.title || 'Not specified'}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Original Request Time:</strong> ${new Date(session.scheduled_time).toLocaleString()}</p>
            </div>

            <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #075985; font-size: 14px;">
                <strong>💡 Pro Tip:</strong> Update your calendar link in your coach dashboard so clients can automatically see your available times, making scheduling faster and easier.
              </p>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${CONFIG.WEBSITE_URL}/coach-dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 0 8px;">
                Update Calendar
              </a>
            </div>

            <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Session ID: ${session.id.slice(0, 8)}... • Reschedule requested on ${new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        `;
      }
      
      return '';
    };

    let responseHtml = '';
    let clientNotificationSubject = '';
    let clientNotificationContent = '';

    switch (action) {
      case 'accept':
      case 'accept_5min':
      case 'accept_10min':
        // Calculate new scheduled time based on coach response
        let newScheduledTime = new Date();
        if (action === 'accept_5min') {
          newScheduledTime = new Date(Date.now() + 5 * 60 * 1000);
        } else if (action === 'accept_10min') {
          newScheduledTime = new Date(Date.now() + 10 * 60 * 1000);
        } else {
          newScheduledTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes for immediate
        }

        // Update session status
        await supabase
          .from('sessions')
          .update({ 
            status: 'confirmed',
            session_state: 'ready',
            scheduled_time: newScheduledTime.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        // Send portal access notification with timing details
        const portalUrl = `${CONFIG.WEBSITE_URL}/join-session`;
        
        let timingMessage = 'Ready now!';
        if (action === 'accept_5min') {
          timingMessage = 'Ready in 5 minutes';
        } else if (action === 'accept_10min') {
          timingMessage = 'Ready in 10 minutes';
        }
        
        clientNotificationSubject = `Session Accepted - ${timingMessage}`;
        clientNotificationContent = `
          <h2>🎉 Great news!</h2>
          <p>${coachName} has accepted your session request and is ${timingMessage.toLowerCase()}!</p>
          <p><strong>Status:</strong> ✅ Session confirmed and ready</p>
          <p><strong>Start Time:</strong> ${newScheduledTime.toLocaleString()}</p>
          <p><a href="${portalUrl}?token=${sessionData.join_token}" style="display: inline-block; width:100%; max-width:360px; box-sizing:border-box; background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; margin: 12px auto; text-align:center;">Join Session Portal</a></p>
          <p style="font-size: 14px; color: #6b7280;">Click the link above to join your session at the scheduled time. The video room will be available when the session starts.</p>
        `;

        break;

      case 'decline':
        await supabase
          .from('sessions')
          .update({ 
            status: 'declined',
            session_state: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        clientNotificationSubject = 'Session Request Update';
        clientNotificationContent = `
          <h2>Session Request Update</h2>
          <p>Unfortunately, ${coachName} is not available for your requested session.</p>
          <p>Don't worry! We'll help you find another excellent coach who matches your needs.</p>
          <p><a href="${CONFIG.WEBSITE_URL}/coaches" style="display: inline-block; width:100%; max-width:360px; box-sizing:border-box; background-color: #667eea; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; margin: 12px auto; text-align:center;">Browse Other Coaches</a></p>
        `;

        break;

      case 'reschedule':
        await supabase
          .from('sessions')
          .update({ 
            status: 'reschedule_requested',
            session_state: 'pending_reschedule',
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        clientNotificationSubject = 'Coach Would Like to Reschedule';
        clientNotificationContent = `
          <h2>Reschedule Request</h2>
          <p>${coachName} is interested in working with you but would like to propose a different time.</p>
          <p>Please check your calendar and respond with your availability.</p>
          <p><a href="${CONFIG.WEBSITE_URL}/reschedule/${sessionId}" style="display: inline-block; width:100%; max-width:360px; box-sizing:border-box; background-color: #f59e0b; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; margin: 12px auto; text-align:center;">View Available Times</a></p>
        `;

        break;

      default:
        throw new Error('Invalid action');
    }

    console.log('Attempting to send notification emails via email_outbox');

    // Queue client email via email_outbox for reliable delivery
    if (clientEmail) {
      try {
        const clientDedupKey = `coach_response:client:${sessionId}:${action}:${clientEmail}`;
        
        await supabase
          .from('email_outbox')
          .insert({
            dedup_key: clientDedupKey,
            template_name: `coach_response_${action}_client`,
            recipient_email: clientEmail,
            recipient_name: 'Client',
            subject: clientNotificationSubject,
            payload: {
              html: clientNotificationContent,
              from: 'Coaching Platform <sessions@resend.dev>'
            }
          });
        console.log('✅ Client notification queued in email_outbox:', clientEmail.replace(/(.{2}).*(@.*)/, '$1***$2'));
      } catch (emailError) {
        console.error('Error queuing client email:', emailError);
      }
    }

    // Queue coach confirmation email with session link via email_outbox
    console.log('Coach data check:', {
      hasCoach: !!sessionData.coach,
      coachEmail: sessionData.coach?.notification_email,
      coachName: sessionData.coach?.name
    });
    
    if (sessionData.coach?.notification_email) {
      console.log('✅ Queuing coach email to:', sessionData.coach.notification_email);
      try {
        const videoUrl = sessionData.session_video_details?.[0]?.video_join_url;
        const sessionUrl = videoUrl || `${CONFIG.WEBSITE_URL}/coach-session/${sessionId}`;
        console.log('Coach email session URL:', sessionUrl, 'Video URL:', videoUrl);
        const coachEmailContent = generateCoachEmailContent(action, sessionData, sessionUrl);
        console.log('Generated coach email content length:', coachEmailContent?.length || 0, 'Action:', action);
        console.log('Content preview (first 200 chars):', coachEmailContent?.substring(0, 200) || 'EMPTY');
        if (coachEmailContent && coachEmailContent.trim().length > 0) {
          const coachDedupKey = `coach_response:coach:${sessionId}:${action}:${sessionData.coach.notification_email}`;
          
          await supabase
            .from('email_outbox')
            .insert({
              dedup_key: coachDedupKey,
              template_name: `coach_response_${action}_coach`,
              recipient_email: sessionData.coach.notification_email,
              recipient_name: sessionData.coach.name || 'Coach',
              subject: `Session Request ${action.charAt(0).toUpperCase() + action.slice(1)} - Client: ${clientName}`,
              payload: {
                html: coachEmailContent,
                from: 'Coaching Platform <sessions@resend.dev>'
              }
            });
          console.log('✅ Coach confirmation email queued in email_outbox:', sessionData.coach.notification_email.replace(/(.{2}).*(@.*)/, '$1***$2'));
        } else {
          console.warn('⚠️ No coach email content generated for action:', action, 'Content empty or whitespace-only');
        }
      } catch (emailError) {
        console.error('❌ Error queuing coach email:', emailError);
      }
    } else {
      console.warn('⚠️ Coach email skipped - no notification_email found');
    }

    // After sending emails, redirect to success page
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${CONFIG.WEBSITE_URL}/coach-response-success?action=${action}`,
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error in handle-coach-response:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    const errorHtml = `
      <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #ef4444;">Error Processing Response</h1>
        <p>There was an issue processing your response.</p>
        <p>Error: ${error.message}</p>
        <p>Please contact support if this issue persists.</p>
        <p>Error ID: ${new Date().toISOString()}</p>
      </body></html>
    `;

    return new Response(errorHtml, {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  }
});