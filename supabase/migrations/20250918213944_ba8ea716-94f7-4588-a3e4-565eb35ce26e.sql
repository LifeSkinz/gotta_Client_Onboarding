-- Update coach buffer times and add immediate availability fields
-- Reduce buffer times from 15 to 5 minutes for faster connections

-- Add new columns for immediate availability
ALTER TABLE public.coaches 
ADD COLUMN IF NOT EXISTS immediate_availability boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS response_preference_minutes integer DEFAULT 5;

-- Update existing coaches to have 5-minute buffer instead of 15
UPDATE public.coaches 
SET booking_buffer_minutes = 5 
WHERE booking_buffer_minutes = 15;

-- Set all coaches to allow immediate availability
UPDATE public.coaches 
SET immediate_availability = true,
    response_preference_minutes = 5;