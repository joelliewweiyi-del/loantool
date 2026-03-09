ALTER TABLE loans ADD COLUMN IF NOT EXISTS original_vehicle text;

UPDATE loans SET original_vehicle = 'TLFOKT25' WHERE loan_id = '484';
UPDATE loans SET original_vehicle = 'TLFSEP25' WHERE loan_id = '493';
UPDATE loans SET original_vehicle = 'TLFOKT25' WHERE loan_id = '504';
UPDATE loans SET original_vehicle = 'TLFSEP25' WHERE loan_id = '505';
UPDATE loans SET original_vehicle = 'TLFOKT25' WHERE loan_id = '507';
UPDATE loans SET original_vehicle = 'TLFOKT25' WHERE loan_id = '509';
UPDATE loans SET original_vehicle = 'TLFOKT25' WHERE loan_id = '510';
UPDATE loans SET original_vehicle = 'TLFNOV25A' WHERE loan_id = '511';
UPDATE loans SET original_vehicle = 'TLFDECC' WHERE loan_id = '513';
UPDATE loans SET original_vehicle = 'TLFNOV25B' WHERE loan_id = '514';
UPDATE loans SET original_vehicle = 'RED III' WHERE loan_id = '515';
UPDATE loans SET original_vehicle = 'TLFJANA' WHERE loan_id = '518';
UPDATE loans SET original_vehicle = 'TLFDECA' WHERE loan_id = '520';
UPDATE loans SET original_vehicle = 'RED IV' WHERE loan_id = '522';
