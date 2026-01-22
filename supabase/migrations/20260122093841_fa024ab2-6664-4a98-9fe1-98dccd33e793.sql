-- Create a SECURITY DEFINER function to insert founding events
-- This bypasses RLS to allow auto-approved founding events during loan creation
CREATE OR REPLACE FUNCTION public.create_founding_event(
  p_loan_id uuid,
  p_event_type event_type,
  p_effective_date date,
  p_amount numeric,
  p_rate numeric,
  p_created_by uuid,
  p_metadata jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  -- Verify the user has any role (PM, Controller, or Admin)
  IF NOT has_any_role(p_created_by) THEN
    RAISE EXCEPTION 'User does not have permission to create founding events';
  END IF;

  INSERT INTO loan_events (
    loan_id,
    event_type,
    effective_date,
    amount,
    rate,
    status,
    created_by,
    approved_by,
    approved_at,
    requires_approval,
    is_system_generated,
    metadata
  ) VALUES (
    p_loan_id,
    p_event_type,
    p_effective_date,
    p_amount,
    p_rate,
    'approved',
    p_created_by,
    p_created_by,
    NOW(),
    false,
    true,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('founding_event', true)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;