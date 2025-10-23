-- Secure table_sizes view - restrict to service_role only
-- This prevents unauthorized access to database metadata

-- Revoke all public access
REVOKE ALL ON public.table_sizes FROM PUBLIC;

-- Grant SELECT to service_role only
GRANT SELECT ON public.table_sizes TO service_role;

-- Optional: Transfer ownership from postgres to service_role for least privilege
-- ALTER VIEW public.table_sizes OWNER TO service_role;

COMMENT ON VIEW public.table_sizes IS 'Database table size metrics - restricted to service_role only for internal monitoring';