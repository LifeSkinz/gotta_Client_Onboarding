import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Get coach notification preferences
    const coachEmail = requestData.coach.notification_email || requestData.coach.name + '@example.com'; // Placeholder
    const coachPhone = requestData.coach.notification_phone;

    // Prepare notification content
    const clientName = requestData.client?.full_name || 'A client';
    const clientBio = requestData.client_bio || 'No bio provided';
    const goalTitle = requestData.client_goal?.title || 'their goals';

    const emailSubject = `New Connection Request from ${clientName}`;
    const emailContent = `
      <h2>New Connection Request</h2>
      <p><strong>Client:</strong> ${clientName}</p>
      <p><strong>Goal:</strong> ${goalTitle}</p>
      <p><strong>Bio:</strong> ${clientBio}</p>
      <p><strong>Request Type:</strong> ${requestData.request_type}</p>
      ${requestData.scheduled_time ? `<p><strong>Scheduled Time:</strong> ${requestData.scheduled_time}</p>` : ''}
      
      <div style="margin: 20px 0;">
        <a href="${supabaseUrl}/coach-portal/requests/${connectionRequestId}" 
           style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Accept Connection
        </a>
        <a href="${supabaseUrl}/coach-portal/requests/${connectionRequestId}?action=decline" 
           style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-left: 10px;">
          Decline
        </a>
      </div>
    `;

    // Send email notification (placeholder - would integrate with Resend)
    console.log('Sending email notification to:', coachEmail);
    console.log('Email content:', emailContent);

    // Send WhatsApp notification if phone number is available (placeholder - would integrate with Twilio)
    if (coachPhone) {
      const whatsappMessage = `New connection request from ${clientName} for ${goalTitle}. Check your coach portal to respond.`;
      console.log('Sending WhatsApp to:', coachPhone);
      console.log('WhatsApp message:', whatsappMessage);
    }

    // TODO: Implement actual email/WhatsApp sending with Resend/Twilio
    // For now, we'll just log the notifications

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