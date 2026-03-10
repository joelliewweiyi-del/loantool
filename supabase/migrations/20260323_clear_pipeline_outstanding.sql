-- Clear outstanding for loan 536 (Pipeline loan should not have outstanding)
UPDATE loans SET outstanding = NULL WHERE loan_id = '536';
