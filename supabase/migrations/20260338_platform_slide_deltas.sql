-- Public RPC function for the Investor Portal to fetch platform slide deltas.
-- Uses SECURITY DEFINER so it's callable with the anon key (no auth needed).
-- Only returns aggregated numbers, no loan-level data.

CREATE OR REPLACE FUNCTION public.get_platform_deltas(anchor_date date DEFAULT '2026-01-07')
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    -- New loans originated after the anchor date (excludes Pipeline)
    'new_originated_count', (
      SELECT count(*)::int FROM loans
      WHERE loan_start_date > anchor_date
        AND (vehicle IS NULL OR vehicle != 'Pipeline')
    ),

    -- Total commitment of those new loans
    'new_originated_commitment', (
      SELECT coalesce(sum(total_commitment), 0) FROM loans
      WHERE loan_start_date > anchor_date
        AND (vehicle IS NULL OR vehicle != 'Pipeline')
    ),

    -- Commitment of pre-anchor loans that have since been repaid (subtract from active)
    'repaid_pre_anchor_commitment', (
      SELECT coalesce(sum(total_commitment), 0) FROM loans
      WHERE loan_start_date <= anchor_date
        AND status = 'repaid'
    ),

    -- New loans after anchor that are currently active (add to active)
    'new_active_commitment', (
      SELECT coalesce(sum(total_commitment), 0) FROM loans
      WHERE loan_start_date > anchor_date
        AND status = 'active'
        AND (vehicle IS NULL OR vehicle != 'Pipeline')
    ),

    -- Weighted rate * commitment for new loans (for blending into anchor avg)
    -- Note: interest_rate is stored as decimal (0.08 = 8%), multiply by 100 to match anchor percentages
    'new_weighted_rate_x_commitment', (
      SELECT coalesce(sum(total_commitment * interest_rate * 100), 0) FROM loans
      WHERE loan_start_date > anchor_date
        AND (vehicle IS NULL OR vehicle != 'Pipeline')
        AND interest_rate IS NOT NULL
        AND total_commitment > 0
    ),

    -- Weighted LTV * commitment for new loans (for blending into anchor avg)
    -- Note: ltv is stored as decimal (0.50 = 50%), multiply by 100 to match anchor percentages
    'new_weighted_ltv_x_commitment', (
      SELECT coalesce(sum(total_commitment * ltv * 100), 0) FROM loans
      WHERE loan_start_date > anchor_date
        AND (vehicle IS NULL OR vehicle != 'Pipeline')
        AND ltv IS NOT NULL
        AND total_commitment > 0
    ),

    -- Total commitment of new loans that have both rate and LTV (for denominator)
    'new_commitment_with_rate', (
      SELECT coalesce(sum(total_commitment), 0) FROM loans
      WHERE loan_start_date > anchor_date
        AND (vehicle IS NULL OR vehicle != 'Pipeline')
        AND interest_rate IS NOT NULL
        AND total_commitment > 0
    ),
    'new_commitment_with_ltv', (
      SELECT coalesce(sum(total_commitment), 0) FROM loans
      WHERE loan_start_date > anchor_date
        AND (vehicle IS NULL OR vehicle != 'Pipeline')
        AND ltv IS NOT NULL
        AND total_commitment > 0
    ),

    -- Count of any defaulted loans (for losses metric)
    'defaulted_count', (
      SELECT count(*)::int FROM loans
      WHERE status = 'defaulted'
    ),
    'defaulted_commitment', (
      SELECT coalesce(sum(total_commitment), 0) FROM loans
      WHERE status = 'defaulted'
    )
  );
$$;
