-- Loan 514 has NULL total_commitment, causing the export to fall back to
-- outstanding (385000) as commitment. Correct value is 700000.
UPDATE loans SET total_commitment = 700000 WHERE loan_id LIKE '%514%';
