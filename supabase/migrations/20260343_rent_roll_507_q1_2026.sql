-- Rent roll upload: RAX507 (Jorishof Ridderkerk C.V.) Q1 2026
-- Source: "87 Jorishof - Overzicht opbrengst en expiratie.pdf", peildatum 15-01-2026
-- Total annual rent: €1,011,068.40 | Total area: 4,610 m² (occupied: ~3,898 m²)

DO $$
DECLARE
  v_loan_id uuid;
  v_submission_id uuid;
BEGIN
  SELECT id INTO v_loan_id FROM loans WHERE loan_id = '507';

  -- Find Q1 2026 rent_roll submission
  SELECT cs.id INTO v_submission_id
  FROM covenant_submissions cs
  JOIN loan_covenants lc ON cs.covenant_id = lc.id
  WHERE cs.loan_id = v_loan_id
    AND lc.covenant_type = 'rent_roll'
    AND cs.period_label = 'Q1 2026';

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'No Q1 2026 rent_roll submission found for loan 507';
  END IF;

  -- Clear any existing entries for this submission
  DELETE FROM rent_roll_entries WHERE submission_id = v_submission_id;

  -- Insert tenant entries
  INSERT INTO rent_roll_entries (submission_id, loan_id, tenant_name, sqm, annual_rent, lease_start, lease_end, notice_period, renewal_period, notes) VALUES
    -- Occupied tenants
    (v_submission_id, v_loan_id, 'Q-park Operations Netherlands II B.V.', 0, 200206.60, '2015-04-01', '2030-03-31', '2029-03-31', '60 maanden', 'WC Jorishof'),
    (v_submission_id, v_loan_id, 'Chocolade en zo', 24, 12269.52, '2022-07-01', '2029-06-30', '2028-06-30', NULL, NULL),
    (v_submission_id, v_loan_id, 'Travel Unie Intern. Ned. B.V.', 71, 21000.00, '1992-07-01', '2027-12-31', '2027-06-30', '36 maanden', NULL),
    (v_submission_id, v_loan_id, 'Bram Ladage Verse Patat B.V.', 34, 19142.76, '2015-07-01', '2030-06-30', '2029-06-30', NULL, NULL),
    (v_submission_id, v_loan_id, 'Zeeman TextielSupers B.V.', 445, 108438.56, '2011-04-01', '2029-12-31', '2028-12-31', NULL, NULL),
    (v_submission_id, v_loan_id, 'Warenhuis Ridderkerk B.V.', 1557, 240000.00, '2025-07-01', '2035-06-30', '2034-06-30', '60 maanden', NULL),
    (v_submission_id, v_loan_id, 'Parfumerie Douglas Nederland B.V.', 338, 93411.48, '2004-06-01', '2034-05-31', '2033-05-31', '60 maanden', NULL),
    (v_submission_id, v_loan_id, 'Hunkemöller Nederland', 165, 39282.84, '1995-07-01', '2028-01-31', '2027-07-31', '60 maanden', NULL),
    (v_submission_id, v_loan_id, 'You Clothing V.O.F.', 140, 37308.24, '2016-04-01', '2029-07-31', '2028-07-31', '60 maanden', 'St. Jorisplein 65'),
    (v_submission_id, v_loan_id, 'JVDS BV', 0, 19200.00, '2025-12-01', '2026-11-30', '2026-05-31', '48 maanden', NULL),
    (v_submission_id, v_loan_id, 'V.O.F. Multivlaai', 60, 23207.40, '2020-12-01', '2028-02-29', '2027-02-28', '60 maanden', NULL),
    (v_submission_id, v_loan_id, 'You Clothing V.O.F.', 46, 12258.24, '2014-08-01', '2029-07-31', '2028-07-31', '60 maanden', 'St. Jorisplein 69'),
    (v_submission_id, v_loan_id, 'A.S. Watson Property Contin. Europe B.V.', 156, 39087.60, '1996-03-01', NULL, NULL, NULL, 'Onbepaalde tijd'),
    (v_submission_id, v_loan_id, 'Cees de Reus', 63, 15468.60, '2021-05-01', NULL, NULL, NULL, 'Onbepaalde tijd'),
    (v_submission_id, v_loan_id, 'Hans Anders Nederland B.V.', 171, 39500.04, '2025-09-01', '2030-08-31', '2029-08-31', '60 maanden', NULL),
    (v_submission_id, v_loan_id, 'De Kaasstolp B.V.', 53, 21385.68, '2022-09-17', '2026-09-16', '2026-06-16', NULL, NULL),
    (v_submission_id, v_loan_id, 'VvE Sint Jorisplein (Woningen)', 0, 0, '2019-01-01', NULL, NULL, NULL, 'Onbepaalde tijd, servicekosten only'),
    (v_submission_id, v_loan_id, 'Délifrance Ridderkerk B.V.', 274, 54297.96, '2024-03-01', '2034-02-28', '2033-02-28', '120 maanden', NULL),
    (v_submission_id, v_loan_id, 'Wolf Sport V.O.F.', 230, 15602.88, '2019-03-12', '2026-03-11', NULL, NULL, NULL),
    -- Vacant units
    (v_submission_id, v_loan_id, 'Leegstand', 66, 0, '2019-05-01', NULL, NULL, NULL, 'St. Jorisplein 55-II'),
    (v_submission_id, v_loan_id, 'Leegstand', 51, 0, '2023-08-01', NULL, NULL, NULL, 'St. Jorisplein 55-IV'),
    (v_submission_id, v_loan_id, 'Leegstand', 0, 0, NULL, NULL, NULL, NULL, 'St. Jorisplein 59'),
    (v_submission_id, v_loan_id, 'Leegstand', 62, 0, '2024-06-01', NULL, NULL, NULL, 'St. Jorisplein 60-61'),
    (v_submission_id, v_loan_id, 'Leegstand', 338, 0, '2022-10-01', NULL, NULL, NULL, 'St. Jorisplein 70-71'),
    (v_submission_id, v_loan_id, 'Leegstand', 0, 0, '2020-10-01', NULL, NULL, NULL, 'St. Jorisplein 77-79'),
    (v_submission_id, v_loan_id, 'Leegstand', 195, 0, '2019-01-01', NULL, NULL, NULL, 'St. Jorisplein 62');

  -- Mark submission as received
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2026-01-15'::timestamptz,
      metadata = jsonb_build_object('annual_rent', 1011068.40, 'total_sqm', 4610, 'source', '87 Jorishof - Overzicht opbrengst en expiratie.pdf')
  WHERE id = v_submission_id;

  RAISE NOTICE 'Inserted 26 rent roll entries for RAX507 Q1 2026 (submission: %)', v_submission_id;
END $$;
