-- Rent roll upload: RAX529 (Lorentz Company N.V.) Q4 2025
-- Single tenant: Tulipdam Hotel
-- Source: Lorentz Company N.V. factuur 2026001, 24 Jan 2026
-- Property: Damrak 31, Amsterdam
-- Monthly rent excl BTW: €39,615.85 → annual €475,390.20
-- BTW 21% applies

DO $$
DECLARE
  v_loan_id uuid;
  v_covenant_id uuid;
  v_submission_id uuid;
BEGIN
  SELECT id INTO v_loan_id FROM loans WHERE loan_id = '529';

  -- Create rent_roll covenant (none exists)
  INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes)
  VALUES (v_loan_id, 'rent_roll', 'quarterly', 2025, 'Auto-created for rent roll upload')
  RETURNING id INTO v_covenant_id;

  -- Generate quarterly submissions
  INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, status) VALUES
    (v_covenant_id, v_loan_id, 'Q4 2025', '2025-12-31', 'pending'),
    (v_covenant_id, v_loan_id, 'Q1 2026', '2026-03-31', 'pending'),
    (v_covenant_id, v_loan_id, 'Q2 2026', '2026-06-30', 'pending'),
    (v_covenant_id, v_loan_id, 'Q3 2026', '2026-09-30', 'pending'),
    (v_covenant_id, v_loan_id, 'Q4 2026', '2026-12-31', 'pending');

  -- Find Q4 2025 submission
  SELECT cs.id INTO v_submission_id
  FROM covenant_submissions cs
  WHERE cs.covenant_id = v_covenant_id
    AND cs.period_label = 'Q4 2025';

  -- Clear existing entries
  DELETE FROM rent_roll_entries WHERE submission_id = v_submission_id;

  -- Single tenant
  INSERT INTO rent_roll_entries (submission_id, loan_id, tenant_name, annual_rent, notes, reference_document) VALUES
    (v_submission_id, v_loan_id, 'Tulipdam Hotel', 475390.20, 'Damrak 31, Amsterdam. Maandhuur €39,615.85 excl BTW (21%). Debiteurennr 12.', 'Lorentz Company N.V. factuur 2026001');

  -- Mark submission as received
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2026-01-24',
      metadata = jsonb_build_object(
        'annual_rent', 475390.20,
        'source', 'Factuur 2026001 Lorentz Company N.V.',
        'monthly_rent_excl_btw', 39615.85,
        'btw_rate', 0.21
      )
  WHERE id = v_submission_id;
END $$;
