// Shared configuration for Supabase functions
export const CONFIG = {
  // Website URLs - Get from environment or use Lovable preview URL
  WEBSITE_URL: Deno.env.get('WEBSITE_URL') || 'https://4b7834f2-ec53-4d7f-b416-1d71f04d1c73.lovableproject.com',
  
  // Supabase URLs
  SUPABASE_URL: Deno.env.get('SUPABASE_URL')!,
  
  // Email configuration
  EMAIL: {
    FROM: 'Coaching Platform <onboarding@resend.dev>',
    REPLY_TO: Deno.env.get('SUPPORT_EMAIL') || 'support@coaching-platform.com',
  },
  
  // Daily.co configuration
  DAILY: {
    API_KEY: Deno.env.get('DAILY_API_KEY'),
    WEBHOOK_SECRET: Deno.env.get('DAILY_WEBHOOK_SECRET'),
  },
  
  // Session configuration
  SESSION: {
    JOIN_WINDOW_MINUTES: 5, // Can join 5 minutes before scheduled time
    GRACE_WINDOW_MINUTES: 15, // Grace period after scheduled end time
  }
};

// Helper function to get coach response URL
export function getCoachResponseUrl(action: string, sessionId: string): string {
  return `${CONFIG.WEBSITE_URL}/coach-response?action=${action}&sessionId=${sessionId}`;
}

// Helper function to get session portal URL
export function getSessionPortalUrl(sessionId: string): string {
  return `${CONFIG.WEBSITE_URL}/session-portal/${sessionId}`;
}

// Helper function to get coach session landing URL
export function getCoachSessionLandingUrl(sessionId: string): string {
  return `${CONFIG.WEBSITE_URL}/coach-session/${sessionId}`;
}
