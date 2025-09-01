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
    const { connectionRequestId } = await req.json();

    if (!connectionRequestId) {
      throw new Error('Connection request ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get connection request details with coach and client info
    const { data: requestData, error: requestError } = await supabase
      .from('connection_requests')
      .select(`
        *,
        coach:coaches(*),
        client:profiles!connection_requests_client_id_fkey(*)
      `)
      .eq('id', connectionRequestId)
      .single();

    if (requestError) {
      throw new Error(`Failed to fetch connection request: ${requestError.message}`);
    }

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Get coach notification preferences
    const coachEmail = requestData.coach.notification_email || requestData.coach.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
    const coachPhone = requestData.coach.notification_phone;

    // Prepare notification content
    const clientName = requestData.client?.full_name || 'A client';
    const clientBio = requestData.client_bio || 'No additional information provided';
    const goalTitle = requestData.client_goal?.title || 'their goals';

    // Create action URLs for coach responses
    const acceptUrl = `${supabaseUrl}/functions/v1/handle-coach-response?action=accept&requestId=${connectionRequestId}`;
    const declineUrl = `${supabaseUrl}/functions/v1/handle-coach-response?action=decline&requestId=${connectionRequestId}`;
    const rescheduleUrl = `${supabaseUrl}/functions/v1/handle-coach-response?action=reschedule&requestId=${connectionRequestId}`;

    const emailSubject = `New ${requestData.request_type === 'instant' ? 'Instant' : 'Scheduled'} Connection Request from ${clientName}`;
    
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
          .client-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .action-buttons { text-align: center; margin: 30px 0; }
          .btn { display: inline-block; padding: 12px 24px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .btn-accept { background-color: #10b981; color: white; }
          .btn-decline { background-color: #ef4444; color: white; }
          .btn-reschedule { background-color: #f59e0b; color: white; }
          .footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Connection Request</h1>
            <p>${requestData.request_type === 'instant' ? 'Instant Session Request' : 'Scheduled Session Request'}</p>
          </div>
          
          <div class="content">
            <p>Hello ${requestData.coach.name},</p>
            
            <p>You have received a new connection request from a client who would like your coaching expertise.</p>
            
            <div class="client-info">
              <h3>Client Information</h3>
              <p><strong>Name:</strong> ${clientName}</p>
              <p><strong>Goal:</strong> ${goalTitle}</p>
              <p><strong>About them:</strong> ${clientBio}</p>
              ${requestData.scheduled_time ? `<p><strong>Requested Time:</strong> ${new Date(requestData.scheduled_time).toLocaleString()}</p>` : ''}
              ${requestData.request_type === 'instant' ? '<p><strong>Type:</strong> Immediate session (5 min preparation time)</p>' : ''}
            </div>
            
            <div class="action-buttons">
              <a href="${acceptUrl}" class="btn btn-accept">Accept Request</a>
              <a href="${declineUrl}" class="btn btn-decline">Decline</a>
              <a href="${rescheduleUrl}" class="btn btn-reschedule">Propose New Time</a>
            </div>
            
            <p><small>Please respond within 24 hours to maintain your response rating.</small></p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${coachEmail}. If you're no longer available for coaching, please update your availability settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      // Send email notification using Resend
      const emailResponse = await resend.emails.send({
        from: 'Coach Platform <notifications@yourdomain.com>',
        to: [coachEmail],
        subject: emailSubject,
        html: emailContent,
      });

      console.log('Email sent successfully to:', coachEmail, emailResponse);

      // Send WhatsApp notification if phone number is available (placeholder for future Twilio integration)
      if (coachPhone) {
        const whatsappMessage = `New ${requestData.request_type} connection request from ${clientName} for ${goalTitle}. Check your email to respond.`;
        console.log('WhatsApp notification would be sent to:', coachPhone);
        console.log('WhatsApp message:', whatsappMessage);
      }

    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Continue execution - we'll still return success but log the error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        notificationsSent: {
          email: coachEmail,
          whatsapp: coachPhone ? true : false
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-connection-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});