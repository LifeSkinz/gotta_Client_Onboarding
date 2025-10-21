-- Migration: Coach Authentication & Role Management
-- This migration adds proper authentication and role management for coaches

-- 1. Add user_id to coaches table for authentication linking
ALTER TABLE coaches ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX idx_coaches_user_id ON coaches(user_id);

-- 2. Create user roles table for proper role management
CREATE TYPE app_role AS ENUM ('admin', 'coach', 'client');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Create indexes for performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(role) FROM user_roles WHERE user_id = _user_id
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage roles" ON user_roles
  FOR ALL USING (auth.role() = 'service_role');

-- 3. Create coach onboarding invitations table
CREATE TABLE coach_onboarding_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  invitation_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  coach_id UUID REFERENCES coaches(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_coach_invitations_email ON coach_onboarding_invitations(email);
CREATE INDEX idx_coach_invitations_token ON coach_onboarding_invitations(invitation_token);
CREATE INDEX idx_coach_invitations_expires ON coach_onboarding_invitations(expires_at);

-- Enable RLS
ALTER TABLE coach_onboarding_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for invitations
CREATE POLICY "Service role can manage invitations" ON coach_onboarding_invitations
  FOR ALL USING (auth.role() = 'service_role');

-- Allow public access to validate tokens (for onboarding page)
CREATE POLICY "Public can validate invitation tokens" ON coach_onboarding_invitations
  FOR SELECT USING (true);

-- 4. Update RLS policies on coaches table
DROP POLICY IF EXISTS "Coaches are viewable by everyone" ON coaches;
DROP POLICY IF EXISTS "Service role can manage coaches" ON coaches;

-- Coaches can update their own profile
CREATE POLICY "Coaches can update own profile" ON coaches
  FOR UPDATE USING (user_id = auth.uid());

-- Coaches can view their own full profile
CREATE POLICY "Coaches can view own profile" ON coaches
  FOR SELECT USING (user_id = auth.uid());

-- Public can view active coaches (for client booking)
CREATE POLICY "Public can view active coaches" ON coaches
  FOR SELECT USING (is_active = true);

-- Service role can manage all coaches
CREATE POLICY "Service role can manage coaches" ON coaches
  FOR ALL USING (auth.role() = 'service_role');

-- 5. Create function to assign coach role
CREATE OR REPLACE FUNCTION assign_coach_role(_user_id UUID, _coach_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert coach role
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'coach')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update coach record with user_id
  UPDATE coaches 
  SET user_id = _user_id
  WHERE id = _coach_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 6. Create function to validate invitation token
CREATE OR REPLACE FUNCTION validate_invitation_token(_token TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  email TEXT,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN ci.used_at IS NOT NULL THEN FALSE
      WHEN ci.expires_at < now() THEN FALSE
      ELSE TRUE
    END as is_valid,
    ci.email,
    ci.expires_at,
    ci.used_at
  FROM coach_onboarding_invitations ci
  WHERE ci.invitation_token = _token;
END;
$$;

-- 7. Create function to mark invitation as used
CREATE OR REPLACE FUNCTION mark_invitation_used(_token TEXT, _coach_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE coach_onboarding_invitations 
  SET used_at = now(), coach_id = _coach_id
  WHERE invitation_token = _token AND used_at IS NULL AND expires_at > now();
  
  RETURN FOUND;
END;
$$;

-- 8. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE ON coach_onboarding_invitations TO service_role;
GRANT SELECT ON coach_onboarding_invitations TO anon;
GRANT EXECUTE ON FUNCTION validate_invitation_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION assign_coach_role(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION mark_invitation_used(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated;
