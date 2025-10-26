import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoachSignupRequest {
  name: string;
  email: string;
  phone?: string;
  experience: string;
  specialties: string[];
  message: string;
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

    const body: CoachSignupRequest = await req.json();

    // Validate input
    if (!body.name || !body.email || !body.experience || !body.specialties || !body.message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Insert application (will fail if email already exists due to UNIQUE constraint)
    const { data: application, error: insertError } = await supabase
      .from('pending_coach_applications')
      .insert({
        name: body.name,
        email: body.email,
        phone: body.phone,
        experience: body.experience,
        specialties: body.specialties,
        message: body.message,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        return new Response(
          JSON.stringify({ error: 'An application with this email already exists' }),
          { 
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      throw insertError;
    }

    // Send notification email to admin via outbox
    const obfuscatedEmail = body.email.replace(/(.{2}).*(@.*)/, '$1***$2');
    const dedupKey = `coach_application:${application.id}`;
    
    await supabase
      .from('email_outbox')
      .insert({
        dedup_key: dedupKey,
        template_name: 'coach_application_notification',
        recipient_email: 'eyeskinz@gmail.com',
        recipient_name: 'Admin',
        subject: `New Coach Application from ${body.name}`,
        payload: {
          html: `
            <h2>New Coach Application Received</h2>
            <p><strong>Name:</strong> ${body.name}</p>
            <p><strong>Email:</strong> ${body.email}</p>
            <p><strong>Phone:</strong> ${body.phone || 'Not provided'}</p>
            <p><strong>Experience:</strong> ${body.experience}</p>
            <p><strong>Specialties:</strong> ${body.specialties.join(', ')}</p>
            <p><strong>Message:</strong></p>
            <p>${body.message}</p>
            <p><a href="https://nqoysxjjimvihcvfpesr.supabase.co/dashboard/project/nqoysxjjimvihcvfpesr/editor">Review Application</a></p>
          `
        }
      });

    console.log(`✅ Coach application received from ${obfuscatedEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Application submitted successfully. We will review your application and get back to you soon.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Coach signup request error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
