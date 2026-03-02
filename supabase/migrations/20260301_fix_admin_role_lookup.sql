-- Re-assign admin role using email lookup instead of hardcoded UUID.
-- Safe to re-run: ON CONFLICT DO NOTHING prevents duplicates.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'joel@raxfinance.nl'
ON CONFLICT (user_id, role) DO NOTHING;
