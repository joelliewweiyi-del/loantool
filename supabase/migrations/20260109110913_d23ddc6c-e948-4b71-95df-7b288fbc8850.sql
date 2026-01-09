-- Update the trigger to calculate interest from events directly (not accrual_entries)
CREATE OR REPLACE FUNCTION public.auto_capitalize_pik_interest()
RETURNS TRIGGER AS $$
DECLARE
  loan_interest_type TEXT;
  period_interest_total NUMERIC;
  system_user_id UUID;
  period_days INTEGER;
  avg_principal NUMERIC;
  avg_rate NUMERIC;
BEGIN
  -- Only trigger when status changes to 'approved' or 'sent'
  IF (NEW.status IN ('approved', 'sent')) AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'sent')) THEN
    
    -- Check if the loan is a PIK loan
    SELECT interest_type INTO loan_interest_type
    FROM public.loans
    WHERE id = NEW.loan_id;
    
    IF loan_interest_type = 'pik' THEN
      -- Check if PIK capitalization already exists for this period
      IF EXISTS (
        SELECT 1 FROM public.loan_events 
        WHERE loan_id = NEW.loan_id 
        AND event_type = 'pik_capitalization_posted'
        AND metadata->>'period_id' = NEW.id::text
      ) THEN
        RETURN NEW;
      END IF;
      
      -- Calculate days in period
      period_days := (NEW.period_end - NEW.period_start) + 1;
      
      -- Get principal balance at period start (sum of draws minus repayments before period start)
      SELECT COALESCE(
        (SELECT SUM(CASE WHEN event_type = 'principal_draw' THEN amount 
                        WHEN event_type = 'principal_repayment' THEN -amount
                        WHEN event_type = 'pik_capitalization_posted' THEN amount
                        ELSE 0 END)
         FROM public.loan_events
         WHERE loan_id = NEW.loan_id
         AND status = 'approved'
         AND effective_date < NEW.period_start), 0
      ) INTO avg_principal;
      
      -- Get rate at period start
      SELECT rate INTO avg_rate
      FROM public.loan_events
      WHERE loan_id = NEW.loan_id
      AND event_type IN ('interest_rate_set', 'interest_rate_change')
      AND status = 'approved'
      AND effective_date <= NEW.period_start
      ORDER BY effective_date DESC
      LIMIT 1;
      
      -- If no rate found, try getting rate from any point before period end
      IF avg_rate IS NULL THEN
        SELECT rate INTO avg_rate
        FROM public.loan_events
        WHERE loan_id = NEW.loan_id
        AND event_type IN ('interest_rate_set', 'interest_rate_change')
        AND status = 'approved'
        AND effective_date <= NEW.period_end
        ORDER BY effective_date DESC
        LIMIT 1;
      END IF;
      
      -- Calculate interest: principal * rate * (days/365)
      IF avg_principal > 0 AND avg_rate IS NOT NULL AND avg_rate > 0 THEN
        period_interest_total := avg_principal * avg_rate * (period_days::numeric / 365);
        
        -- Get the first user with a role to use as created_by
        SELECT user_id INTO system_user_id
        FROM public.user_roles
        LIMIT 1;
        
        -- Create the PIK capitalization event
        INSERT INTO public.loan_events (
          loan_id,
          event_type,
          effective_date,
          amount,
          status,
          created_by,
          approved_by,
          approved_at,
          requires_approval,
          is_system_generated,
          metadata
        ) VALUES (
          NEW.loan_id,
          'pik_capitalization_posted',
          NEW.period_end,
          ROUND(period_interest_total, 2),
          'approved',
          system_user_id,
          system_user_id,
          NOW(),
          false,
          true,
          jsonb_build_object(
            'period_id', NEW.id,
            'period_start', NEW.period_start,
            'period_end', NEW.period_end,
            'principal_used', avg_principal,
            'rate_used', avg_rate,
            'days', period_days,
            'auto_generated', true
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_auto_capitalize_pik ON public.periods;
CREATE TRIGGER trigger_auto_capitalize_pik
  AFTER UPDATE ON public.periods
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_capitalize_pik_interest();