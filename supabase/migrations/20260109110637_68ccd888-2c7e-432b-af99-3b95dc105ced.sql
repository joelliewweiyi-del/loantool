-- Function to auto-capitalize PIK interest when period is approved
CREATE OR REPLACE FUNCTION public.auto_capitalize_pik_interest()
RETURNS TRIGGER AS $$
DECLARE
  loan_interest_type TEXT;
  period_interest_total NUMERIC;
  system_user_id UUID;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    
    -- Check if the loan is a PIK loan
    SELECT interest_type INTO loan_interest_type
    FROM public.loans
    WHERE id = NEW.loan_id;
    
    IF loan_interest_type = 'pik' THEN
      -- Calculate total interest accrued for this period
      SELECT COALESCE(SUM(daily_interest), 0) INTO period_interest_total
      FROM public.accrual_entries
      WHERE period_id = NEW.id
        AND is_pik = true;
      
      -- Only create event if there's interest to capitalize
      IF period_interest_total > 0 THEN
        -- Get the first user with a role to use as created_by (system action)
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
          period_interest_total,
          'approved',  -- Auto-approved since it's system-generated
          system_user_id,
          system_user_id,
          NOW(),
          false,
          true,
          jsonb_build_object(
            'period_id', NEW.id,
            'period_start', NEW.period_start,
            'period_end', NEW.period_end,
            'auto_generated', true
          )
        );
        
        RAISE NOTICE 'PIK capitalization posted for period % - amount: %', NEW.id, period_interest_total;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on periods table
DROP TRIGGER IF EXISTS trigger_auto_capitalize_pik ON public.periods;
CREATE TRIGGER trigger_auto_capitalize_pik
  AFTER UPDATE ON public.periods
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_capitalize_pik_interest();