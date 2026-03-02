-- Legacy address import from docs/Export - 2026-03-02T124545.463.xlsx
-- Generated: 2026-03-02
-- Updates borrower_address and property_address for 16 loans

BEGIN;

-- RAX493: Inproba Beheer BV
UPDATE loans SET
  borrower_address = 'Hermesweg 17, 3741GP Baarn',
  property_address = 'Hermesweg 17-19, Baarn'
WHERE loan_id = '493';

-- RAX509: Varod Street BV
UPDATE loans SET
  borrower_address = 'Wamberg 35V, 1083CW Amsterdam',
  property_address = 'Rosestraat 123, Rotterdam'
WHERE loan_id = '509';

-- RAX514: Knights Strategy BV
UPDATE loans SET
  borrower_address = 'Biesbosch 215, 1181 JC Amsterdam',
  property_address = 'Meeuwenlaan 92 en Spijkerkade 15, Amsterdam'
WHERE loan_id = '514';

-- RAX515: Galgenwaard Development BV
UPDATE loans SET
  borrower_address = 'Herculesplein 207A, 3588AA Utrecht',
  property_address = 'Herculesplein, Utrecht'
WHERE loan_id = '515';

-- RAX520: Castor Beheer BV
UPDATE loans SET
  borrower_address = 'Grevelingenmeer 9, 5347JP Oss',
  property_address = 'Vorstengrafdonk 4, Oss'
WHERE loan_id = '520';

-- RAX522: Solid Enghuizen BV
UPDATE loans SET
  borrower_address = 'Gabriël Metsustraat 2D, 1071 EA Amsterdam',
  property_address = 'Babberichseweg, Zevenaar'
WHERE loan_id = '522';

COMMIT;

-- Verify
SELECT loan_id, borrower_address, property_address
FROM loans
WHERE loan_id IN ('484', '493', '504', '505', '507', '509', '510', '511', '513', '514', '515', '518', '520', '522', '526', '527')
ORDER BY loan_id::int;
