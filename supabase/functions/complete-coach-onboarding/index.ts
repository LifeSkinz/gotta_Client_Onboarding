import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OnboardingRequest {
  token: string;
  password: string;
  name: string;
  title?: string;
  bio?: string;
  specialties?: string[];
  hourlyRate?: number;
  notificationEmail?: string;
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

    const body: OnboardingRequest = await req.json();

    if (!body.token || !body.password || !body.name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate invitation token
    const { data: validation, error: validationError } = await supabase
      .rpc('validate_invitation_token', { _token: body.token });

    if (validationError || !validation || validation.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid invitation token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const invitation = validation[0];

    if (!invitation.is_valid) {
      if (invitation.used_at) {
        return new Response(
          JSON.stringify({ error: 'This invitation has already been used' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (new Date(invitation.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'This invitation has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Invalid invitation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = invitation.email;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true, // Auto-confirm for faster onboarding
      user_metadata: {
        full_name: body.name
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return new Response(
          JSON.stringify({ error: 'An account with this email already exists. Please sign in instead.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw authError;
    }

    const userId = authData.user.id;

    // Find or create coach record
    let coachId: string | null = null;

    // Priority 1: Check if invitation already has a coach_id
    const { data: invitationData } = await supabase
      .from('coach_onboarding_invitations')
      .select('coach_id')
      .eq('invitation_token', body.token)
      .single();

    if (invitationData?.coach_id) {
      coachId = invitationData.coach_id;
    }

    // Priority 2: Find existing coach by notification_email
    if (!coachId) {
      const { data: existingCoach } = await supabase
        .from('coaches')
        .select('id')
        .eq('notification_email', email)
        .is('user_id', null)
        .single();

      if (existingCoach) {
        coachId = existingCoach.id;
      }
    }

    // Priority 3: Create new coach record
    if (!coachId) {
      const { data: newCoach, error: coachError } = await supabase
        .from('coaches')
        .insert({
          user_id: userId,
          name: body.name,
          title: body.title || 'Life Coach',
          bio: body.bio || '',
          specialties: body.specialties || [],
          hourly_rate: body.hourlyRate || 100,
          notification_email: body.notificationEmail || email,
          is_active: true
        })
        .select()
        .single();

      if (coachError) throw coachError;
      coachId = newCoach.id;
    } else {
      // Update existing coach record
      await supabase
        .from('coaches')
        .update({
          user_id: userId,
          name: body.name,
          title: body.title,
          bio: body.bio,
          specialties: body.specialties,
          hourly_rate: body.hourlyRate,
          notification_email: body.notificationEmail || email,
          is_active: true
        })
        .eq('id', coachId);
    }

    // Assign coach role
    await supabase.rpc('assign_coach_role', {
      _user_id: userId,
      _coach_id: coachId
    });

    // Mark invitation as used
    await supabase.rpc('mark_invitation_used', {
      _token: body.token,
      _coach_id: coachId
    });

    // Send welcome email via outbox
    const dedupKey = `coach_welcome:${userId}`;
    await supabase
      .from('email_outbox')
      .insert({
        dedup_key: dedupKey,
        template_name: 'coach_welcome',
        recipient_email: email,
        recipient_name: body.name,
        subject: 'Welcome to AI Life Coach!',
        payload: {
          html: `
            <h2>Welcome, ${body.name}!</h2>
            <p>Your coach account has been successfully created.</p>
            <p>You can now sign in and start managing your coaching sessions.</p>
            <p><a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://app.aicoach.com'}/auth">Sign In</a></p>
          `
        }
      });

    console.log(`✅ Coach onboarding completed for ${email.replace(/(.{2}).*(@.*)/, '$1***$2')}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        coachId,
        userId,
        message: 'Onboarding completed successfully!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Coach onboarding error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
