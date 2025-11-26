// Shared configuration for Supabase functions
export const CONFIG = {
  // Website URL - prefer explicit env var; fallback to localhost for local dev
  WEBSITE_URL: Deno.env.get('WEBSITE_URL') || Deno.env.get('VITE_WEBSITE_URL') || 'http://localhost:5173',
  
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

// Warn when WEBSITE_URL is using the default local fallback (helps prevent accidental redirects to preview domains)
if ((CONFIG.WEBSITE_URL || '').includes('lovableproject.com')) {
  console.warn('CONFIG.WEBSITE_URL is using the Lovable default. Set WEBSITE_URL in your function environment to avoid unintended redirects.');
} else if (CONFIG.WEBSITE_URL === 'http://localhost:5173') {
  console.warn('CONFIG.WEBSITE_URL is not set. Using http://localhost:5173 as a fallback for local development. Set WEBSITE_URL in production.');
}

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
