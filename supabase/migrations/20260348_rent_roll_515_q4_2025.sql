-- Rent roll upload: RAX515 (Galgenwaard, Utrecht) Q4 2025
-- Source: "Huurlijst project Galgenwaard - Jongerius[66].xlsx"
-- 28 tenants + 2 vacant across 5 wings (Noord, Oost, Zuid HK, West, Stadion Zuid)
-- Total lettable area: 12,149 m²
-- Total annual rent: €1,666,313.92

DO $$
DECLARE
  v_loan_id uuid;
  v_covenant_id uuid;
  v_submission_id uuid;
BEGIN
  SELECT id INTO v_loan_id FROM loans WHERE loan_id = '515';

  -- Create rent_roll covenant if not exists
  SELECT id INTO v_covenant_id
  FROM loan_covenants
  WHERE loan_id = v_loan_id AND covenant_type = 'rent_roll' AND active = true;

  IF v_covenant_id IS NULL THEN
    INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes)
    VALUES (v_loan_id, 'rent_roll', 'quarterly', 2025, 'Auto-created for rent roll upload')
    RETURNING id INTO v_covenant_id;

    INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, status) VALUES
      (v_covenant_id, v_loan_id, 'Q4 2025', '2025-12-31', 'pending'),
      (v_covenant_id, v_loan_id, 'Q1 2026', '2026-03-31', 'pending'),
      (v_covenant_id, v_loan_id, 'Q2 2026', '2026-06-30', 'pending'),
      (v_covenant_id, v_loan_id, 'Q3 2026', '2026-09-30', 'pending'),
      (v_covenant_id, v_loan_id, 'Q4 2026', '2026-12-31', 'pending');
  END IF;

  SELECT cs.id INTO v_submission_id
  FROM covenant_submissions cs
  WHERE cs.covenant_id = v_covenant_id
    AND cs.period_label = 'Q4 2025';

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'No Q4 2025 rent_roll submission found for loan 515';
  END IF;

  DELETE FROM rent_roll_entries WHERE submission_id = v_submission_id;

  INSERT INTO rent_roll_entries (submission_id, loan_id, tenant_name, sqm, annual_rent, lease_start, lease_end, notice_period, renewal_period, notes, reference_document) VALUES
    -- HK Noord
    (v_submission_id, v_loan_id, 'Interstep', 311, 44528.24, '2014-05-01', '2024-04-30', NULL, NULL, 'Hk noord. Verlopen per 30-04-2024.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'VSU', 583, 78548.88, '2018-11-01', '2028-10-30', '12 maanden', 'telkens 10 jaar', 'Hk noord.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'John West Holland B.V.', 341, 42564.20, '2012-07-01', '2026-06-30', '6 maanden', '4+5+5 jaar', 'Hk noord.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'SSC', 200, 29432.64, '2017-12-01', '2031-11-30', '3 maanden', 'onbepaalde tijd', 'Hk noord.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Medisch Contact Centrum', 190, 27140.52, '2019-03-01', '2031-11-30', '3 maanden', NULL, 'Hk noord.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Leegstand', NULL, 0, NULL, NULL, NULL, NULL, 'Hk noord. Vacant.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Leegstand', NULL, 0, NULL, NULL, NULL, NULL, 'Hk noord. Vacant.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Team Advocaten', 449, 78531.20, '2019-01-01', '2028-12-31', '3 maanden', NULL, 'Hk noord.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Employee Wellbeing Company B.V. / Nolost', 200, 24926.00, '2023-01-01', '2025-12-31', '6 maanden', 'telkens 1 jaar', 'Hk noord.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Nolost', 220, 29400.00, '2023-01-01', '2025-12-21', '6 maanden', 'telkens 1 jaar', 'Hk noord.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'T-Mobile (zendmast)', 0, 8791.84, NULL, '2024-04-24', NULL, NULL, 'Hk noord. Telecom mast.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'KPN (zendmast)', 0, 3500.00, NULL, '2026-07-01', NULL, NULL, 'Hk noord. Telecom mast.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),

    -- HK Oost
    (v_submission_id, v_loan_id, 'Huid en Laser', 350, 48703.44, '2021-08-01', '2026-06-30', '6 maanden', '5 jaar', 'Hk oost.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Van den Berg, De Rie en Uyterlinde', 180, 25777.68, '2020-02-01', '2023-12-31', '3 maanden', '1 jaar', 'Hk oost.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Stichting Mulier Instituut', 787, 106245.00, '2022-01-01', '2026-12-31', '3 maanden', '5 jaar', 'Hk oost.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Administratie en Adviescentrum ACN B.V.', 123, 15325.76, '2018-02-01', '2024-12-31', '3 maanden', '1 jaar', 'Hk oost.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Stichting de Opbouw', 1020, 136055.68, '2018-10-01', '2028-09-30', '3 maanden', '5 jaar', 'Hk oost.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),

    -- HK Zuid
    (v_submission_id, v_loan_id, 'ROC Midden Nederland (HK Zuid)', 2346, 332564.96, '2018-07-01', '2027-07-31', '12 maanden', '5+5 jaar', 'Hk zuid. Grootste huurder.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),

    -- HK West
    (v_submission_id, v_loan_id, 'Philadelphia', 201, 27000.00, '2023-07-01', '2028-06-30', '6 maanden', 'telkens 1 jaar', 'Hk west.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Leroy Grau', 104, 15979.48, '2020-10-01', '2024-09-30', '12 maanden', 'telkens 2 jaar', 'Hk west.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Ans de Wijn Bedrijfshuisvesting B.V.', 350, 54115.44, '2000-07-01', '2025-06-30', NULL, 'telkens 5 jaar', 'Hk west.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Work On', 275, 45694.20, '2018-06-01', '2023-05-31', '3 maanden', '5 jaar', 'Hk west.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Twelve Nieuw', 358, 49257.08, '2021-02-01', '2023-12-31', '3 maanden', '3 jaar', 'Hk west, 2e verdieping.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'FMMU B.V.', 745, 226509.84, '2019-02-01', '2024-01-31', '6 maanden', '1 jaar', 'Hk west. Grootste huur per unit.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),

    -- Stadion Zuid
    (v_submission_id, v_loan_id, 'ROC Midden Nederland (Stadion Zuid)', 1167, 100144.24, '2019-07-01', '2027-07-31', '12 maanden', '5+5 jaar', 'Stadion zuid.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Gemeente Utrecht', 472, 24600.24, '2006-07-01', '2026-06-30', '12 maanden', 'telkens 10 jaar', 'Stadion zuid.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Fitter Club Utrecht', 416, 68544.00, '2017-01-01', '2027-12-31', '6 maanden', '5 jaar', 'Stadion zuid.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'A. Boonen', 250, 18336.00, NULL, '2030-12-31', '12 maanden', 'telkens 1 jaar', 'Stadion zuid.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Gemeente Utrecht DMO', 472, 2353.56, '2006-07-01', '2026-06-30', '12 maanden', 'telkens 10 jaar', 'Stadion zuid.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'),
    (v_submission_id, v_loan_id, 'Team Advocaten (archief)', 40, 1743.80, '2024-01-01', '2028-12-31', '12 maanden', 'telkens 5 jaar', 'Stadion zuid.', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx');

  -- Mark submission as received
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2026-01-01',
      metadata = jsonb_build_object(
        'annual_rent', 1666313.92,
        'total_sqm', 12149,
        'tenants', 28,
        'vacant_units', 2,
        'source', 'Huurlijst project Galgenwaard - Jongerius[66].xlsx'
      )
  WHERE id = v_submission_id;

  RAISE NOTICE 'RAX515: Inserted 30 rent roll entries for Q4 2025 (total €1,666,313.92)';
END $$;
