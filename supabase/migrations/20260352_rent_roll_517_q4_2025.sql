-- Rent roll upload: RAX517 (Polderstaete B.V.) Q4 2025
-- Source: Huurlijst Cluster II + III screenshot
-- Cluster II: Dura Vermeer + Next Rental = €446,600 (Buitenterrein + loodsen)
-- Cluster III: G500 + BMN + Particulier + Gemeente = €1,843,000
-- Grand total: €2,289,600 | 19,831 m²
-- Note: Gemeente* lease — toezegging wethouder: nog met 10 jaar verlengd

DO $$
DECLARE
  v_loan_id uuid;
  v_covenant_id uuid;
  v_submission_id uuid;
BEGIN
  SELECT id INTO v_loan_id FROM loans WHERE loan_id = '517';

  -- Find existing rent_roll covenant
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

  -- Find Q4 2025 submission
  SELECT cs.id INTO v_submission_id
  FROM covenant_submissions cs
  WHERE cs.covenant_id = v_covenant_id
    AND cs.period_label = 'Q4 2025';

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'No Q4 2025 rent_roll submission found for loan 517';
  END IF;

  -- Clear existing entries
  DELETE FROM rent_roll_entries WHERE submission_id = v_submission_id;

  -- Cluster II — Buitenterrein + loodsen
  INSERT INTO rent_roll_entries (submission_id, loan_id, tenant_name, sqm, annual_rent, lease_end, notes) VALUES
    (v_submission_id, v_loan_id, 'Dura Vermeer', 2490, 396600.00, '2026-08-31', 'Cluster II. Buitenterrein + loodsen. €159/m².'),
    (v_submission_id, v_loan_id, 'Next Rental', 285, 50000.00, '2028-01-01', 'Cluster II. Buitenterrein + loodsen. €175/m².');

  -- Cluster III
  INSERT INTO rent_roll_entries (submission_id, loan_id, tenant_name, sqm, annual_rent, lease_end, notes) VALUES
    (v_submission_id, v_loan_id, 'G500', 600, 30000.00, '2028-07-01', 'Cluster III. Bedrijf. €50/m².'),
    (v_submission_id, v_loan_id, 'BMN', 12921, 798000.00, '2028-09-30', 'Cluster III. Bedrijf. €62/m².'),
    (v_submission_id, v_loan_id, 'Particulier', 180, 15000.00, NULL, 'Cluster III. 2 woningen. €83/m².'),
    (v_submission_id, v_loan_id, 'Gemeente*', 3175, 1000000.00, '2027-02-28', 'Cluster III. Migranten. €315/m². Toezegging wethouder: nog met 10 jaar verlengd.');

  -- Mark submission as received
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2025-12-31',
      metadata = jsonb_build_object(
        'annual_rent', 2289600.00,
        'total_sqm', 19831,
        'source', 'Huurlijst Cluster II + III',
        'clusters', 'II (€446,600) + III (€1,843,000)'
      )
  WHERE id = v_submission_id;
END $$;
