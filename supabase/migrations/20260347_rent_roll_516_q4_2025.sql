-- Rent roll upload: RAX516 (Coroos / Jaan OG BV) Q4 2025
-- Source: Email from Mark van Hove (Realfort) to Martijn Louwerse (RAX Finance), 10 Dec 2025
-- Subject: "RE: Jaan OG BV"
-- Using Boekjaar 26-27 figures (3.0% indexation per 1 Jun 2026, magazijn 9 excluded)
-- Kapelle €1,469,080.76 + Geldermalsen €2,975,395.24 = €4,444,476.00
-- Two tenants: Coroos Conserven B.V. (Kapelle) + Coroos Productie B.V. (Geldermalsen)
-- Lease start: 13 Oct 2022, 15-year term → expiry 12 Oct 2037

DO $$
DECLARE
  v_loan_id uuid;
  v_covenant_id uuid;
  v_submission_id uuid;
BEGIN
  SELECT id INTO v_loan_id FROM loans WHERE loan_id = '516';

  -- Create rent_roll covenant if not exists
  SELECT id INTO v_covenant_id
  FROM loan_covenants
  WHERE loan_id = v_loan_id AND covenant_type = 'rent_roll' AND active = true;

  IF v_covenant_id IS NULL THEN
    INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes)
    VALUES (v_loan_id, 'rent_roll', 'quarterly', 2025, 'Auto-created for rent roll upload')
    RETURNING id INTO v_covenant_id;

    -- Generate quarterly submissions for 2025 and 2026
    INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, status) VALUES
      (v_covenant_id, v_loan_id, 'Q4 2025', '2025-12-31', 'pending'),
      (v_covenant_id, v_loan_id, 'Q1 2026', '2026-03-31', 'pending'),
      (v_covenant_id, v_loan_id, 'Q2 2026', '2026-06-30', 'pending'),
      (v_covenant_id, v_loan_id, 'Q3 2026', '2026-09-30', 'pending'),
      (v_covenant_id, v_loan_id, 'Q4 2026', '2026-12-31', 'pending');
  END IF;

  -- Find Q4 2025 rent_roll submission
  SELECT cs.id INTO v_submission_id
  FROM covenant_submissions cs
  WHERE cs.covenant_id = v_covenant_id
    AND cs.period_label = 'Q4 2025';

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'No Q4 2025 rent_roll submission found for loan 516';
  END IF;

  -- Clear any existing entries for this submission
  DELETE FROM rent_roll_entries WHERE submission_id = v_submission_id;

  -- Insert tenant entries — Boekjaar 26-27 (indexed, magazijn 9 excluded)
  INSERT INTO rent_roll_entries (submission_id, loan_id, tenant_name, sqm, annual_rent, lease_start, lease_end, notice_period, renewal_period, notes, reference_document) VALUES
    (v_submission_id, v_loan_id, 'Coroos Conserven B.V.', NULL, 1469080.76, '2022-10-13', '2037-10-12', NULL, '15 jaar', 'Kapelle (kantoorruimte en overige ruimtes). Boekjaar 26-27. 3,0% indexatie per 1 jun 2026.', 'Huurovereenkomst Kantoorruimte en overige ruimtes COROOS Kapelle.pdf'),
    (v_submission_id, v_loan_id, 'Coroos Productie B.V.', NULL, 2975395.24, '2022-10-13', '2037-10-12', NULL, '15 jaar', 'Geldermalsen (kantoorruimte en overige ruimtes). Boekjaar 26-27. 3,0% indexatie per 1 jun 2026.', 'Huurovereenkomst Kantoorruimte en overige ruimtes COROOS Geldermalsen.pdf');

  -- Mark submission as received
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2025-12-10',
      metadata = jsonb_build_object(
        'annual_rent', 4444476.00,
        'total_sqm', NULL,
        'source', 'Email Mark van Hove (Realfort) 10-12-2025 RE: Jaan OG BV',
        'boekjaar', '26-27',
        'indexation_note', '3.0% indexation per 1 Jun 2026. Magazijn 9 excluded (possible transfer before 1 Mar 2026).'
      )
  WHERE id = v_submission_id;

  RAISE NOTICE 'RAX516: Inserted 2 rent roll entries for Q4 2025 (total €4,444,476.00, boekjaar 26-27)';
END $$;
