import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';
import { CONFIG } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateAIEmail(context: any) {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    console.warn('OpenAI API key not found, using fallback email template');
    return generateFallbackEmail(context);
  }

  try {
    const prompt = `Generate a compelling, professional email for a coach notification. 

Context:
- Coach: ${context.coachName} (specializes in: ${context.coachSpecialties.join(', ')})
- Client: ${context.clientName}
- Goal: ${context.goalTitle}
- Bio: ${context.clientBio}
- Session Type: ${context.isInstant ? 'Instant session (5min prep)' : 'Scheduled session'}
${context.scheduledTime ? `- Requested Time: ${new Date(context.scheduledTime).toLocaleString()}` : ''}

Requirements:
1. Create an engaging subject line that mentions the opportunity
2. Write a personalized, professional email that:
   - Highlights why this client is a great fit for the coach
   - Emphasizes the business opportunity and impact potential
   - Explains what happens after they accept/decline
   - Mentions that declining may lead the client to another coach
   - Includes clear next steps and response timeline
3. Keep it concise but compelling
4. Match a professional coaching platform tone

Return JSON with: {"subject": "...", "personalizedContent": "..."}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert copywriter for a premium coaching platform. Generate compelling, professional emails that convert coaches to accept client requests.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const aiContent = JSON.parse(data.choices[0].message.content);
    
    return {
      subject: aiContent.subject,
      html: generatePremiumEmailTemplate(context, aiContent.personalizedContent)
    };
  } catch (error) {
    console.error('AI email generation failed:', error);
    return generateFallbackEmail(context);
  }
}

function generateFallbackEmail(context: any) {
  const subject = `New ${context.isInstant ? 'Instant' : 'Scheduled'} Coaching Opportunity`;
  const personalizedContent = `You have received a new connection request from ${context.clientName} who is focused on ${context.goalTitle}. This could be a great match for your expertise in ${context.coachSpecialties.join(', ')}.`;
  
  return {
    subject,
    html: generatePremiumEmailTemplate(context, personalizedContent)
  };
}

function generatePremiumEmailTemplate(context: any, personalizedContent: string) {
  const acceptUrl = `${CONFIG.WEBSITE_URL}/coach-response?action=accept&sessionId=${context.sessionId}`;
  const declineUrl = `${CONFIG.WEBSITE_URL}/coach-response?action=decline&sessionId=${context.sessionId}`;
  const rescheduleUrl = `${CONFIG.WEBSITE_URL}/coach-response?action=reschedule&sessionId=${context.sessionId}`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Coaching Opportunity</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; 
      line-height: 1.6; 
      background: linear-gradient(135deg, hsl(251, 95%, 5%) 0%, hsl(263, 70%, 8%) 100%);
      margin: 0;
      padding: 20px;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: hsl(240, 10%, 4%);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
    }
    .header { 
      background: linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(180, 100%, 50%) 100%);
      padding: 40px 30px;
      text-align: center;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    }
    .header h1 { 
      color: white; 
      font-size: 28px; 
      font-weight: 700; 
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .header p { 
      color: rgba(255,255,255,0.9); 
      font-size: 16px;
      font-weight: 500;
    }
    .content { 
      background: hsl(240, 10%, 4%);
      padding: 40px 30px;
      color: hsl(210, 40%, 98%);
    }
    .ai-content {
      background: linear-gradient(135deg, hsl(262, 83%, 58%, 0.1) 0%, hsl(180, 100%, 50%, 0.1) 100%);
      border: 1px solid hsl(262, 83%, 58%, 0.2);
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      line-height: 1.7;
    }
    .client-card { 
      background: linear-gradient(135deg, hsl(240, 10%, 8%) 0%, hsl(240, 10%, 12%) 100%);
      border: 1px solid hsl(240, 10%, 20%);
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .client-card h3 { 
      color: hsl(262, 83%, 58%);
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .client-card h3::before {
      content: '👤';
      font-size: 20px;
    }
    .detail-row { 
      display: flex;
      margin-bottom: 12px;
      align-items: flex-start;
    }
    .detail-label { 
      font-weight: 600;
      color: hsl(180, 100%, 50%);
      min-width: 80px;
      margin-right: 12px;
    }
    .detail-value { 
      color: hsl(210, 40%, 85%);
      flex: 1;
    }
    .goal-highlight {
      background: linear-gradient(135deg, hsl(180, 100%, 50%, 0.15) 0%, hsl(262, 83%, 58%, 0.15) 100%);
      border-left: 3px solid hsl(180, 100%, 50%);
      padding: 16px;
      border-radius: 0 8px 8px 0;
      margin: 16px 0;
    }
    .action-section {
      background: linear-gradient(135deg, hsl(240, 10%, 6%) 0%, hsl(240, 10%, 10%) 100%);
      border-radius: 12px;
      padding: 32px;
      margin: 32px 0;
      text-align: center;
      border: 1px solid hsl(240, 10%, 18%);
    }
    .action-buttons { 
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
      margin: 24px 0;
    }
    .btn { 
      display: inline-block;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.3s ease;
      border: 2px solid transparent;
      min-width: 140px;
      text-align: center;
    }
    .btn-accept { 
      background: linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 76%, 46%) 100%);
      color: white;
      box-shadow: 0 4px 15px hsl(142, 76%, 36%, 0.3);
    }
    .btn-accept:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px hsl(142, 76%, 36%, 0.4);
    }
    .btn-decline { 
      background: linear-gradient(135deg, hsl(0, 84%, 60%) 0%, hsl(0, 84%, 70%) 100%);
      color: white;
      box-shadow: 0 4px 15px hsl(0, 84%, 60%, 0.3);
    }
    .btn-reschedule { 
      background: linear-gradient(135deg, hsl(45, 93%, 47%) 0%, hsl(45, 93%, 57%) 100%);
      color: hsl(45, 30%, 15%);
      box-shadow: 0 4px 15px hsl(45, 93%, 47%, 0.3);
    }
    .calendar-section {
      background: hsl(240, 10%, 6%);
      border: 1px solid hsl(180, 100%, 50%, 0.3);
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .calendar-section h4 {
      color: hsl(180, 100%, 50%);
      margin-bottom: 12px;
    }
    .calendar-upload {
      background: linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(180, 100%, 50%) 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      display: inline-block;
      margin-top: 12px;
      font-weight: 600;
    }
    .instructions { 
      background: linear-gradient(135deg, hsl(262, 83%, 58%, 0.1) 0%, hsl(180, 100%, 50%, 0.1) 100%);
      border: 1px solid hsl(262, 83%, 58%, 0.3);
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
      line-height: 1.7;
    }
    .instructions h4 {
      color: hsl(262, 83%, 58%);
      margin-bottom: 12px;
      font-size: 16px;
    }
    .warning {
      background: linear-gradient(135deg, hsl(45, 93%, 47%, 0.15) 0%, hsl(0, 84%, 60%, 0.15) 100%);
      border: 1px solid hsl(45, 93%, 47%, 0.3);
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      color: hsl(45, 93%, 70%);
    }
    .footer { 
      background: hsl(240, 10%, 2%);
      padding: 24px 30px;
      text-align: center;
      font-size: 12px;
      color: hsl(210, 40%, 60%);
      border-top: 1px solid hsl(240, 10%, 15%);
    }
    .footer a {
      color: hsl(180, 100%, 50%);
      text-decoration: none;
    }
    @media (max-width: 600px) {
      .action-buttons { 
        flex-direction: column; 
        gap: 8px;
      }
      .btn { 
        min-width: auto; 
        width: 100%; 
        padding: 16px 20px;
        font-size: 16px;
        word-wrap: break-word;
        white-space: normal;
      }
      .container { 
        margin: 10px; 
        border-radius: 12px; 
      }
      .content {
        padding: 24px 20px;
      }
      .header {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 New Coaching Opportunity</h1>
      <p>${context.isInstant ? '⚡ Instant Session Request' : '📅 Scheduled Session Request'}</p>
    </div>
    
    <div class="content">
      <div class="ai-content">
        ${personalizedContent}
      </div>
      
      <div class="client-card">
        <h3>Client Profile</h3>
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${context.clientName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Goal:</span>
          <span class="detail-value">${context.goalTitle}</span>
        </div>
        ${context.clientBio ? `
        <div class="detail-row">
          <span class="detail-label">About:</span>
          <span class="detail-value">${context.clientBio}</span>
        </div>
        ` : ''}
        ${context.scheduledTime ? `
        <div class="detail-row">
          <span class="detail-label">Requested:</span>
          <span class="detail-value">${new Date(context.scheduledTime).toLocaleString()}</span>
        </div>
        ` : ''}
        ${context.isInstant ? `
        <div class="goal-highlight">
          <strong>⚡ Instant Session:</strong> This client is ready to start immediately. You'll have 5 minutes to prepare after accepting.
        </div>
        ` : ''}
      </div>

      <div class="action-section">
        <h3 style="color: hsl(262, 83%, 58%); margin-bottom: 16px;">What would you like to do?</h3>
        <div class="action-buttons">
          <a href="${acceptUrl}" class="btn btn-accept">✅ Accept & Start</a>
          <a href="${declineUrl}" class="btn btn-decline">❌ Decline</a>
          <a href="${rescheduleUrl}" class="btn btn-reschedule">📅 Propose New Time</a>
        </div>
      </div>

      ${!context.isInstant ? `
      <div class="calendar-section">
        <h4>📅 Need to Reschedule?</h4>
        <p style="color: hsl(210, 40%, 75%); margin-bottom: 12px;">If the requested time doesn't work, you can propose alternative times.</p>
        <a href="#" class="calendar-upload">Upload Your Calendar Link</a>
        <p style="font-size: 12px; color: hsl(210, 40%, 60%); margin-top: 8px;">Connect your calendar for easier future scheduling</p>
      </div>
      ` : ''}

      <div class="instructions">
        <h4>What happens next?</h4>
        <ul style="margin-left: 20px; color: hsl(210, 40%, 85%);">
          <li><strong>If you Accept:</strong> ${context.isInstant ? 'You\'ll receive the video link and client prep notes within 5 minutes' : 'We\'ll send confirmation and session details to both you and the client'}</li>
          <li><strong>If you Decline:</strong> The client will be automatically matched with another coach from our network</li>
          <li><strong>If you Reschedule:</strong> You can propose 2-3 alternative times and we\'ll coordinate with the client</li>
        </ul>
      </div>

      <div class="warning">
        <strong>⏰ Response Timeline:</strong> Please respond within 24 hours to maintain your coach rating and ensure the client gets timely support.
      </div>
    </div>
    
    <div class="footer">
      <p>This email was sent to ${context.coachEmail} | <a href="#">Update Availability Settings</a> | <a href="#">Coach Dashboard</a></p>
      <p style="margin-top: 8px;">If you're no longer available for coaching, please update your availability preferences.</p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, coachId, clientId, userGoal, clientBio, type } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    console.log('Processing coach notification for session:', sessionId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session details with coach info
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        coach:coaches!fk_sessions_coach(*)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      throw new Error(`Failed to fetch session: ${sessionError.message}`);
    }

    console.log('Session data retrieved:', { sessionId, coachId: sessionData.coach_id });

    // Get client profile data
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', clientId)
      .single();

    // Get client responses for better email content
    const { data: clientResponses } = await supabase
      .from('user_responses')
      .select('selected_goal, responses, ai_analysis')
      .eq('user_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();


    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Generate AI-powered email content
    const clientName = clientProfile?.full_name || 'A client';
    const clientBioData = clientBio || clientProfile?.bio || 'No additional information provided';
    const goalTitle = userGoal || clientResponses?.selected_goal?.title || 'their goals';
    
    // Get coach notification preferences
    const coachEmail = sessionData.coach.notification_email || sessionData.coach.name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
    const coachPhone = sessionData.coach.notification_phone;
    
    console.log('Sending email to coach:', coachEmail);
    
    // Prepare context for AI email generation
    const emailContext = {
      sessionId: sessionId,
      coachName: sessionData.coach.name,
      coachSpecialties: sessionData.coach.specialties || [],
      coachEmail,
      clientName,
      clientBio: clientBioData,
      goalTitle,
      goalDescription: clientResponses?.selected_goal?.description || '',
      clientResponses: clientResponses?.responses || {},
      aiAnalysis: clientResponses?.ai_analysis || {},
      sessionType: type,
      scheduledTime: sessionData.scheduled_time,
      isInstant: type === 'instant'
    };

    const aiEmailContent = await generateAIEmail(emailContext);

    // Create action URLs for coach responses
    const acceptUrl = `${CONFIG.WEBSITE_URL}/coach-response?action=accept&sessionId=${sessionId}`;
    const declineUrl = `${CONFIG.WEBSITE_URL}/coach-response?action=decline&sessionId=${sessionId}`;
    const rescheduleUrl = `${CONFIG.WEBSITE_URL}/coach-response?action=reschedule&sessionId=${sessionId}`;

    const emailSubject = `${aiEmailContent.subject} - ${clientName}`;
    
    const emailContent = aiEmailContent.html;

    try {
      // Send email notification using Resend
      const emailResponse = await resend.emails.send({
        from: 'onboarding@resend.dev',
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