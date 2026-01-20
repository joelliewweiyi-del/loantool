-- Create function to calculate live principal balance from events
CREATE OR REPLACE FUNCTION public.calculate_principal_balance(p_loan_id uuid, p_as_of_date date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(
    CASE 
      WHEN event_type = 'principal_draw' THEN amount
      WHEN event_type = 'principal_repayment' THEN -amount
      WHEN event_type = 'pik_capitalization_posted' THEN amount
      WHEN event_type = 'fee_invoice' AND metadata->>'fee_type' = 'pik' THEN amount
      ELSE 0
    END
  ), 0)
  FROM public.loan_events
  WHERE loan_id = p_loan_id
    AND status = 'approved'
    AND effective_date <= p_as_of_date
$$;

-- Create function to get balance for all loans (for list views)
CREATE OR REPLACE FUNCTION public.get_loan_balances(p_as_of_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(loan_id uuid, principal_balance numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    loan_id,
    COALESCE(SUM(
      CASE 
        WHEN event_type = 'principal_draw' THEN amount
        WHEN event_type = 'principal_repayment' THEN -amount
        WHEN event_type = 'pik_capitalization_posted' THEN amount
        WHEN event_type = 'fee_invoice' AND metadata->>'fee_type' = 'pik' THEN amount
        ELSE 0
      END
    ), 0) as principal_balance
  FROM public.loan_events
  WHERE status = 'approved'
    AND effective_date <= p_as_of_date
  GROUP BY loan_id
$$;