-- Drop and recreate the auto_capitalize_pik_interest function with correct 30/360 logic
-- This matches the frontend accruals calculation exactly

CREATE OR REPLACE FUNCTION public.auto_capitalize_pik_interest()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  loan_record RECORD;
  period_interest NUMERIC := 0;
  period_commitment_fee NUMERIC := 0;
  total_charge NUMERIC;
  system_user_id UUID;
  
  -- Segment tracking for interest calculation
  segment_start DATE;
  segment_principal NUMERIC;
  segment_rate NUMERIC;
  segment_days INTEGER;
  segment_interest NUMERIC;
  
  -- Segment tracking for commitment fee calculation
  cf_segment_start DATE;
  cf_segment_undrawn NUMERIC;
  cf_segment_days INTEGER;
  cf_segment_fee NUMERIC;
  
  event_record RECORD;
  prev_date DATE;
  commitment_fee_rate NUMERIC;
  total_commitment NUMERIC;
  current_principal NUMERIC;
  current_rate NUMERIC;
  current_undrawn NUMERIC;
BEGIN
  -- Only trigger when status changes to 'approved' or 'sent'
  IF NOT ((NEW.status IN ('approved', 'sent')) AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'sent'))) THEN
    RETURN NEW;
  END IF;
  
  -- Get loan details
  SELECT * INTO loan_record
  FROM public.loans
  WHERE id = NEW.loan_id;
  
  -- Only process PIK loans
  IF loan_record.interest_type != 'pik' THEN
    RETURN NEW;
  END IF;
  
  -- Check if PIK capitalization already exists for this period
  IF EXISTS (
    SELECT 1 FROM public.loan_events 
    WHERE loan_id = NEW.loan_id 
    AND event_type = 'pik_capitalization_posted'
    AND metadata->>'period_id' = NEW.id::text
    AND status = 'approved'
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Get commitment fee rate and total commitment from loan
  commitment_fee_rate := COALESCE(loan_record.commitment_fee_rate, 0);
  total_commitment := COALESCE(loan_record.total_commitment, 0);
  
  -- Get system user for created_by
  SELECT user_id INTO system_user_id
  FROM public.user_roles
  LIMIT 1;
  
  -- Calculate opening state (day before period start)
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN event_type = 'principal_draw' THEN amount
        WHEN event_type = 'principal_repayment' THEN -amount
        WHEN event_type = 'pik_capitalization_posted' THEN amount
        WHEN event_type = 'fee_invoice' AND metadata->>'fee_type' = 'pik' THEN amount
        ELSE 0
      END
    ), 0)
  INTO current_principal
  FROM public.loan_events
  WHERE loan_id = NEW.loan_id
    AND status = 'approved'
    AND effective_date < NEW.period_start;
  
  -- Get rate at period start
  SELECT rate INTO current_rate
  FROM public.loan_events
  WHERE loan_id = NEW.loan_id
    AND event_type IN ('interest_rate_set', 'interest_rate_change')
    AND status = 'approved'
    AND effective_date <= NEW.period_start
  ORDER BY effective_date DESC
  LIMIT 1;
  
  current_rate := COALESCE(current_rate, 0);
  current_undrawn := GREATEST(0, total_commitment - current_principal);
  
  -- Initialize segments
  segment_start := NEW.period_start;
  segment_principal := current_principal;
  segment_rate := current_rate;
  
  cf_segment_start := NEW.period_start;
  cf_segment_undrawn := current_undrawn;
  
  -- Process events within period that affect interest/commitment calculation
  FOR event_record IN
    SELECT * FROM public.loan_events
    WHERE loan_id = NEW.loan_id
      AND status = 'approved'
      AND effective_date > NEW.period_start
      AND effective_date <= NEW.period_end
      AND event_type IN ('principal_draw', 'principal_repayment', 'interest_rate_set', 
                         'interest_rate_change', 'pik_capitalization_posted', 
                         'commitment_set', 'commitment_change', 'commitment_cancel',
                         'fee_invoice')
    ORDER BY effective_date, created_at
  LOOP
    -- Close current interest segment (day before event)
    IF event_record.effective_date > segment_start THEN
      segment_days := (event_record.effective_date - segment_start);
      segment_interest := segment_principal * segment_rate * (segment_days::NUMERIC / 360);
      period_interest := period_interest + segment_interest;
    END IF;
    
    -- Close current commitment fee segment
    IF event_record.effective_date > cf_segment_start THEN
      cf_segment_days := (event_record.effective_date - cf_segment_start);
      cf_segment_fee := cf_segment_undrawn * commitment_fee_rate * (cf_segment_days::NUMERIC / 360);
      period_commitment_fee := period_commitment_fee + cf_segment_fee;
    END IF;
    
    -- Apply event to current state
    CASE event_record.event_type
      WHEN 'principal_draw' THEN
        current_principal := current_principal + COALESCE(event_record.amount, 0);
      WHEN 'principal_repayment' THEN
        current_principal := GREATEST(0, current_principal - COALESCE(event_record.amount, 0));
      WHEN 'interest_rate_set', 'interest_rate_change' THEN
        current_rate := COALESCE(event_record.rate, current_rate);
      WHEN 'pik_capitalization_posted' THEN
        current_principal := current_principal + COALESCE(event_record.amount, 0);
      WHEN 'fee_invoice' THEN
        IF event_record.metadata->>'fee_type' = 'pik' THEN
          current_principal := current_principal + COALESCE(event_record.amount, 0);
        END IF;
      WHEN 'commitment_set' THEN
        total_commitment := COALESCE(event_record.amount, 0);
      WHEN 'commitment_change' THEN
        total_commitment := total_commitment + COALESCE(event_record.amount, 0);
      WHEN 'commitment_cancel' THEN
        total_commitment := GREATEST(0, total_commitment - COALESCE(event_record.amount, 0));
      ELSE
        -- No change
    END CASE;
    
    current_undrawn := GREATEST(0, total_commitment - current_principal);
    
    -- Start new segments
    segment_start := event_record.effective_date;
    segment_principal := current_principal;
    segment_rate := current_rate;
    
    cf_segment_start := event_record.effective_date;
    cf_segment_undrawn := current_undrawn;
  END LOOP;
  
  -- Close final interest segment (through end of period, inclusive)
  segment_days := (NEW.period_end - segment_start) + 1;
  IF segment_days > 0 THEN
    segment_interest := segment_principal * segment_rate * (segment_days::NUMERIC / 360);
    period_interest := period_interest + segment_interest;
  END IF;
  
  -- Close final commitment fee segment
  cf_segment_days := (NEW.period_end - cf_segment_start) + 1;
  IF cf_segment_days > 0 THEN
    cf_segment_fee := cf_segment_undrawn * commitment_fee_rate * (cf_segment_days::NUMERIC / 360);
    period_commitment_fee := period_commitment_fee + cf_segment_fee;
  END IF;
  
  -- Total charge = interest + commitment fees
  total_charge := ROUND(period_interest + period_commitment_fee, 2);
  
  -- Only create event if there's something to capitalize
  IF total_charge > 0 THEN
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
      total_charge,
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
        'interest_accrued', ROUND(period_interest, 2),
        'commitment_fee_accrued', ROUND(period_commitment_fee, 2),
        'opening_principal', segment_principal - period_interest - period_commitment_fee,
        'closing_principal', current_principal + total_charge,
        'day_count_convention', '30/360',
        'auto_generated', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure trigger is attached to periods table
DROP TRIGGER IF EXISTS trigger_auto_capitalize_pik_interest ON public.periods;
CREATE TRIGGER trigger_auto_capitalize_pik_interest
  AFTER UPDATE ON public.periods
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_capitalize_pik_interest();