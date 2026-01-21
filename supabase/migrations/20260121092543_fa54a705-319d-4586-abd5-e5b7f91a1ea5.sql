-- Rename initial_outstanding to opening_outstanding to clarify this is the opening/starting balance
-- The running balance is calculated from events via calculate_principal_balance()
ALTER TABLE public.loans RENAME COLUMN initial_outstanding TO opening_outstanding;