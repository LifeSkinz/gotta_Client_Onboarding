import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';
import { CONFIG } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateInvitationEmailTemplate = (email: string, invitationToken: string) => {
  const onboardingUrl = `${CONFIG.WEBSITE_URL}/coach-onboard?token=${invitationToken}`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join Our Coaching Platform</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Our Coaching Platform</h1>
      <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Join our community of professional coaches</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px;">You're Invited to Join Our Platform!</h2>
      
      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        We're excited to invite you to join our coaching platform as a professional coach. Our platform connects clients with experienced coaches like you to help them achieve their goals.
      </p>

      <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px;">What You'll Get:</h3>
        <ul style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 8px;">Access to clients looking for your expertise</li>
          <li style="margin-bottom: 8px;">Flexible scheduling and session management</li>
          <li style="margin-bottom: 8px;">Professional video calling platform integration</li>
          <li style="margin-bottom: 8px;">Session notes and client progress tracking</li>
          <li style="margin-bottom: 8px;">Competitive rates and transparent pricing</li>
          <li style="margin-bottom: 8px;">Marketing support and profile visibility</li>
        </ul>
      </div>

      <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 15px 20px; margin: 20px 0;">
        <p style="color: #742a2a; font-size: 14px; margin: 0; font-weight: 500;">
          <strong>⏰ This invitation expires in 7 days</strong>
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${onboardingUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
          Complete Your Coach Profile
        </a>
      </div>

      <p style="color: #718096; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
        If the button doesn't work, you can copy and paste this link into your browser:<br>
        <a href="${onboardingUrl}" style="color: #667eea; word-break: break-all;">${onboardingUrl}</a>
      </p>

      <div style="border-top: 1px solid #e2e8f0; margin: 30px 0; padding-top: 20px;">
        <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">What You'll Need:</h3>
        <ul style="color: #4a5568; font-size: 14px; line-height: 1.5; margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 6px;">Professional bio and coaching experience</li>
          <li style="margin-bottom: 6px;">Your coaching specialties and expertise areas</li>
          <li style="margin-bottom: 6px;">Hourly rates and session preferences</li>
          <li style="margin-bottom: 6px;">Professional photo (optional but recommended)</li>
          <li style="margin-bottom: 6px;">Website and social media links</li>
          <li style="margin-bottom: 6px;">Availability and timezone information</li>
        </ul>
      </div>

      <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 20px 0 0 0;">
        If you have any questions about joining our platform, please don't hesitate to reach out to us at 
        <a href="mailto:${CONFIG.EMAIL.REPLY_TO}" style="color: #667eea;">${CONFIG.EMAIL.REPLY_TO}</a>
      </p>

      <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 20px 0 0 0;">
        We look forward to having you join our coaching community!
      </p>

      <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 20px 0 0 0;">
        Best regards,<br>
        The Coaching Platform Team
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0;">
        This invitation was sent to ${email}. If you didn't request this invitation, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, invitedBy } = await req.json();

    if (!email || !invitedBy) {
      return new Response(
        JSON.stringify({ error: 'Email and invitedBy are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if coach already exists
    const { data: existingCoach } = await supabase
      .from('coaches')
      .select('id, user_id')
      .eq('notification_email', email)
      .single();

    if (existingCoach?.user_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Coach with this email already has an account',
          coachId: existingCoach.id 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('coach_onboarding_invitations')
      .select('id, expires_at, used_at')
      .eq('email', email)
      .eq('used_at', null)
      .single();

    if (existingInvitation && new Date(existingInvitation.expires_at) > new Date()) {
      return new Response(
        JSON.stringify({ 
          error: 'Invitation already sent to this email',
          invitationId: existingInvitation.id 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Create or update invitation
    const invitationData = {
      email,
      invitation_token: invitationToken,
      invited_by: invitedBy,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      used_at: null,
      coach_id: existingCoach?.id || null
    };

    const { data: invitation, error: invitationError } = await supabase
      .from('coach_onboarding_invitations')
      .upsert(invitationData, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Send invitation email
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: CONFIG.EMAIL.FROM,
      to: email,
      subject: 'Join Our Coaching Platform - Invitation',
      html: generateInvitationEmailTemplate(email, invitationToken)
    });

    if (emailError) {
      console.error('Error sending invitation email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitationId: invitation.id,
        emailId: emailData?.id,
        expiresAt: invitation.expires_at
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-coach-invitation:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
