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
    const url = new URL(req.url);
    const action = url.searchParams.get('action'); // accept, decline, reschedule
    const requestId = url.searchParams.get('requestId');

    if (!action || !requestId) {
      throw new Error('Missing required parameters: action and requestId');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Get connection request details with proper joins and client insights
    const { data: requestData, error: requestError } = await supabase
      .from('connection_requests')
      .select(`
        *,
        coach:coaches(*)
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      throw new Error(`Connection request not found: ${requestError?.message}`);
    }

    // Get comprehensive client data including responses and AI analysis
    const { data: clientInsights, error: insightsError } = await supabase
      .from('user_responses')
      .select('selected_goal, responses, ai_analysis')
      .eq('user_id', requestData.client_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();


    // Get client details from auth.users and profiles
    console.log('Fetching client details for client_id:', requestData.client_id);
    
    let clientEmail = null;
    let clientName = 'Client';
    
    try {
      const { data: clientAuthData, error: authError } = await supabase.auth.admin.getUserById(requestData.client_id);
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
        .eq('user_id', requestData.client_id)
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

    const coachName = requestData.coach?.name || 'Coach';
    console.log('Final client details - Email:', clientEmail, 'Name:', clientName, 'Coach:', coachName);

    // Generate comprehensive coach email content
    const generateCoachEmailContent = (action: string) => {
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

      const portalUrl = `${supabaseUrl}/session-portal`;

      if (action === 'accept') {
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

            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
              <h3 style="margin: 0 0 12px 0; color: #334155;">🎥 Session Access</h3>
              <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">
                ${requestData.request_type === 'instant' 
                  ? 'The client will receive their session link shortly. You can access your session portal here:'
                  : `Session scheduled for ${new Date(requestData.scheduled_time).toLocaleString()}. Both you and the client will receive session links closer to the appointment time.`
                }
              </p>
              ${requestData.request_type === 'instant' ? `
                <a href="${portalUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Access Session Portal</a>
              ` : ''}
            </div>

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
      return '';
    };

    let responseHtml = '';
    let clientNotificationSubject = '';
    let clientNotificationContent = '';

    switch (action) {
      case 'accept':
        // Update connection request status
        await supabase
          .from('connection_requests')
          .update({ 
            status: 'accepted',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);

        // Create session and send portal access
        try {
          let sessionData;
          if (requestData.request_type === 'instant') {
            // For instant sessions, create session without video room (lazy creation)
            const { data: newSession } = await supabase
              .from('sessions')
              .insert({
                session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                client_id: requestData.client_id,
                coach_id: requestData.coach_id,
                scheduled_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
                duration_minutes: 60,
                status: 'ready'
              })
              .select()
              .single();
            
            sessionData = newSession;
            
            clientNotificationSubject = 'Session Accepted - Ready to Join!';
            clientNotificationContent = `
              <h2>🎉 Great news!</h2>
              <p>${coachName} has accepted your instant session request.</p>
              <p><strong>Status:</strong> ✅ Session ready</p>
              <p><a href="${supabaseUrl}/session-portal/${sessionData?.id}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">Join Session Portal</a></p>
              <p style="font-size: 14px; color: #6b7280;">You can join up to 5 minutes early. The video room will be created when you click "Join Session".</p>
            `;
          } else {
            // For scheduled sessions, create session record
            const sessionTime = new Date(requestData.scheduled_time);
            const { data: newSession } = await supabase
              .from('sessions')
              .insert({
                session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                client_id: requestData.client_id,
                coach_id: requestData.coach_id,
                scheduled_time: sessionTime.toISOString(),
                duration_minutes: 60,
                status: 'scheduled'
              })
              .select()
              .single();
            
            sessionData = newSession;
            
            clientNotificationSubject = 'Session Request Accepted';
            clientNotificationContent = `
              <h2>🎯 Session Confirmed!</h2>
              <p>${coachName} has accepted your session request.</p>
              <p><strong>📅 Scheduled Time:</strong> ${sessionTime.toLocaleString()}</p>
              <p><strong>⏱️ Duration:</strong> 60 minutes</p>
              <p><a href="${supabaseUrl}/session-portal/${sessionData?.id}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0;">Access Session Portal</a></p>
              <p style="font-size: 14px; color: #6b7280;">You can access your session portal anytime. The video room will be created when the session begins.</p>
            `;
          }

          // Update connection request with session reference
          if (sessionData) {
            await supabase
              .from('connection_requests')
              .update({ 
                status: 'accepted',
                session_id: sessionData.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', requestId);
          }
        } catch (sessionError) {
          console.error('Error creating session:', sessionError);
          clientNotificationSubject = 'Session Request Accepted';
          clientNotificationContent = `
            <h2>Session Accepted!</h2>
            <p>${coachName} has accepted your session request.</p>
            <p>We're setting up your session details. You'll receive a follow-up email shortly with access information.</p>
          `;
        }

        responseHtml = `
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Request Accepted</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
              <div style="background: white; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 500px; width: 100%;">
                <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
                <h1 style="color: #10b981; margin: 0 0 16px 0; font-size: 24px;">Request Accepted!</h1>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">Your response has been submitted successfully. Both you and the client will receive follow-up emails with session details and connection instructions.</p>
                <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Next steps:</strong> Check your email for confirmation and the client will receive their session link shortly.</p>
                </div>
              </div>
            </body>
          </html>
        `;
        break;

      case 'decline':
        await supabase
          .from('connection_requests')
          .update({ 
            status: 'declined',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);

        clientNotificationSubject = 'Session Request Update';
        clientNotificationContent = `
          <h2>Session Request Update</h2>
          <p>Unfortunately, ${coachName} is not available for your requested session.</p>
          <p>Don't worry! We'll help you find another excellent coach who matches your needs.</p>
          <p><a href="${supabaseUrl}/coaches" style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Browse Other Coaches</a></p>
        `;

        responseHtml = `
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Request Declined</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
              <div style="background: white; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 500px; width: 100%;">
                <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                <h1 style="color: #ef4444; margin: 0 0 16px 0; font-size: 24px;">Request Declined</h1>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">Your response has been submitted. The client will be notified and can explore other coaching options.</p>
                <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Next steps:</strong> You'll receive a confirmation email, and the client will be provided with alternative coach suggestions.</p>
                </div>
              </div>
            </body>
          </html>
        `;
        break;

      case 'reschedule':
        await supabase
          .from('connection_requests')
          .update({ 
            status: 'reschedule_requested',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);

        clientNotificationSubject = 'Coach Would Like to Reschedule';
        clientNotificationContent = `
          <h2>Reschedule Request</h2>
          <p>${coachName} is interested in working with you but would like to propose a different time.</p>
          <p>Please check your calendar and respond with your availability.</p>
          <p><a href="${supabaseUrl}/reschedule/${requestId}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Available Times</a></p>
        `;

        responseHtml = `
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reschedule Requested</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
              <div style="background: white; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 500px; width: 100%;">
                <div style="font-size: 48px; margin-bottom: 20px;">📅</div>
                <h1 style="color: #f59e0b; margin: 0 0 16px 0; font-size: 24px;">Reschedule Requested</h1>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">Your reschedule request has been submitted. The client will be notified and able to view your available times.</p>
                <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Next steps:</strong> You'll receive a confirmation email, and the client will be able to select a new time that works for both of you.</p>
                </div>
              </div>
            </body>
          </html>
        `;
        break;

      default:
        throw new Error('Invalid action');
    }

    // Send notification to both client and coach
    console.log('Attempting to send notification emails');
    
    // Send email to client
    if (clientEmail) {
      try {
        const emailResult = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: [clientEmail],
          subject: clientNotificationSubject,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              ${clientNotificationContent}
            </div>
          `,
        });
        console.log(`Client notification email sent successfully to: ${clientEmail}`, emailResult);
      } catch (emailError) {
        console.error('Failed to send client notification:', emailError);
      }
    } else {
      console.error('No client email found for notification - cannot send email');
    }

    // Send confirmation email to coach
    const coachEmail = requestData.coach?.notification_email;
    if (coachEmail) {
      try {
        const coachEmailResult = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: [coachEmail],
          subject: `Session ${action.charAt(0).toUpperCase() + action.slice(1)} - Client Preparation Details`,
          html: generateCoachEmailContent(action) || `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>✅ Response Recorded</h2>
              <p>Hi ${coachName},</p>
              <p>Your response has been successfully submitted and processed.</p>
              <p><strong>Action taken:</strong> ${action.charAt(0).toUpperCase() + action.slice(1)}</p>
              <p><strong>Client:</strong> ${clientName}</p>
              <p>Thank you for your prompt response!</p>
            </div>
          `,
        });
        console.log(`Coach confirmation email sent successfully to: ${coachEmail}`, coachEmailResult);
      } catch (emailError) {
        console.error('Failed to send coach confirmation:', emailError);
      }
    } else {
      console.log('No coach notification email found');
    }

    return new Response(responseHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
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