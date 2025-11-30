-- Reset failed emails so they can be retried with the correct from address
UPDATE email_outbox 
SET status = 'pending', attempts = 0, last_error = NULL 
WHERE status = 'failed';

-- Also reset any emails stuck in 'sending' state (likely from previous failures)
UPDATE email_outbox 
SET status = 'pending', attempts = 0, last_error = NULL 
WHERE status = 'sending' AND last_attempt_at < NOW() - INTERVAL '5 minutes';