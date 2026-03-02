-- Add remaining loan tape fields + import data from Excel files
-- Generated: 2026-03-02
-- Source: docs/Loan tape RED IV 01-02-26.xlsx + docs/Loan tape RED IV 23-02-26 v2.xlsx

-- Schema changes (initial_facility and red_iv_start_date)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS initial_facility text;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS red_iv_start_date date;

-- Data import: Updates metadata fields for 18 loans matching on loan_id
-- Fields updated: city, property_status, remarks, category, earmarked,
--   initial_facility, red_iv_start_date, rental_income, valuation,
--   valuation_date, ltv, maturity_date, loan_start_date

BEGIN;

-- Loan 484: Utrecht
UPDATE loans SET
  city = 'Utrecht',
  property_status = 'Redevelopment',
  remarks = 'Construction financing of a former office asset into hotel and short-stay apartments. Fully permitted',
  category = 'Hotel',
  earmarked = FALSE,
  initial_facility = 'TLFOKT25',
  red_iv_start_date = '2025-01-01',
  rental_income = NULL,
  valuation = 39300000,
  valuation_date = '2025-03-25',
  ltv = 0.6361,
  maturity_date = '2027-11-01',
  loan_start_date = '2025-12-01'
WHERE loan_id = '484';

-- Loan 493: Baarn
UPDATE loans SET
  city = 'Baarn',
  property_status = 'Leased',
  remarks = 'Owner-occupied asset. Borrower is a portco of a large PE firm',
  category = 'Light Industrial',
  earmarked = TRUE,
  initial_facility = 'TLFSEP25',
  red_iv_start_date = '2025-01-01',
  rental_income = 900000,
  valuation = 12250000,
  valuation_date = '2025-07-01',
  ltv = 0.6122,
  maturity_date = '2028-10-01',
  loan_start_date = '2025-11-01'
WHERE loan_id = '493';

-- Loan 504: Den Bosch
UPDATE loans SET
  city = 'Den Bosch',
  property_status = 'Leased',
  remarks = 'Prime retail property with strong tenant (HEMA)',
  category = 'Retail',
  earmarked = TRUE,
  initial_facility = 'TLFOKT25',
  red_iv_start_date = '2025-01-01',
  rental_income = 780100,
  valuation = 10670000,
  valuation_date = '2025-07-21',
  ltv = 0.656,
  maturity_date = '2028-10-15',
  loan_start_date = '2025-11-01'
WHERE loan_id = '504';

-- Loan 505: Den Dolder
UPDATE loans SET
  city = 'Den Dolder',
  property_status = 'Redevelopment',
  remarks = 'Purchase of monumental land estate for redevelopment',
  category = 'Residential',
  earmarked = FALSE,
  initial_facility = 'TLFSEP25',
  red_iv_start_date = '2025-01-01',
  rental_income = NULL,
  valuation = 3800000,
  valuation_date = '2025-09-01',
  ltv = 0.6579,
  maturity_date = '2026-09-10',
  loan_start_date = '2025-10-01'
WHERE loan_id = '505';

-- Loan 507: Ridderkerk
UPDATE loans SET
  city = 'Ridderkerk',
  property_status = 'Leased',
  remarks = 'Existing shopping center on ground floor; Refurbishment of vacant upper floors into care apartments',
  category = 'Retail',
  earmarked = TRUE,
  initial_facility = 'TLFOKT25',
  red_iv_start_date = '2025-01-01',
  rental_income = 1369000,
  valuation = 20460000,
  valuation_date = '2025-06-12',
  ltv = 0.3177,
  maturity_date = '2027-04-01',
  loan_start_date = '2025-11-01'
WHERE loan_id = '507';

-- Loan 509: Rotterdam
UPDATE loans SET
  city = 'Rotterdam',
  property_status = 'Leased',
  remarks = 'Leased asset to a medical centre.  Possible future redevelopment',
  category = 'Mixed',
  earmarked = TRUE,
  initial_facility = 'TLFOKT25',
  red_iv_start_date = '2025-01-01',
  rental_income = 160000,
  valuation = 2200000,
  valuation_date = '2024-08-01',
  ltv = 0.6818,
  maturity_date = '2027-04-09',
  loan_start_date = '2025-11-01'
WHERE loan_id = '509';

-- Loan 510: Muiden
UPDATE loans SET
  city = 'Muiden',
  property_status = 'Development',
  remarks = 'Top-up construction facility for completion of apartment complex',
  category = 'Residential',
  earmarked = FALSE,
  initial_facility = 'TLFOKT25',
  red_iv_start_date = '2025-01-01',
  rental_income = NULL,
  valuation = 8000000,
  valuation_date = '2025-10-01',
  ltv = 0.3375,
  maturity_date = '2026-12-31',
  loan_start_date = '2025-10-01'
WHERE loan_id = '510';

-- Loan 511: Amsterdam
UPDATE loans SET
  city = 'Amsterdam',
  property_status = 'Leased',
  remarks = 'Short term Bridge finance of leased resi units in Amsterdam',
  category = 'Residential',
  earmarked = TRUE,
  initial_facility = 'TLFNOV25A',
  red_iv_start_date = '2025-01-01',
  rental_income = 124000,
  valuation = 5138480,
  valuation_date = '2025-10-01',
  ltv = 0.4865,
  maturity_date = '2026-04-30',
  loan_start_date = '2025-11-01'
WHERE loan_id = '511';

-- Loan 512: Amsterdam
UPDATE loans SET
  city = 'Amsterdam',
  property_status = 'Leased',
  remarks = 'Leased office in Amsterdam',
  category = 'Office',
  earmarked = TRUE,
  initial_facility = NULL,
  red_iv_start_date = NULL,
  rental_income = 167000,
  valuation = 2250000,
  valuation_date = '2025-10-01',
  ltv = 0.4333,
  maturity_date = '2026-10-29',
  loan_start_date = '2025-10-29'
WHERE loan_id = '512';

-- Loan 513: Den Bosch
UPDATE loans SET
  city = 'Den Bosch',
  property_status = 'Leased',
  remarks = 'Leased,  office asset - multi tenants',
  category = 'Office',
  earmarked = TRUE,
  initial_facility = 'TLFDECC',
  red_iv_start_date = '2025-01-01',
  rental_income = 1230000,
  valuation = 13800000,
  valuation_date = '2025-10-21',
  ltv = 0.5978,
  maturity_date = '2028-12-18',
  loan_start_date = '2026-01-01'
WHERE loan_id = '513';

-- Loan 514: Amsterdam
UPDATE loans SET
  city = 'Amsterdam',
  property_status = 'Leased',
  remarks = 'Resi asset with plan to split into smaller units and sale',
  category = 'Residential',
  earmarked = FALSE,
  initial_facility = 'TLFNOV25B',
  red_iv_start_date = '2025-01-01',
  rental_income = 47000,
  valuation = 960000,
  valuation_date = '2025-09-02',
  ltv = 0.7292,
  maturity_date = '2027-04-30',
  loan_start_date = '2025-11-01'
WHERE loan_id = '514';

-- Loan 515: Utrecht
UPDATE loans SET
  city = 'Utrecht',
  property_status = 'Leased',
  remarks = 'Multi tenant offices. Possible long term redevelopment potential',
  category = 'Office',
  earmarked = TRUE,
  initial_facility = 'RED III',
  red_iv_start_date = '2025-02-01',
  rental_income = 2150000,
  valuation = 20050000,
  valuation_date = '2023-11-01',
  ltv = 0.5985,
  maturity_date = '2028-12-27',
  loan_start_date = '2026-02-01'
WHERE loan_id = '515';

-- Loan 516: Geldermalsen / Kapelle
UPDATE loans SET
  city = 'Geldermalsen / Kapelle',
  property_status = 'Leased',
  remarks = 'Refinancing of income producing logistics portfolio',
  category = 'Light Industrial',
  earmarked = TRUE,
  initial_facility = NULL,
  red_iv_start_date = NULL,
  rental_income = 4400000,
  valuation = 52500000,
  valuation_date = NULL,
  ltv = 0.5143,
  maturity_date = '2028-03-01',
  loan_start_date = '2025-03-01'
WHERE loan_id = '516';

-- Loan 518: Amsterdam / Almere / Amersfoort
UPDATE loans SET
  city = 'Amsterdam / Almere / Amersfoort',
  property_status = 'Leased',
  remarks = 'Portfolio of residential, commercial and office assets',
  category = 'Mixed',
  earmarked = TRUE,
  initial_facility = 'TLFJANA',
  red_iv_start_date = NULL,
  rental_income = 867000,
  valuation = 14580000,
  valuation_date = '2026-01-01',
  ltv = 0.3429,
  maturity_date = '2026-07-12',
  loan_start_date = '2026-02-01'
WHERE loan_id = '518';

-- Loan 520: Oss
UPDATE loans SET
  city = 'Oss',
  property_status = 'Leased',
  remarks = 'Partially owner-occupied modern industrial property',
  category = 'Light Industrial',
  earmarked = TRUE,
  initial_facility = 'TLFDECA',
  red_iv_start_date = '2025-02-01',
  rental_income = 1500000,
  valuation = 23500000,
  valuation_date = '2025-10-23',
  ltv = 0.3404,
  maturity_date = '2028-12-19',
  loan_start_date = '2026-01-01'
WHERE loan_id = '520';

-- Loan 522: Zevenaar
UPDATE loans SET
  city = 'Zevenaar',
  property_status = 'Development',
  remarks = 'Fully permitted land for residential development',
  category = 'Residential',
  earmarked = FALSE,
  initial_facility = 'RED IV',
  red_iv_start_date = NULL,
  rental_income = NULL,
  valuation = 10000000,
  valuation_date = '2026-01-01',
  ltv = 0.3,
  maturity_date = '2027-07-21',
  loan_start_date = '2026-02-01'
WHERE loan_id = '522';

-- Loan 526: Rotterdam
UPDATE loans SET
  city = 'Rotterdam',
  property_status = 'Redevelopment',
  remarks = 'Fully permitted land for residential development. Apartment pre-sale started',
  category = 'Land',
  earmarked = FALSE,
  initial_facility = NULL,
  red_iv_start_date = NULL,
  rental_income = NULL,
  valuation = 9500000,
  valuation_date = '2026-02-01',
  ltv = 0.4421,
  maturity_date = '2026-08-17',
  loan_start_date = '2026-02-17'
WHERE loan_id = '526';

-- Loan 527: Vught
UPDATE loans SET
  city = 'Vught',
  property_status = 'Redevelopment',
  remarks = 'Land for residential developmenet',
  category = 'Land',
  earmarked = FALSE,
  initial_facility = NULL,
  red_iv_start_date = NULL,
  rental_income = NULL,
  valuation = 4000000,
  valuation_date = '2026-02-01',
  ltv = 0.625,
  maturity_date = '2027-01-01',
  loan_start_date = '2026-02-01'
WHERE loan_id = '527';

COMMIT;

-- Verify
SELECT loan_id, city, property_status, category, earmarked, initial_facility, red_iv_start_date,
       rental_income, valuation, valuation_date, ltv
FROM loans
WHERE loan_id IN ('484', '493', '504', '505', '507', '509', '510', '511', '512', '513', '514', '515', '516', '518', '520', '522', '526', '527')
ORDER BY loan_id::int;
