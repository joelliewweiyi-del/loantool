-- Rent roll upload: RAX509 (Varod Street B.V. / Rosestraat) Q4 2025
-- Single tenant: FysiotherapieRotterdam B.V.
-- Source: Huurcontract Rosestraat S Schampers 2021 + Maashave Vastgoedbeheer factuur 25.70.000399
-- Contract: €130,000/yr from 1 Nov 2021, 10yr term → 21 Oct 2031, 5yr renewal, 12mo notice
-- Indexed quarterly rent (May-Jul 2025): €38,865.55 → annual €155,462.20
-- Property: Rosestraat 123, 3071JP Rotterdam, ~1,444 m² BVO, kantoor-/praktijkruimte
-- Art 4.6: 3% korting kale jaarhuur for tenant-managed services

DO $$
DECLARE
  v_loan_id uuid;
  v_covenant_id uuid;
  v_submission_id uuid;
BEGIN
  SELECT id INTO v_loan_id FROM loans WHERE loan_id = '509';

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
    RAISE EXCEPTION 'No Q4 2025 rent_roll submission found for loan 509';
  END IF;

  -- Clear existing entries
  DELETE FROM rent_roll_entries WHERE submission_id = v_submission_id;

  -- Single tenant
  INSERT INTO rent_roll_entries (submission_id, loan_id, tenant_name, sqm, annual_rent, lease_start, lease_end, notice_period, renewal_period, notes, reference_document) VALUES
    (v_submission_id, v_loan_id, 'FysiotherapieRotterdam B.V.', 1444, 155462.20, '2021-11-01', '2031-10-21', '12 maanden', '5 jaar', 'KvK 822621046. Kantoor-/praktijkruimte. Basishuur €130k (2021), geïndexeerd per 1 nov. Art 4.6: 3% korting voor eigen diensten/services.', '2021-05-13 Huurcontract Rosestraat S Schampers 2021.pdf');

  -- Mark submission as received
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2025-04-22',
      metadata = jsonb_build_object(
        'annual_rent', 155462.20,
        'total_sqm', 1444,
        'source', 'Huurcontract + Maashave factuur 25.70.000399',
        'base_rent_2021', 130000,
        'indexation_date', '1 november'
      )
  WHERE id = v_submission_id;
END $$;
