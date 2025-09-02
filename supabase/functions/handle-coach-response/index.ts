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

    // Get connection request details with proper joins
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

        // If instant session, generate video link and start preparation
        if (requestData.request_type === 'instant') {
          try {
            // Generate video session using existing function
            const { data: videoData } = await supabase.functions.invoke('generate-video-link', {
              body: { connectionRequestId: requestId }
            });
            
            if (videoData?.success) {
              // Send session link to client
              await supabase.functions.invoke('send-session-link', {
                body: {
                  sessionId: videoData.sessionId,
                  clientEmail: clientEmail,
                  coachName,
                  videoLink: videoData.videoLink
                }
              });
            }
            
            clientNotificationSubject = 'Session Accepted - Join Link Sent!';
            clientNotificationContent = `
              <h2>🎉 Great news!</h2>
              <p>${coachName} has accepted your instant session request.</p>
              <p><strong>Status:</strong> ✅ Session ready</p>
              <p>Check your email for the video link to join your session!</p>
              <p>You can join up to 5 minutes early.</p>
            `;
          } catch (videoError) {
            console.error('Error generating video link:', videoError);
            clientNotificationContent = `
              <h2>Session Accepted!</h2>
              <p>${coachName} has accepted your instant session request.</p>
              <p><strong>Status:</strong> Setting up your session...</p>
              <p>You'll receive the video link shortly.</p>
            `;
          }
        } else {
          // For scheduled sessions, create the session but don't send link yet
          try {
            const sessionTime = new Date(requestData.scheduled_time);
            const { data: sessionData } = await supabase.functions.invoke('create-video-session', {
              body: {
                coachId: requestData.coach_id,
                scheduledTime: sessionTime.toISOString(),
                sessionDuration: 60
              }
            });
            
            clientNotificationSubject = 'Session Request Accepted';
            clientNotificationContent = `
              <h2>🎯 Session Confirmed!</h2>
              <p>${coachName} has accepted your session request.</p>
              <p><strong>📅 Scheduled Time:</strong> ${sessionTime.toLocaleString()}</p>
              <p><strong>⏱️ Duration:</strong> 60 minutes</p>
              <p>You'll receive the video link 30 minutes before your session starts.</p>
            `;
          } catch (sessionError) {
            console.error('Error creating scheduled session:', sessionError);
            clientNotificationSubject = 'Session Request Accepted';
            clientNotificationContent = `
              <h2>Session Accepted!</h2>
              <p>${coachName} has accepted your session request.</p>
              <p><strong>Scheduled Time:</strong> ${new Date(requestData.scheduled_time).toLocaleString()}</p>
              <p>You'll receive the video link and session details closer to your appointment time.</p>
            `;
          }
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
          subject: `Response Confirmation - ${action.charAt(0).toUpperCase() + action.slice(1)} Request`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>✅ Response Recorded</h2>
              <p>Hi ${coachName},</p>
              <p>Your response has been successfully submitted and processed.</p>
              <p><strong>Action taken:</strong> ${action.charAt(0).toUpperCase() + action.slice(1)}</p>
              <p><strong>Client:</strong> ${clientName}</p>
              ${action === 'accept' ? '<p>The client will receive a follow-up email with the session link.</p>' : ''}
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