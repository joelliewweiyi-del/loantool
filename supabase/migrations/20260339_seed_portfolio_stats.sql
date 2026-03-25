-- Public RPC function for the Investor Portal to fetch seed portfolio stats.
-- Now reads from loan_portfolio_summary (event-ledger derived) instead of
-- raw loans table. effective_commitment, current_rate, ltv are all computed
-- from the event ledger — no stale denormalized columns.
--
-- Uses SECURITY DEFINER so it's callable with the anon key (no auth needed).

CREATE OR REPLACE FUNCTION public.get_seed_portfolio_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    -- Total commitment across ALL earmarked loans (any status)
    'total_commitment_all', (
      SELECT coalesce(sum(effective_commitment), 0)
      FROM loan_portfolio_summary
      WHERE earmarked = true
    ),

    -- Summary metrics (earmarked + active only)
    'active_count', (
      SELECT count(*)::int
      FROM loan_portfolio_summary
      WHERE earmarked = true AND loan_status = 'active'
    ),

    'total_commitment', (
      SELECT coalesce(sum(effective_commitment), 0)
      FROM loan_portfolio_summary
      WHERE earmarked = true AND loan_status = 'active'
    ),

    'total_outstanding', (
      SELECT coalesce(sum(outstanding), 0)
      FROM loan_portfolio_summary
      WHERE earmarked = true AND loan_status = 'active'
    ),

    'total_undrawn', (
      SELECT coalesce(sum(undrawn), 0)
      FROM loan_portfolio_summary
      WHERE earmarked = true AND loan_status = 'active'
    ),

    -- Weighted average LTV (already a decimal in the view, * 100 for percentage)
    'avg_ltv', (
      SELECT CASE
        WHEN sum(effective_commitment) > 0
        THEN round((sum(effective_commitment * ltv * 100) / sum(effective_commitment))::numeric, 1)
        ELSE 0
      END
      FROM loan_portfolio_summary
      WHERE earmarked = true AND loan_status = 'active'
        AND ltv IS NOT NULL AND effective_commitment > 0
    ),

    -- Weighted average interest rate (decimal → percentage)
    'avg_rate', (
      SELECT CASE
        WHEN sum(effective_commitment) > 0
        THEN round((sum(effective_commitment * current_rate * 100) / sum(effective_commitment))::numeric, 2)
        ELSE 0
      END
      FROM loan_portfolio_summary
      WHERE earmarked = true AND loan_status = 'active'
        AND current_rate IS NOT NULL AND effective_commitment > 0
    ),

    -- Weighted average duration in years (maturity_date - loan_start_date)
    'avg_duration_years', (
      SELECT CASE
        WHEN sum(effective_commitment) > 0
        THEN round((sum(effective_commitment * EXTRACT(EPOCH FROM (maturity_date::timestamp - loan_start_date::timestamp)) / 86400.0 / 365.25) / sum(effective_commitment))::numeric, 1)
        ELSE 0
      END
      FROM loan_portfolio_summary
      WHERE earmarked = true AND loan_status = 'active'
        AND maturity_date IS NOT NULL AND loan_start_date IS NOT NULL
        AND effective_commitment > 0
    ),

    -- Category breakdown for allocation bars
    'category_breakdown', (
      SELECT coalesce(json_agg(row_to_json(c)), '[]'::json)
      FROM (
        SELECT
          coalesce(category, 'Other') AS name,
          sum(effective_commitment) AS commitment,
          count(*)::int AS count
        FROM loan_portfolio_summary
        WHERE earmarked = true AND loan_status = 'active'
        GROUP BY coalesce(category, 'Other')
        ORDER BY sum(effective_commitment) DESC
      ) c
    ),

    -- City breakdown
    'city_breakdown', (
      SELECT coalesce(json_agg(row_to_json(g)), '[]'::json)
      FROM (
        SELECT
          coalesce(city, 'Unknown') AS city,
          sum(effective_commitment) AS commitment,
          count(*)::int AS count
        FROM loan_portfolio_summary
        WHERE earmarked = true AND loan_status = 'active'
          AND city IS NOT NULL
        GROUP BY city
        ORDER BY sum(effective_commitment) DESC
      ) g
    )
  );
$$;
