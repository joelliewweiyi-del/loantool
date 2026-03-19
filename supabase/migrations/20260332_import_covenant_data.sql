-- Covenant data import from "Afspraken Kredietbrief.xlsx"
-- Generated: 2026-03-18
-- Source: docs/Afspraken Kredietbrief.xlsx (7 sheets)
--
-- This migration inserts loan_covenants and covenant_submissions rows.
-- Loans are matched by loan_id (text). Rows where the loan doesn't exist
-- are skipped via WHERE ... IS NOT NULL guards.

BEGIN;

-- Clean up any partial data from previous failed attempt
DELETE FROM covenant_submissions;
DELETE FROM loan_covenants;

-- Drop the unique index that causes conflicts (a loan can have multiple covenants of the same type)
DROP INDEX IF EXISTS idx_covenant_submissions_unique;
CREATE INDEX IF NOT EXISTS idx_covenant_submissions_covenant_period
  ON public.covenant_submissions(covenant_id, period_label);

-- RAX415RED (Polderstaete BV): Valuation 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '415'), 'valuation', 'annually', 'Na twee jaar startdatum', 2025, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '415') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-02-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '415') AND c.covenant_type = 'valuation' AND c.tracking_year = 2025;

-- RAX415RED (Polderstaete BV): Rent Roll 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '415'), 'rent_roll', 'quarterly', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '415') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2025', '2025-03-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '415') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2025', '2025-06-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '415') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2025', '2025-09-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '415') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', '2025-12-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '415') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;

-- RAX415RED (Polderstaete BV): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '415'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '415') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2025-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '415') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX415RED (Polderstaete BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '415'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '415') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '415') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX420RED (Bahl Vastgoed BV): Valuation 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '420'), 'valuation', 'annually', 'Ieder jaar', 2025, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '420') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2024-08-17', 'received', 'Martijn', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '420') AND c.covenant_type = 'valuation' AND c.tracking_year = 2025;

-- RAX420RED (Bahl Vastgoed BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '420'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '420') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '420') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX423RED (Two Lanes BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '423'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '423') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '423') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX426RED (JeLo Vastgoed BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '426'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '426') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '426') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX427RED (Galgenwaard Development BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '427'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '427') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '427') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX430RED (Steenvlinder Zelfbouw 17 BV): Valuation 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '430'), 'valuation', 'annually', 'Ieder jaar', 2025, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '430') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-03-17', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '430') AND c.covenant_type = 'valuation' AND c.tracking_year = 2025;

-- RAX430RED (Steenvlinder Zelfbouw 17 BV): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '430'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '430') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2025-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '430') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX430RED (Steenvlinder Zelfbouw 17 BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '430'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '430') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '430') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX431RED (Exploitatiemaatschappij Family Beef BV): Valuation 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '431'), 'valuation', 'annually', 'Ieder jaar', 2025, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '431') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-26', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '431') AND c.covenant_type = 'valuation' AND c.tracking_year = 2025;

-- RAX431RED (Exploitatiemaatschappij Family Beef BV): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '431'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '431') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2025-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '431') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX431RED (Exploitatiemaatschappij Family Beef BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '431'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '431') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '431') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX436RED (Mercatum Gravitax BV): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '436'), 'annual_accounts', 'annually', 'Binnen 240 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '436') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2025-09-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '436') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX436RED (Mercatum Gravitax BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '436'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '436') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '436') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX439RED (Beleggingsmaatschappij Zomerstad BV): Rent Roll 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '439'), 'rent_roll', 'quarterly', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '439') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2025', '2025-03-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '439') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2025', '2025-06-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '439') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2025', '2025-09-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '439') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', '2025-12-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '439') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;

-- RAX439RED (Beleggingsmaatschappij Zomerstad BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '439'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '439') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '439') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX440RED (MRP SDK BV): Valuation 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '440'), 'valuation', 'annually', 'Ieder jaar', 2025, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '440') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-18', 'requested', NULL, 'Opvragen', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '440') AND c.covenant_type = 'valuation' AND c.tracking_year = 2025;

-- RAX440RED (MRP SDK BV): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '440'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '440') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2025-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '440') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX440RED (MRP SDK BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '440'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '440') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '440') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX449RED (Alblasserdam Yachtbuilding Construction B.V.): Valuation 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '449'), 'valuation', 'annually', 'Ieder jaar', 2025, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '449') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-05-12', 'requested', NULL, 'Opvragen (BriQ / update vorige taxatie)', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'valuation' AND c.tracking_year = 2025;

-- RAX449RED (Alblasserdam Yachtbuilding Construction B.V.): Rent Roll 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '449'), 'rent_roll', 'quarterly', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '449') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2025', '2025-03-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2025', '2025-06-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2025', '2025-09-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', '2025-12-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;

-- RAX449RED (Alblasserdam Yachtbuilding Construction B.V.): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '449'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '449') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2025-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX449RED (Alblasserdam Yachtbuilding Construction B.V.): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '449'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '449') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX456RED (Veronese Vastgoed BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '456'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '456') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '456') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX459RED (Necron Development III BVFlevokust Distribution Center BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '459'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '459') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '459') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX458DOV (ABC Plantontwikkeling BV / Sluisbuurt): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '458'), 'annual_accounts', 'annually', 'Binnen 365 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '458') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2025-12-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '458') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX460RED (Ridderduin Investments BV): Rent Roll 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '460'), 'rent_roll', 'quarterly', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '460') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2025', '2025-03-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2025', '2025-06-17', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2025', '2025-09-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', '2025-12-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;

-- RAX460RED (Ridderduin Investments BV): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '460'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '460') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2025-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX460RED (Ridderduin Investments BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '460'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '460') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX462RED (Necron Development III BVFlevokust Distribution Center BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '462'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '462') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '462') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX465DOV (Blakeburg BV / Holding): Valuation 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '465'), 'valuation', 'custom', 'Na 18 maanden closing', 2025, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '465') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2026-08-14', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '465') AND c.covenant_type = 'valuation' AND c.tracking_year = 2025;

-- RAX465DOV (Blakeburg BV / Holding): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '465'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '465') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2025-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '465') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX471RED (Solidiam NV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '471'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '471') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '471') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX473RED (Hotel De Vigilante Vastgoed BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '473'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '473') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '473') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX474RED (De heer F.J. Botman): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '474'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '474') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '474') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX475RED (Lekkerkerker O/G Benschop BV): Valuation 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '475'), 'valuation', 'custom', 'Uiterlijk op 1 juni 2025', 2025, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '475') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-05-18', 'requested', NULL, 'Opvragen!!!', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '475') AND c.covenant_type = 'valuation' AND c.tracking_year = 2025;

-- RAX475RED (Lekkerkerker O/G Benschop BV): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '475'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '475') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2025-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '475') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX475RED (Lekkerkerker O/G Benschop BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '475'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '475') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '475') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX476RED (De Jong en Zonen BV): Rent Roll 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '476'), 'rent_roll', 'quarterly', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '476') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2025', '2025-03-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '476') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2025', '2025-06-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '476') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2025', '2025-09-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '476') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', '2025-12-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '476') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;

-- RAX476RED (De Jong en Zonen BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '476'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '476') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '476') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX477RED (Zooverheid BV): Insurance 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '477'), 'insurance', 'annually', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '477') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2025-01-02', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '477') AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;

-- RAX486RED (FMC Amsterdam BV (AWC)): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '486'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '486') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2026-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '486') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX487RED (IntoSpace 4 BV / Holding): Valuation 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '487'), 'valuation', 'custom', 'Uiterlijk op 01-05-2026', 2025, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '487') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2026-04-15', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '487') AND c.covenant_type = 'valuation' AND c.tracking_year = 2025;

-- RAX487RED (IntoSpace 4 BV / Holding): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '487'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '487') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2026-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '487') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX488RED (IntoSpace 19 BV / IntoSpace 39 BV): Valuation 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '488'), 'valuation', 'custom', 'Uiterlijk op 01-05-2026', 2025, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '488') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2026-04-15', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'valuation' AND c.tracking_year = 2025;

-- RAX488RED (IntoSpace 19 BV / IntoSpace 39 BV): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '488'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '488') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2026-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX490RED (Weerdje 1 BV / Senior Living Holding BV): Rent Roll 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '490'), 'rent_roll', 'quarterly', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '490') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2025', '2025-03-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2025', '2025-06-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2025', '2025-09-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', '2025-12-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;

-- RAX490RED (Weerdje 1 BV / Senior Living Holding BV): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '490'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '490') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2026-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX491RED (MWPO Holding BV / Basecamp One BV): Rent Roll 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '491'), 'rent_roll', 'quarterly', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '491') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2025', '2025-03-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2025', '2025-06-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2025', '2025-09-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', '2025-12-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;

-- RAX491RED (MWPO Holding BV / Basecamp One BV): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '491'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '491') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2026-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX492RED (VOL Bouwprojecten BV): Valuation 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '492'), 'valuation', 'annually', 'Ieder jaar', 2025, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '492') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2025', NULL, '2026-06-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'valuation' AND c.tracking_year = 2025;

-- RAX492RED (VOL Bouwprojecten BV): Rent Roll 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '492'), 'rent_roll', 'quarterly', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '492') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2025', '2025-03-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2025', '2025-06-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2025', '2025-09-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', '2025-12-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;

-- RAX492RED (VOL Bouwprojecten BV): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '492'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '492') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2026-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;

-- RAX495RED (Share Garages BV (Bert de Niet)): Rent Roll 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '495'), 'rent_roll', 'quarterly', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '495') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2025', '2025-03-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2025', '2025-06-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2025', '2025-09-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', '2025-12-17', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;

-- RAX495RED (Share Garages BV (Bert de Niet)): Annual Accounts 2025
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '495'), 'annual_accounts', 'annually', 'Binnen 180 dagen na einde boekjaar', 2025, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '495') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2026-07-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;


-- ════════════════════════════════════════
-- Taxaties 2026
-- ════════════════════════════════════════

-- RAX484REDIV (HERMON Heritage Holding BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '484'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '484') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '484') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX517REDIV (Polderstaete BV (Cruquius)): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '517'), 'valuation', 'annually', 'Na twee jaar na startdatum', NULL, NULL, NULL, 2026, 'Na twee jaar na startdatum — Taxatie na twee jaar startdatum ontvangen', '{"opmerking":"Taxatie na twee jaar startdatum ontvangen"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '517') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, 'Taxatie na twee jaar startdatum ontvangen', '{"opmerking":"Taxatie na twee jaar startdatum ontvangen"}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '517') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX420RED (Bahl Vastgoed BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '420'), 'valuation', 'annually', 'Ieder jaar', NULL, NULL, NULL, 2026, 'Ieder jaar — Ontvangen - zie map', '{"opmerking":"Ontvangen - zie map"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '420') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, 'Ontvangen - zie map', '{"opmerking":"Ontvangen - zie map"}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '420') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX423RED (Two Lanes BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '423'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '423') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '423') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX427RED (Galgenwaard Development BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '427'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '427') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '427') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX431RED (Exploitatiemaatschappij Family Beef BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '431'), 'valuation', 'annually', 'Ieder jaar', NULL, NULL, NULL, 2026, 'Ieder jaar — Ontvangen; nog discussie met taxateur', '{"opmerking":"Ontvangen; nog discussie met taxateur"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '431') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2026-03-01', 'pending', NULL, 'Ontvangen; nog discussie met taxateur', '{"opmerking":"Ontvangen; nog discussie met taxateur"}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '431') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX435RED (W.H. Koster): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '435'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '435') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '435') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX436RED (Mercatum Gravitax BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '436'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '436') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '436') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX440RED (MRP SDK BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '440'), 'valuation', 'annually', 'Ieder jaar', NULL, NULL, NULL, 2026, 'Ieder jaar', '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '440') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2027-01-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '440') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX444RED (Leusden Holdings B.V.): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '444'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '444') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '444') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX510RED (Schoutenwerf BV / Schoutenhaven BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '510'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '510') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '510') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX449RED (Alblasserdam Yachtbuilding Construction B.V.): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '449'), 'valuation', 'annually', 'Ieder jaar', 0.55, 'lte', 'ltv', 2026, 'Ieder jaar — Mark van Rutten komt er op terug.', '{"opmerking":"Mark van Rutten komt er op terug."}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '449') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2027-05-12', 'received', NULL, 'Mark van Rutten komt er op terug.', '{"opmerking":"Mark van Rutten komt er op terug."}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX450RED (By the River BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '450'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '450') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '450') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX452RED (IHS Prime Retail I BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '452'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '452') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '452') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX455RED (D.I. (Daniel) Investments B.V.): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '455'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '455') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '455') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX456RED (Veronese Vastgoed BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '456'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '456') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '456') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX458DOV (ABC Plantontwikkeling BV / Sluisbuurt): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '458'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '458') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '458') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX460RED (Ridderduin Investments BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '460'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '460') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX464RED (Van der Wiel Vastgoed 2 BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '464'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '464') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '464') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX465DOV (Blakeburg BV / Holding): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '465'), 'valuation', 'custom', 'Na 18 maanden closing', NULL, NULL, NULL, 2026, 'Na 18 maanden closing', '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '465') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2026-06-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '465') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX472RED (Kess Corporation NV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '472'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '472') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '472') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX474RED (De heer F.J. Botman): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '474'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '474') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '474') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX475RED (Lekkerkerker O/G Benschop BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '475'), 'valuation', 'custom', 'Uiterlijk op 1 juni 2025', NULL, NULL, NULL, 2026, 'Uiterlijk op 1 juni 2025 — Ontvangen; nog discussie met taxateur', '{"opmerking":"Ontvangen; nog discussie met taxateur"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '475') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2025-04-01', 'received', NULL, 'Ontvangen; nog discussie met taxateur', '{"opmerking":"Ontvangen; nog discussie met taxateur"}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '475') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX478DOV (J. Drechsel): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '478'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '478') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '478') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX479RED (Vught): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '479'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '479') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '479') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX486RED (FMC Amsterdam BV (AWC)): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '486'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '486') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '486') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX487RED (IntoSpace 4 BV / Holding): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '487'), 'valuation', 'custom', 'Uiterlijk op 01-05-2026', NULL, NULL, NULL, 2026, 'Uiterlijk op 01-05-2026', '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '487') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2026-03-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '487') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX488RED (IntoSpace 19 BV / IntoSpace 39 BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '488'), 'valuation', 'custom', 'Uiterlijk op 01-05-2026', NULL, NULL, NULL, 2026, 'Uiterlijk op 01-05-2026', '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '488') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2026-03-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX490RED (Weerdje 1 BV / Senior Living Holding BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '490'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '490') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX491RED (MWPO Holding BV / Basecamp One BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '491'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '491') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX492RED (VOL Bouwprojecten BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '492'), 'valuation', 'annually', 'Ieder jaar', NULL, NULL, NULL, 2026, 'Ieder jaar — Moet getaxeerd zijn voor 13-06-2026', '{"opmerking":"Moet getaxeerd zijn voor 13-06-2026"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '492') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2026-04-13', 'pending', NULL, 'Moet getaxeerd zijn voor 13-06-2026', '{"opmerking":"Moet getaxeerd zijn voor 13-06-2026"}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX495RED (Share Garages BV (Bert de Niet)): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '495'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '495') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX496RED (ABC Plantontwikkeling BV / Arnhem station): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '496'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '496') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '496') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX498RED (Beverwijk Warande / Bert de Niet): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '498'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '498') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '498') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX500RED (Van Tiggelen / Amsterdam): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '500'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '500') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '500') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX501RED (Van Suijdam / Bantammertammerstraat): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '501'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '501') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '501') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX505REDIV (Feike / Den Dolder): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '505'), 'valuation', 'annually', 'Ieder jaar', NULL, NULL, NULL, 2026, 'Ieder jaar', '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '505') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2026-07-11', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '505') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX504REDIV (Tastan / HEMA): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '504'), 'valuation', 'annually', 'Na twee jaar na startdatum', NULL, NULL, NULL, 2026, 'Na twee jaar na startdatum', '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '504') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2027-08-15', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '504') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX493REDIV (Inproba / Baarn): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '493'), 'valuation', 'annually', 'Ieder jaar', NULL, NULL, NULL, 2026, 'Ieder jaar', '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '493') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2026-08-06', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX510REDIV (ERED / Schoutenwerf): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '510'), 'valuation', NULL, NULL, NULL, NULL, NULL, 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '510') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', NULL, 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '510') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX513REDIV (Kragt Groep / Vughterweg): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '513'), 'valuation', 'annually', 'Ieder jaar', NULL, NULL, NULL, 2026, 'Ieder jaar', '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '513') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2026-10-18', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '513') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX515REDIV (Galgenwaard Development BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '515'), 'valuation', 'custom', 'Uiterlijk op 1 juli 2027', NULL, NULL, NULL, 2026, 'Uiterlijk op 1 juli 2027', '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '515') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2027-05-01', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '515') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;

-- RAX520REDIV (Veghel / Castor Beheer BV): Valuation 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '520'), 'valuation', 'annually', 'Ieder jaar', NULL, NULL, NULL, 2026, 'Ieder jaar', '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '520') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', '2026-10-19', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '520') AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;


-- ════════════════════════════════════════
-- Polis 2026
-- ════════════════════════════════════════

-- 423 (Two Lanes BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '423'), 'insurance', 'annually', 2026, NULL, '{"email":"Selmon@kesscorporation.com","locatie":"Amsterdam Duivendrecht","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '423') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '423') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 431 (Exploitatiemaatschappij Family Beef BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '431'), 'insurance', 'annually', 2026, NULL, '{"email":"hans.hogeslag@familybeef.nl; wouter.kaptijn@familybeef.nl","locatie":"Epe","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '431') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '431') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 435 (W.H. Koster): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '435'), 'insurance', 'annually', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '435') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '435') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 436 (Mercatum Gravitax BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '436'), 'insurance', 'annually', 2026, 'Reminder op 04-03-2026', '{"email":"rogerkenbeek@gmail.com","locatie":"Amsterdam","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '436') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, 'Reminder op 04-03-2026', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '436') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 440 (MRP SDK BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '440'), 'insurance', 'annually', 2026, 'Loopt af op 01-08-2026', '{"locatie":"Amsterdam","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '440') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'not_applicable', NULL, 'CAR', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '440') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 444 (Leusden Holdings B.V.): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '444'), 'insurance', 'annually', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '444') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '444') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 449 (Alblasserdam Yachtbuilding Construction B.V.): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '449'), 'insurance', 'annually', 2026, NULL, '{"email":"Leon.Blokland@oceanco.nl","locatie":"Zwijndrecht","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '449') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 450 (By the River BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '450'), 'insurance', 'annually', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '450') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '450') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 452 / 466 (IHS Prime Retail I BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '452'), 'insurance', 'annually', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '452') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '452') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 452 / 466 (IHS Prime Retail I BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '466'), 'insurance', 'annually', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '466') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '466') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 455 (D.I. (Daniel) Investments B.V.): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '455'), 'insurance', 'annually', 2026, NULL, '{"email":"Martin@etm2004.com","locatie":"Utrecht","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '455') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '455') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 456 (Veronese Vastgoed BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '456'), 'insurance', 'annually', 2026, NULL, '{"email":"jerry@geldhof.nl","locatie":"Amsterdam","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '456') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '456') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 460 (Ridderduin Investments BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '460'), 'insurance', 'annually', 2026, NULL, '{"locatie":"Zwolle","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '460') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'not_applicable', NULL, 'Wordt afgelost', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 464 (Van der Wiel Vastgoed 2 BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '464'), 'insurance', 'annually', 2026, 'Afschrift betaling ontvangen (voldoende?)', '{"email":"m.verhoeven@vanderwielbouw.nl; a.vanderwiel@vanderwielbouw.nl","locatie":"Noordwijk","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '464') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, 'Afschrift betaling ontvangen (voldoende?)', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '464') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 466 / 452 (IHS Prime Retail I BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '466'), 'insurance', 'annually', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '466') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '466') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 466 / 452 (IHS Prime Retail I BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '452'), 'insurance', 'annually', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '452') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '452') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 472 (Kess Corporation NV / Two Lanes): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '472'), 'insurance', 'annually', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '472') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '472') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 475 (Lekkerkerker O/G Benschop BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '475'), 'insurance', 'annually', 2026, NULL, '{"email":"R.Brand@lekkerkerker.nl","locatie":"Lopik","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '475') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '475') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 479 (PRST BV / Van de Ven): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '479'), 'insurance', 'annually', 2026, 'Nodig?', '{"locatie":"Vught","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '479') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'not_applicable', NULL, 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '479') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 482 (Necron): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '482'), 'insurance', 'annually', 2026, 'Grond', '{"email":"leemborg@necron.com","locatie":"Aalsmeer","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '482') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'not_applicable', NULL, 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '482') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 484 (Hermon / Oudenoord): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '484'), 'insurance', 'annually', 2026, 'CAR; einddatum 01-05-2027', '{"email":"fmaertens@hermonheritage.nl","locatie":"Utrecht","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '484') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, 'CAR; einddatum 01-05-2027', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '484') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 486 (FMC Amsterdam BV (AWC)): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '486'), 'insurance', 'annually', 2026, NULL, '{"locatie":"Amsterdam","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '486') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'not_applicable', NULL, 'Wordt afgelost', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '486') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 487 (IntoSpace 4 BV / Holding): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '487'), 'insurance', 'annually', 2026, NULL, '{"email":"joeri.schellekens@intospace.eu","locatie":"Zoetermeer","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '487') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '487') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 488B (IntoSpace 19 BV / IntoSpace 39 BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '488'), 'insurance', 'annually', 2026, 'Grond', '{"locatie":"Lelystad","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '488') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'not_applicable', NULL, 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 488 (IntoSpace 19 BV / IntoSpace 39 BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '488'), 'insurance', 'annually', 2026, 'Grond', '{"locatie":"Lelystad","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '488') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'not_applicable', NULL, 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 490 (Weerdje 1 BV / Senior Living Holding BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '490'), 'insurance', 'annually', 2026, 'Vervalt op 01-04-2026 (prolongatie opvragen tzt)', '{"email":"Rita@stadium.capital","locatie":"Doetinchem","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '490') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, 'Vervalt op 01-04-2026 (prolongatie opvragen tzt)', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 491 (MWPO Holding BV / Basecamp One BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '491'), 'insurance', 'annually', 2026, NULL, '{"email":"t.vandijk@mwpo.nl","locatie":"Groningen","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '491') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 492 (VOL Bouwprojecten BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '492'), 'insurance', 'annually', 2026, NULL, '{"email":"barry@suijdam.com","locatie":"Beverwijk","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '492') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 493 (Inproba / Baarn): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '493'), 'insurance', 'annually', 2026, 'Reminder op 04-03-2026', '{"email":"nversteeg@inproba.nl","locatie":"Baarn","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '493') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, 'Reminder op 04-03-2026', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 495 (Share Garages BV (Bert de Niet)): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '495'), 'insurance', 'annually', 2026, NULL, '{"email":"fbrouwer@thesharegroup.eu","locatie":"Bovenkarspel & Andijk","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '495') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 496 (ABC Plantontwikkeling BV / Arnhem station): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '496'), 'insurance', 'annually', 2026, NULL, '{"email":"p.schlick@abcvastgoed.nl","locatie":"Arnhem","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '496') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '496') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 498 (Beverwijk Warande / Bert de Niet): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '498'), 'insurance', 'annually', 2026, 'Grond', '{"locatie":"Beverwijk","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '498') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'not_applicable', NULL, 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '498') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 500 (Van Tiggelen / Amsterdam): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '500'), 'insurance', 'annually', 2026, NULL, '{"email":"gerard@gerose.nl","locatie":"Amsterdam","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '500') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '500') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 501 (Van Suijdam / Bantammertammerstraat): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '501'), 'insurance', 'annually', 2026, NULL, '{"email":"barry@suijdam.com","locatie":"Amsterdam","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '501') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '501') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 504 (HEMA Den Bosch / Tastan): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '504'), 'insurance', 'annually', 2026, NULL, '{"email":"mtastan@tasfin.nl","locatie":"Den Bosch","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '504') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '504') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 505 (Feike / Prins Hendriksoord): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '505'), 'insurance', 'annually', 2026, 'Reminder op 04-03-2026', '{"email":"vanreesema@waterlandre.nl","locatie":"Den Dolder","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '505') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, 'Reminder op 04-03-2026', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '505') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 507 (Bakkers Hommen): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '507'), 'insurance', 'annually', 2026, 'Reminder op 04-03-2026', '{"email":"jorishofridderkerkcv@bakkers-hommen.nl","locatie":"Ridderkerk","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '507') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, 'Reminder op 04-03-2026', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '507') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 509 (Ritchie Kremer): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '509'), 'insurance', 'annually', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '509') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '509') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 510 (ERED / Schoutenwerf): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '510'), 'insurance', 'annually', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '510') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '510') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 511 (Mankes): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '511'), 'insurance', 'annually', 2026, NULL, '{"locatie":"Amsterdam / Hilversum","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '511') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'not_applicable', NULL, 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '511') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 513 (Kragt Groep / Vughterweg): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '513'), 'insurance', 'annually', 2026, NULL, '{"email":"alex@kragtgroep.nl; lenneke@kragtgroep.nl","locatie":"Den Bosch","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '513') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '513') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 514 (Meeuwenlaan): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '514'), 'insurance', 'annually', 2026, NULL, '{"email":"chielvanschaick@hotmail.com","locatie":"Amsterdam-Noord","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '514') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '514') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 515 (Galgenwaard Development BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '515'), 'insurance', 'annually', 2026, NULL, '{"email":"waressel@gmail.com; facturen@galgenwaarddevelopment.nl","locatie":"Utrecht","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '515') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '515') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 518 (Jan Wieger): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '518'), 'insurance', 'annually', 2026, NULL, '{"locatie":"Amsterdam / Almere","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '518') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '518') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 520 (Veghel / Castor Beheer BV): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '520'), 'insurance', 'annually', 2026, NULL, '{"locatie":"Oss","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '520') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '520') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 517 (Polderstaete BV (Cruquius)): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '517'), 'insurance', 'annually', 2026, NULL, '{"email":"linda@polderstaete.com","locatie":"Cruquius","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '517') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '517') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 478 (J. Drechsel): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '478'), 'insurance', 'annually', 2026, 'Prolongatie tot 01-01-2027 ontvangen', '{"email":"joopdrechsel@gmail.com","locatie":"Loosdrecht","vehikel":"DOV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '478') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, 'Prolongatie tot 01-01-2027 ontvangen', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '478') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 458 (ABC Plantontwikkeling BV / Sluisbuurt): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '458'), 'insurance', 'annually', 2026, NULL, '{"email":"p.schlick@abcvastgoed.nl","locatie":"Amsterdam","vehikel":"DOV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '458') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'not_applicable', NULL, 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '458') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 465 (Blakeburg BV / Holding): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '465'), 'insurance', 'annually', 2026, NULL, '{"email":"jheijne@ered.nl; rmackay@ered.nl","locatie":"Rotterdam","vehikel":"DOV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '465') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'received', NULL, NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '465') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 522 (Office Centre Schiphol West I B.V. / Egger): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '522'), 'insurance', 'annually', 2026, 'Grond', '{"email":"egger@solidiam.com","locatie":"Zevenaar","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '522') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'not_applicable', NULL, 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '522') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;

-- 522 (Zevenaar / Egger): Insurance 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '522'), 'insurance', 'annually', 2026, NULL, '{"email":"egger@solidiam.com","locatie":"Zevenaar","vehikel":"RED IV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '522') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)
  SELECT c.id, c.loan_id, '2026', 'pending', NULL, '2027 pas', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '522') AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;


-- ════════════════════════════════════════
-- Huurlijsten 2026
-- ════════════════════════════════════════

-- RAX517RED (Polderstaete BV): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '517'), 'rent_roll', 'quarterly', 1.5, 'gte', 'icr', 2026, 'Opvragen voor Q1 2026', '{"email":"linda@polderstaete.com","comments":"Opvragen voor Q1 2026"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '517') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'received', NULL, '{"annual_rent":1563490,"icr_actual":"3.80"}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '517') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '517') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '517') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '517') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '517') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX444RED (Leusden Holdings B.V.): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '444'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, NULL, '{"email":"floris@propertypartners.nl"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '444') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '444') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '444') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '444') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '444') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '444') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- 576 (501 , 2.96 ,,,1.8,,): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '576'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, NULL, '{"email":"Leusden Holdings C.V.,,,,x,x, € 1"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '576') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '576') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '576') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '576') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '576') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '576') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX449RED (Alblasserdam Yachtbuilding Construction B.V.): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '449'), 'rent_roll', 'quarterly', 4000000, 'gte', 'min_rent', 2026, 'Daadwerkelijke huurniveau mag niet lager dan €4m zijn', '{"email":"leon.blokland@oceanco.nl","comments":"Daadwerkelijke huurniveau mag niet lager dan €4m zijn"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '449') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'received', NULL, '{"annual_rent":4971793,"icr_actual":"Geen breach"}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX450RED (By the River BV): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '450'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, NULL, '{"email":"bytheamstel@gmail.com"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '450') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '450') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '450') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '450') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '450') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '450') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX452RED (IHS Prime Retail I BV): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '452'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, NULL, '{"email":"vanhoof@ihscapital.nl"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '452') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '452') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '452') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '452') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '452') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '452') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- 098 (294 , 2.39 ,,,1.5,,Rente bedraagt nu 0): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '098'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, NULL, '{"email":"IHS Prime Retail II BV,,,,x,nvt; verlenging 1 maand (geen verandering), € 1"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '098') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '098') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '098') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '098') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '098') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '098') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX460RED (Ridderduin Investments BV): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '460'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, 'Wordt op korte termijn afgelost', '{"email":"Ton.Donders@ridderduin.nl","comments":"Wordt op korte termijn afgelost"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '460') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'not_applicable', 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX464RED (Van der Wiel Vastgoed 2 BV): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '464'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, NULL, '{"email":"m.verhoeven@vanderwielbouw.nl"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '464') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '464') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '464') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '464') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '464') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '464') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX490RED (Weerdje 1 BV / Senior Living Holding BV): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '490'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, 'Bevestiging voldoet; contract gemeente loopt door', '{"email":"Rita@stadium.capital","comments":"Bevestiging voldoet; contract gemeente loopt door"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '490') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'not_applicable', 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX491RED (MWPO Holding BV / Basecamp One BV): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '491'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, NULL, '{"email":"t.vandijk@mwpo.nl"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '491') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'received', NULL, '{"annual_rent":189000}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX495RED (Share Garages BV (Bert de Niet)): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '495'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, NULL, '{"email":"fbrouwer@thesharegroup.eu"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '495') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'received', NULL, '{"annual_rent":43000}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX504RED (HEMA Den Bosch): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '504'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, 'Weten we opzich; update allonge wel vragen', '{"email":"mtastan@tasfin.nl","comments":"Weten we opzich; update allonge wel vragen"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '504') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'not_applicable', 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '504') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '504') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '504') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '504') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '504') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX507RED (Bakkers | Hommen): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '507'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, NULL, '{"email":"remmert@bakkers-hommen.nl"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '507') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'received', NULL, '{"annual_rent":1011068}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '507') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '507') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '507') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '507') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '507') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX493RED (Inproba / Baarn): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '493'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, 'Enkel van toepassing indien niet verhuurd aan Inproba', '{"email":"Duco.PelsRijcken@vepartners.com","comments":"Enkel van toepassing indien niet verhuurd aan Inproba"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '493') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'not_applicable', 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX509RED (Rosestraat / Ritchie): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '509'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, 'Iedere 6 maanden; voor het eerst na Q1 2026', '{"email":"ritchie@yycreativecapital.com","comments":"Iedere 6 maanden; voor het eerst na Q1 2026"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '509') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'not_applicable', 'nvt', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '509') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '509') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '509') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '509') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '509') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX513RED (Vughterweg / Kragt): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '513'), 'rent_roll', 'quarterly', 1.6, 'gte', 'icr', 2026, 'recent geclosed; opvragen na Q1 2026', '{"email":"alex@kragtgroep.nl","cashsweep":1000000,"comments":"recent geclosed; opvragen na Q1 2026"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '513') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'not_applicable', 'nvt', '{"annual_rent":1258047,"icr_actual":"2.13"}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '513') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '513') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '513') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '513') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '513') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX514RED (Meeuwenlaan / Michiel & Tyson): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '514'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, NULL, '{"email":"deschakerholding@gmail.com"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '514') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'received', NULL, '{"annual_rent":13037}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '514') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '514') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '514') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '514') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '514') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX520RED (Veghel / Castor Beheer BV): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '520'), 'rent_roll', 'quarterly', 1.5, 'gte', 'icr', 2026, 'Waarvan €650k externe huur (restant eigenaar-gebruiker)', '{"email":"hobie@meubitrend.com","comments":"Waarvan €650k externe huur (restant eigenaar-gebruiker)"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '520') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'not_applicable', 'nvt', '{"annual_rent":1500000,"icr_actual":"2.34"}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '520') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '520') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '520') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '520') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '520') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;

-- RAX518RED (Jan Wieger): Rent Roll 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '518'), 'rent_roll', 'quarterly', NULL, NULL, NULL, 2026, NULL, '{"email":"Nicole@wiegliabeheer.nl"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '518') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2025', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '518') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '518') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '518') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '518') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '518') AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;


-- ════════════════════════════════════════
-- Jaarrekening 2026
-- ════════════════════════════════════════

-- RAX431RED (Lopik (oud)): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '431'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '431') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', 'Fuite/Family beef voor 1 april!!! - zie mail 25 feb van Martijn', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '431') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX436RED (Ferdinand Bol): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '436'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '436') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-09-01', '2026-09-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '436') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX440RED (De MIX): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '440'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '440') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '440') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX444RED (Leusden): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '444'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '444') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '444') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX449RED (Oceanco): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '449'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '449') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX455RED (Utrecht): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '455'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '455') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '455') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX458DOV (ABC / Patchwork): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '458'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '458') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', NULL, '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '458') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX460RED (Ridderduin): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '460'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '460') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX464RED (V/d Wiel): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '464'), 'annual_accounts', 'annually', 'nvt', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '464') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', NULL, NULL, 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '464') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX465DOV (Blakeburg): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '465'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '465') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '465') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX475RED (Lopik): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '475'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '475') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '475') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX482RED (Necron): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '482'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '482') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '482') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX390RED --> RAX484 (Hermon): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '484'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '484') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '484') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX487RED (Intospace 4): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '487'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '487') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '487') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX488RED (Intospace 19): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '488'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '488') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX490RED (Weerdje 1): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '490'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '490') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', 'Parkflat Stadsfenne Holding BV & Parkflat Stadsfenne BV', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX491RED (De Halm): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '491'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '491') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX492RED (VOL / Suijdam): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '492'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '492') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX493RED (Inproba Beheer BV / Baarn): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '493'), 'annual_accounts', 'annually', '2024 jaarrekening', 2026, '{"email":"Duco.PelsRijcken@vepartners.com"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '493') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2024', '2026-01-01', '2026-01-06', 'requested', 'Opgevraagd 01-14-2026; reminder 03-04-2026', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-09-01', '2026-09-06', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2026', '2027-07-01', '2027-07-06', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX495RED (B. de Niet / Garages): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '495'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '495') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX498RED (B. de Niet / Beverwijk): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '498'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '498') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '498') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX504RED (HEMA Den Bosch): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '504'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '504') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '504') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX505RED (Den Dolder): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '505'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '505') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '505') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX509RED (Rosestraat): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '509'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '509') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '509') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX446RED --> RAX510 (ERED): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '510'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '510') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '510') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX513RED (Vughterweg / Kragt): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '513'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '513') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '513') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX514RED (Meeuwenlaan): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '514'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '514') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '514') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX415RED --> RAX517 (Polderstaete): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '517'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '517') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '517') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;

-- RAX520RED (Oss / Veghel): Annual Accounts 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '520'), 'annual_accounts', 'annually', 'Ieder jaar', 2026, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '520') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)
  SELECT c.id, c.loan_id, 'FY2025', '2026-07-01', '2026-07-08', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '520') AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;


-- ════════════════════════════════════════
-- Add. beeindigingsgronden
-- ════════════════════════════════════════

-- RAX493RED (Inproba / Baarn): Financial Covenant
WITH new_cov AS (
  INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '493'), 'financial_covenant', 'custom', 'EBITDA 31-12-2026 niet lager dan €1.5m', 1500000, 'gte', 'ebitda', 2026, NULL, '{"email":"Duco.PelsRijcken@vepartners.com"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '493') IS NOT NULL
  RETURNING id, loan_id
)
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT nc.id, nc.loan_id, '2026', 'pending', NULL, '{}'::jsonb
  FROM new_cov nc;

-- RAX493RED (Inproba / Baarn): Financial Covenant
WITH new_cov AS (
  INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '493'), 'financial_covenant', 'custom', 'EBITDA 31-12-2027 niet lager dan €2.5m', 2500000, 'gte', 'ebitda', 2026, NULL, '{"email":"Duco.PelsRijcken@vepartners.com"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '493') IS NOT NULL
  RETURNING id, loan_id
)
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT nc.id, nc.loan_id, '2026', 'pending', NULL, '{}'::jsonb
  FROM new_cov nc;

-- RAX449RED (Alblasserdam Yachtbuilding Construction B.V.): Financial Covenant
WITH new_cov AS (
  INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '449'), 'financial_covenant', 'custom', 'Huur niet lager dan €4m (jaarbasis)', 4000000, 'gte', 'min_rent', 2026, 'Huur 4.9m voldoet', '{"email":"leon.blokland@oceanco.nl"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '449') IS NOT NULL
  RETURNING id, loan_id
)
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT nc.id, nc.loan_id, '2026', 'pending', 'Huur 4.9m voldoet', '{}'::jsonb
  FROM new_cov nc;


-- ════════════════════════════════════════
-- Grub check 2026
-- ════════════════════════════════════════

-- 420 (Bahl Vastgoed BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '420'), 'kyc_check', 'quarterly', 2026, 'Paspoort mevrouw Bahl - niet aanwezig', '{"locatie":"Amsterdam","vehikel":"RED III","kvk_nummer":"91325455","comments":"Paspoort mevrouw Bahl - niet aanwezig"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '420') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '420') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '420') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '420') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '420') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 423 (Two Lanes BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '423'), 'kyc_check', 'quarterly', 2026, 'Structuur veranderd?; Kess nieuw UBO-opgaaf vragen (Sierra Durgaram ook UBO?)', '{"locatie":"Amsterdam Duivendrecht","vehikel":"RED III","kvk_nummer":"76107752","comments":"Structuur veranderd?; Kess nieuw UBO-opgaaf vragen (Sierra Durgaram ook UBO?)"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '423') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '423') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '423') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '423') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '423') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 431 (Exploitatiemaatschappij Family Beef BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '431'), 'kyc_check', 'quarterly', 2026, 'ID Johannes & Dirk-Jan Fuite verlopen', '{"locatie":"Epe","vehikel":"RED III","kvk_nummer":"08038156","comments":"ID Johannes & Dirk-Jan Fuite verlopen"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '431') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', 'ID Johannes & Dirk-Jan Fuite verlopen', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '431') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '431') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '431') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '431') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 435 (W.H. Koster): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '435'), 'kyc_check', 'quarterly', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '435') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '435') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '435') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '435') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '435') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 436 (Mercatum Gravitax BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '436'), 'kyc_check', 'quarterly', 2026, 'ID loopt in maart 2026 af', '{"locatie":"Amsterdam","vehikel":"RED III","kvk_nummer":"59770767","comments":"ID loopt in maart 2026 af"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '436') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '436') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '436') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '436') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '436') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 440 (MRP SDK BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '440'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Amsterdam","vehikel":"RED III","kvk_nummer":"72769149"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '440') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '440') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '440') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '440') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '440') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 444 (Leusden Holdings B.V.): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '444'), 'kyc_check', 'quarterly', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '444') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '444') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '444') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '444') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '444') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 449 (Alblasserdam Yachtbuilding Construction B.V.): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '449'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Zwijndrecht","vehikel":"RED III","kvk_nummer":"74664158"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '449') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '449') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 450 (By the River BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '450'), 'kyc_check', 'quarterly', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '450') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '450') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '450') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '450') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '450') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 455 (D.I. (Daniel) Investments B.V.): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '455'), 'kyc_check', 'quarterly', 2026, 'Paspoort Sharon Damir & Mats van Olst verlopen; opgevolgd (staat in map)', '{"locatie":"Utrecht","vehikel":"RED III","kvk_nummer":"61247391","comments":"Paspoort Sharon Damir & Mats van Olst verlopen; opgevolgd (staat in map)"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '455') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '455') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '455') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '455') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '455') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 456 (Veronese Vastgoed BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '456'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Amsterdam","vehikel":"RED III","kvk_nummer":"95353364"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '456') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '456') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '456') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '456') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '456') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 460 (Ridderduin Investments BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '460'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Zwolle","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '460') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '460') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 464 (Van der Wiel Vastgoed 2 BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '464'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Noordwijk","vehikel":"RED III","kvk_nummer":"82161062"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '464') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '464') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '464') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '464') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '464') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 472 (Kess Corporation NV / Two Lanes): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '472'), 'kyc_check', 'quarterly', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '472') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '472') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '472') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '472') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '472') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 475 (Lekkerkerker O/G Benschop BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '475'), 'kyc_check', 'quarterly', 2026, 'Nieuw UBO-opgaaf vragen andere UBO''s dan voorheen + IDs', '{"locatie":"Lopik","vehikel":"RED III","kvk_nummer":"62327100","comments":"Nieuw UBO-opgaaf vragen andere UBO''s dan voorheen + IDs"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '475') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', 'Nieuw UBO-opgaaf vragen andere UBO''s dan voorheen + IDs', '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '475') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '475') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '475') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '475') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 479 (PRST BV / Van de Ven): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '479'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Vught","vehikel":"RED III","kvk_nummer":"77022963"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '479') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '479') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '479') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '479') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '479') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 482 (Necron): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '482'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Aalsmeer","vehikel":"RED III","kvk_nummer":"80230016"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '482') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '482') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '482') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '482') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '482') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 484 (Hermon / Oudenoord): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '484'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Utrecht","vehikel":"RED IV","kvk_nummer":"75206846"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '484') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '484') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '484') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '484') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '484') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 486 (FMC Amsterdam BV (AWC)): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '486'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Amsterdam","vehikel":"RED III"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '486') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '486') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '486') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '486') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '486') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 487 (IntoSpace 4 BV / Holding): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '487'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Zoetermeer","vehikel":"RED III","kvk_nummer":"82627541"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '487') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '487') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '487') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '487') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '487') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 488B (IntoSpace 19 BV / IntoSpace 39 BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '488'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Lelystad","vehikel":"RED III","kvk_nummer":"72113553"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '488') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 488 (IntoSpace 19 BV / IntoSpace 39 BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '488'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Lelystad","vehikel":"RED III","kvk_nummer":"72113553"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '488') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '488') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 490 (Weerdje 1 BV / Senior Living Holding BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '490'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Doetinchem","vehikel":"RED III","kvk_nummer":"82451559"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '490') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '490') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 491 (MWPO Holding BV / Basecamp One BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '491'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Groningen","vehikel":"RED III","kvk_nummer":"95644660"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '491') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '491') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 492 (VOL Bouwprojecten BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '492'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Beverwijk","vehikel":"RED III","kvk_nummer":"37157617"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '492') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '492') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 493 (Inproba / Baarn): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '493'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Baarn","vehikel":"RED IV","kvk_nummer":"31027731"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '493') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '493') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 495 (Share Garages BV (Bert de Niet)): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '495'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Bovenkarspel & Andijk","vehikel":"RED III","kvk_nummer":"72083417"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '495') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '495') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 496 (ABC Plantontwikkeling BV / Arnhem station): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '496'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Arnhem","vehikel":"RED III","kvk_nummer":"68361238"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '496') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '496') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '496') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '496') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '496') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 498 (Beverwijk Warande / Bert de Niet): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '498'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Beverwijk","vehikel":"RED III","kvk_nummer":"72083417"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '498') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '498') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '498') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '498') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '498') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 500 (Van Tiggelen / Amsterdam): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '500'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Amsterdam","vehikel":"RED III","kvk_nummer":"34095060"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '500') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '500') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '500') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '500') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '500') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 501 (Van Suijdam / Bantammertammerstraat): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '501'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Amsterdam","vehikel":"RED III","kvk_nummer":"Zie lening 492"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '501') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '501') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '501') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '501') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '501') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 504 (HEMA Den Bosch / Tastan): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '504'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Den Bosch","vehikel":"RED IV","kvk_nummer":"34255844"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '504') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '504') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '504') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '504') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '504') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 505 (Feike / Prins Hendriksoord): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '505'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Den Dolder","vehikel":"RED IV","kvk_nummer":"65375041"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '505') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '505') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '505') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '505') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '505') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 507 (Bakkers Hommen): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '507'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Ridderkerk","vehikel":"RED IV","kvk_nummer":"73325406"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '507') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '507') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '507') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '507') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '507') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 509 (Ritchie Kremer): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '509'), 'kyc_check', 'quarterly', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '509') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '509') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '509') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '509') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '509') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 510 (ERED / Schoutenwerf): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '510'), 'kyc_check', 'quarterly', 2026, NULL, '{}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '510') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '510') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '510') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '510') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '510') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 511 (Mankes): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '511'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Amsterdam / Hilversum","vehikel":"RED IV","kvk_nummer":"81307071"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '511') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '511') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '511') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '511') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '511') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 513 (Kragt Groep / Vughterweg): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '513'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Den Bosch","vehikel":"RED IV","kvk_nummer":"99125471"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '513') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '513') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '513') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '513') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '513') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 514 (Meeuwenlaan): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '514'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Amsterdam-Noord","vehikel":"RED IV","kvk_nummer":"974479519"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '514') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '514') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '514') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '514') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '514') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 515 (Galgenwaard Development BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '515'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Utrecht","vehikel":"RED IV","kvk_nummer":"92114539"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '515') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '515') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '515') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '515') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '515') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 520 (Veghel / Castor Beheer BV): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '520'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Oss","vehikel":"RED IV","kvk_nummer":"56463820"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '520') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '520') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '520') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '520') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '520') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 517 (Polderstaete BV (Cruquius)): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '517'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Cruquius","vehikel":"RED III","kvk_nummer":"69436118"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '517') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '517') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '517') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '517') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '517') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 518 (Wieglia Beheer BV (JW)): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '518'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Amsterdam / Almere","vehikel":"RED IV","kvk_nummer":"33220582"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '518') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '518') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '518') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '518') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '518') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 478 (J. Drechsel): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '478'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Loosdrecht","vehikel":"DOV","kvk_nummer":"Privé"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '478') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '478') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '478') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '478') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '478') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 458 (ABC Plantontwikkeling BV / Sluisbuurt): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '458'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Amsterdam","vehikel":"DOV"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '458') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '458') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '458') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '458') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '458') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;

-- 465 (Blakeburg BV / Holding): KYC Check 2026
INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)
  SELECT (SELECT id FROM loans WHERE loan_id = '465'), 'kyc_check', 'quarterly', 2026, NULL, '{"locatie":"Rotterdam","vehikel":"DOV","kvk_nummer":"96233117"}'::jsonb
  WHERE (SELECT id FROM loans WHERE loan_id = '465') IS NOT NULL;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q1 2026', 'received', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '465') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q2 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '465') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q3 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '465') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;
INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)
  SELECT c.id, c.loan_id, 'Q4 2026', 'pending', NULL, '{}'::jsonb
  FROM loan_covenants c WHERE c.loan_id = (SELECT id FROM loans WHERE loan_id = '465') AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;


COMMIT;

-- ════════════════════════════════════════
-- Verification queries
-- ════════════════════════════════════════

-- Count by type
SELECT covenant_type, count(*) FROM loan_covenants GROUP BY 1 ORDER BY 1;

-- Count submissions by status
SELECT status, count(*) FROM covenant_submissions GROUP BY 1 ORDER BY 1;

-- Spot check: all covenants for a specific loan
SELECT l.loan_id, lc.covenant_type, lc.tracking_year, cs.period_label, cs.status
FROM covenant_submissions cs
JOIN loan_covenants lc ON lc.id = cs.covenant_id
JOIN loans l ON l.id = cs.loan_id
WHERE l.loan_id = '444'
ORDER BY lc.covenant_type, cs.period_label;
