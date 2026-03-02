-- Add AFAS debtor account mapping to loans table
ALTER TABLE loans ADD COLUMN IF NOT EXISTS afas_debtor_account text;

-- Populate known debtor account mappings
UPDATE loans SET afas_debtor_account = CASE loan_id
  WHEN '484' THEN '10431'
  WHEN '493' THEN '10465'
  WHEN '504' THEN '10471'
  WHEN '505' THEN '10472'
  WHEN '507' THEN '10473'
  WHEN '509' THEN '10474'
  WHEN '510' THEN '10442'
  WHEN '511' THEN '10475'
  WHEN '512' THEN '10476'
  WHEN '513' THEN '513'
  WHEN '514' THEN '10477'
  WHEN '515' THEN '10435'
  WHEN '518' THEN '518'
  WHEN '520' THEN '520'
  WHEN '522' THEN '522'
  WHEN '526' THEN '526'
END
WHERE loan_id IN ('484','493','504','505','507','509','510','511','512','513','514','515','518','520','522','526');
