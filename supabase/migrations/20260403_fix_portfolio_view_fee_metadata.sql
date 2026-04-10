-- Fix: fee_invoice events were checking metadata->>'fee_type' but the actual key
-- is metadata->>'payment_type'. Withheld fees (payment_type = 'pik') should be
-- counted as part of outstanding principal.

CREATE OR REPLACE VIEW public.loan_portfolio_summary AS
WITH event_balances AS (
  SELECT
    e.loan_id,
    COALESCE(SUM(CASE
      WHEN e.event_type = 'principal_draw' THEN e.amount
      WHEN e.event_type = 'principal_repayment' THEN -e.amount
      WHEN e.event_type = 'pik_capitalization_posted' THEN e.amount
      WHEN e.event_type = 'fee_invoice' AND e.metadata->>'payment_type' = 'pik' THEN e.amount
      ELSE 0
    END), 0) AS outstanding,
    (
      SELECT CASE
        WHEN sub.event_type = 'commitment_cancel' THEN 0
        ELSE sub.amount
      END
      FROM public.loan_events sub
      WHERE sub.loan_id = e.loan_id
        AND sub.status = 'approved'
        AND sub.event_type IN ('commitment_set', 'commitment_change', 'commitment_cancel')
      ORDER BY sub.effective_date DESC, sub.created_at DESC
      LIMIT 1
    ) AS commitment_from_events,
    (
      SELECT sub.amount
      FROM public.loan_events sub
      WHERE sub.loan_id = e.loan_id
        AND sub.status = 'approved'
        AND sub.event_type IN ('interest_rate_set', 'interest_rate_change')
      ORDER BY sub.effective_date DESC, sub.created_at DESC
      LIMIT 1
    ) AS rate_from_events
  FROM public.loan_events e
  WHERE e.status = 'approved'
  GROUP BY e.loan_id
),
computed AS (
  SELECT
    l.id,
    l.loan_id,
    l.borrower_name,
    l.vehicle,
    l.facility,
    l.status        AS loan_status,
    l.interest_type,
    l.maturity_date,
    l.loan_start_date,
    l.valuation,
    l.rental_income,
    l.city,
    l.category,
    l.earmarked,
    l.remarks,
    COALESCE(eb.outstanding, 0)                       AS outstanding,
    COALESCE(eb.commitment_from_events, l.total_commitment, 0) AS raw_commitment,
    COALESCE(eb.rate_from_events, l.interest_rate, 0) AS current_rate,
    COALESCE(eb.outstanding, 0)                       AS _outstanding_for_calc
  FROM public.loans l
  LEFT JOIN event_balances eb ON eb.loan_id = l.id
)
SELECT
  c.id,
  c.loan_id,
  c.borrower_name,
  c.vehicle,
  c.facility,
  c.loan_status,
  c.interest_type,
  c.maturity_date,
  c.loan_start_date,
  c.valuation,
  c.rental_income,
  c.city,
  c.category,
  c.earmarked,
  c.remarks,
  c.outstanding,
  c.current_rate,
  GREATEST(c.raw_commitment, c.outstanding)           AS effective_commitment,
  CASE
    WHEN c.raw_commitment > c.outstanding THEN c.raw_commitment - c.outstanding
    ELSE 0
  END                                                 AS undrawn,
  CASE
    WHEN c.valuation > 0
    THEN ROUND(GREATEST(c.raw_commitment, c.outstanding) / c.valuation, 4)
    ELSE NULL
  END                                                 AS ltv,
  CURRENT_DATE                                        AS as_of_date
FROM computed c;

GRANT SELECT ON public.loan_portfolio_summary TO authenticated;
