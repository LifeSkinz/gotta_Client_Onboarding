export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  video: {
    dailyApiKey: process.env.DAILY_API_KEY,
    fallbackProvider: 'videosdk',
    maxRetries: 3,
    retryDelay: 1000,
    roomExpiry: 4 * 60 * 60 // 4 hours
  },
  security: {
    jwtSecret: process.env.JWT_SECRET!,
    encryptionKey: process.env.ENCRYPTION_KEY,
    rateLimits: {
      videoRoom: 100, // per minute
      sessionCreation: 50 // per minute
    }
  },
  session: {
    maxDuration: 4 * 60 * 60, // 4 hours
    joinWindowBefore: 5 * 60, // 5 minutes
    graceWindowAfter: 15 * 60, // 15 minutes
    recordingEnabled: true,
    transcriptionEnabled: true
  },
  monitoring: {
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    errorReporting: true,
    performanceMonitoring: true
  }
};