-- Legacy address import from docs/Export - 2026-03-02T124545.463.xlsx
-- Generated: 2026-03-02
-- Updates borrower_address and property_address for 16 loans

BEGIN;

-- RAX484: Concordia House Vastgoed BV | Concordia House Exploitatie BV
UPDATE loans SET
  borrower_address = 'Oudenoord 330, 3513EX Utrecht',
  property_address = 'Oudenoord 330-340, Utrecht'
WHERE loan_id = '484';

-- RAX493: Inproba Beheer BV
UPDATE loans SET
  borrower_address = 'Hermesweg 17, 3741GP Baarn',
  property_address = 'Hermesweg 17-19, Baarn'
WHERE loan_id = '493';

-- RAX504: Median Investment BV | Pensmarkt Retail BV
UPDATE loans SET
  borrower_address = 'Ankersmidplein 2, 1506CK Zaandam',
  property_address = 'Pensmarkt 36-40, Den Bosch'
WHERE loan_id = '504';

-- RAX505: Prins Hendriksoord BV | Waterland Holding BV
UPDATE loans SET
  borrower_address = 'Newa 2, 1186KE Amstelveen',
  property_address = 'Soestdijkerweg 17 17A, Den Dolder'
WHERE loan_id = '505';

-- RAX507: Jorishof Ridderkerk BV en CV | Stg Beh Bew Jorishof Ridderke
UPDATE loans SET
  borrower_address = 'Hugo van der Goeslaan 4, 5613LG Eindhoven',
  property_address = 'Jorisplein 50-92, Ridderkerk'
WHERE loan_id = '507';

-- RAX509: Varod Street BV
UPDATE loans SET
  borrower_address = 'Wamberg 35V, 1083CW Amsterdam',
  property_address = 'Rosestraat 123, Rotterdam'
WHERE loan_id = '509';

-- RAX510: Schoutenwerf BV | Schoutenhaven BV
UPDATE loans SET
  borrower_address = 'Frederiksplein 1, 1017XK Amsterdam',
  property_address = 'Hellingstraat, Muiden'
WHERE loan_id = '510';

-- RAX511: Levasu BV | Exploitatiemaatschappij Levasu BV
UPDATE loans SET
  borrower_address = 'Silodam 101, 1013 AS Amsterdam'
WHERE loan_id = '511';

-- RAX513: Stichting Fort Sint Antonie | Fort Sint Antonie CV
UPDATE loans SET
  borrower_address = 'Achtseweg Zuid 161B, 5651GW Eindhoven',
  property_address = 'Vughterweg 47, Den Bosch'
WHERE loan_id = '513';

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

-- RAX518: Wieglia Beheer BV | DIAMANT OG BV
UPDATE loans SET
  borrower_address = 'De Lairessestraat 90, 1071PJ Amsterdam'
WHERE loan_id = '518';

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

-- RAX526: Waterside Beheerder BV | Waterside CV
UPDATE loans SET
  borrower_address = 'Pythagorasstraat 7-H, 1098ET Amsterdam'
WHERE loan_id = '526';

-- RAX527: PRST BV | PRSG BV
UPDATE loans SET
  borrower_address = 'De RIng 8, 5261LM Vught',
  property_address = 'Cromvoirtsedijk, Vught'
WHERE loan_id = '527';

COMMIT;

-- Verify
SELECT loan_id, borrower_address, property_address
FROM loans
WHERE loan_id IN ('484', '493', '504', '505', '507', '509', '510', '511', '513', '514', '515', '518', '520', '522', '526', '527')
ORDER BY loan_id::int;
