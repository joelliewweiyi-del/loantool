-- Fix payment_amount for depot-split loans that were confirmed at full interest
-- instead of the cash portion only.
-- Multiplies payment_amount by (cash_interest_percentage / 100) for affected paid periods.
UPDATE periods p
SET payment_amount = p.payment_amount * (l.cash_interest_percentage / 100.0)
FROM loans l
WHERE p.loan_id = l.id
  AND l.cash_interest_percentage IS NOT NULL
  AND l.cash_interest_percentage < 100
  AND p.status = 'paid'
  AND p.payment_amount IS NOT NULL;
