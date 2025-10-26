import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

// Convert string to int64 for pg_advisory_lock
function hashStringToInt64(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Ensure it's within PostgreSQL bigint range
  return Math.abs(hash) % 2147483647;
}

export async function withAdvisoryLock<T>(
  supabase: SupabaseClient,
  lockKey: string,
  operation: () => Promise<T>,
  timeoutMs = 10000
): Promise<T> {
  const lockId = hashStringToInt64(lockKey);
  
  const { data: acquired, error: lockError } = await supabase.rpc('pg_try_advisory_lock', { 
    lock_id: lockId 
  });
  
  if (lockError || !acquired) {
    throw new Error(`Could not acquire lock: ${lockKey}`);
  }
  
  try {
    return await operation();
  } finally {
    await supabase.rpc('pg_advisory_unlock', { lock_id: lockId });
  }
}
