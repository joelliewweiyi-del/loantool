-- WALT data upsert from loan tape (March 2026)
UPDATE loans SET walt = 8.3,  walt_comment = 'Multi tenant' WHERE loan_id = '507';
UPDATE loans SET walt = NULL, walt_comment = 'Indefinite. Multi tenant' WHERE loan_id = '511';
UPDATE loans SET walt = 5.7,  walt_comment = 'Single tenant' WHERE loan_id = '509';
UPDATE loans SET walt = 12.7, walt_comment = 'Single tenant' WHERE loan_id = '504';
UPDATE loans SET walt = 4.6,  walt_comment = NULL WHERE loan_id = '493';
UPDATE loans SET walt = 6.93, walt_comment = NULL WHERE loan_id = '520';
UPDATE loans SET walt = 5.01, walt_comment = 'Multi tenant' WHERE loan_id = '513';
UPDATE loans SET walt = 3.31, walt_comment = NULL WHERE loan_id = '518';
UPDATE loans SET walt = 1.8,  walt_comment = 'Multi tenant. WALT expected to extend' WHERE loan_id = '515';
UPDATE loans SET walt = 11.6, walt_comment = NULL WHERE loan_id = '516';
UPDATE loans SET walt = 2.1,  walt_comment = 'Tenant is expected to remain in place. Hotel permits in Amsterdam remain scarce and tightly regulated.' WHERE loan_id = '529';
