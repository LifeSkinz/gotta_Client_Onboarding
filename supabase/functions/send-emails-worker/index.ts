import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailOutboxRecord {
  id: string;
  dedup_key: string;
  template_name: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  payload: any;
  attempts: number;
  max_attempts: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Fetch pending emails (status='pending' or failed with attempts < max_attempts)
    // Note: We fetch both pending and failed-but-retryable emails, then filter in code
    const { data: emails, error: fetchError } = await supabase
      .from('email_outbox')
      .select('*')
      .or('status.eq.pending,status.eq.failed')
      .lte('scheduled_for', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(100);

    if (fetchError) throw fetchError;

    if (!emails || emails.length === 0) {
      console.log('No pending emails to process');
      
      // Cleanup old sent/cancelled emails (>7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('email_outbox')
        .delete()
        .in('status', ['sent', 'cancelled'])
        .lt('created_at', sevenDaysAgo);
      
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter to only process emails where attempts < max_attempts
    const eligibleEmails = (emails as EmailOutboxRecord[]).filter(email => 
      email.status === 'pending' || (email.status === 'failed' && email.attempts < email.max_attempts)
    );

    if (eligibleEmails.length === 0) {
      console.log('No eligible emails to process after filtering');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    let failedCount = 0;

    // Process each email
    for (const email of eligibleEmails) {
      try {
        // Mark as sending (atomic update to prevent duplicate processing)
        const { error: updateError } = await supabase
          .from('email_outbox')
          .update({ 
            status: 'sending',
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', email.id)
          .eq('status', email.attempts > 0 ? 'failed' : 'pending'); // Only update if still in expected state

        if (updateError) {
          console.error(`Failed to mark email ${email.id} as sending:`, updateError);
          continue;
        }

        // Send email via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Coaching Platform <onboarding@resend.dev>',
            to: [email.recipient_email],
            subject: email.subject,
            html: email.payload.html,
            ...(email.payload.react && { react: email.payload.react }),
            ...(email.payload.attachments && { attachments: email.payload.attachments }),
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Resend API error: ${response.status} - ${errorText}`);
        }

        // Mark as sent
        await supabase
          .from('email_outbox')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString(),
            last_error: null
          })
          .eq('id', email.id);

        processedCount++;
        console.log(`✅ Sent email ${email.id} to ${email.recipient_email.replace(/(.{2}).*(@.*)/, '$1***$2')}`);

      } catch (error: any) {
        failedCount++;
        const newAttempts = email.attempts + 1;
        const errorMessage = error.message || 'Unknown error';
        
        console.error(`❌ Failed to send email ${email.id}:`, errorMessage);

        // Update with failure
        await supabase
          .from('email_outbox')
          .update({ 
            status: newAttempts >= email.max_attempts ? 'failed' : 'pending',
            attempts: newAttempts,
            last_error: errorMessage,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', email.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        failed: failedCount,
        total: eligibleEmails.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Email worker error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
