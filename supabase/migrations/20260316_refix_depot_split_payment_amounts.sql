-- Fix payment_amount for loan 514 (depot-split, 50% cash).
-- This loan was created after migration 20260314 ran, so its confirmed
-- periods still have the full AFAS amount instead of the cash portion.
UPDATE periods p
SET payment_amount = p.payment_amount * (l.cash_interest_percentage / 100.0)
FROM loans l
WHERE p.loan_id = l.id
  AND l.loan_id LIKE '%514%'
  AND l.cash_interest_percentage IS NOT NULL
  AND l.cash_interest_percentage < 100
  AND p.status = 'paid'
  AND p.payment_amount IS NOT NULL;
