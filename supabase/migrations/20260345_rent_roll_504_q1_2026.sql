-- Rent roll upload: RAX504 (Pensmarkt 's-Hertogenbosch) Q1 2026
-- Source: "20250904 AllongeHema Den Bosch + bijlagen nieuw let op.pdf"
-- Single tenant: HEMA B.V. | Annual rent: €720,000.00

DO $$
DECLARE
  v_loan_id uuid;
  v_submission_id uuid;
BEGIN
  SELECT id INTO v_loan_id FROM loans WHERE loan_id = '504';

  -- Find Q1 2026 rent_roll submission
  SELECT cs.id INTO v_submission_id
  FROM covenant_submissions cs
  JOIN loan_covenants lc ON cs.covenant_id = lc.id
  WHERE cs.loan_id = v_loan_id
    AND lc.covenant_type = 'rent_roll'
    AND cs.period_label = 'Q1 2026';

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'No Q1 2026 rent_roll submission found for loan 504';
  END IF;

  -- Clear any existing entries for this submission
  DELETE FROM rent_roll_entries WHERE submission_id = v_submission_id;

  -- Insert tenant entry
  INSERT INTO rent_roll_entries (submission_id, loan_id, tenant_name, sqm, annual_rent, lease_start, lease_end, notice_period, renewal_period, notes, reference_document) VALUES
    (v_submission_id, v_loan_id, 'HEMA B.V.', NULL, 720000.00, '2025-11-01', '2035-10-31', '12 maanden', '4 x 10 jaar', 'Allonge 2025 via Median Investment B.V. Oorspronkelijk huurcontract 2005 (€528,343/jr). Indexering jaarlijks per 1 nov, gemaximeerd. Investeringsbijdrage €820k. HEMA 100 renovatie gepland.', '20250904 AllongeHema Den Bosch + bijlagen nieuw let op.pdf');

  -- Mark submission as received
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2026-01-15'::timestamptz,
      metadata = jsonb_build_object('annual_rent', 720000.00, 'total_sqm', NULL, 'source', '20250904 AllongeHema Den Bosch + bijlagen nieuw let op.pdf')
  WHERE id = v_submission_id;

  RAISE NOTICE 'Inserted 1 rent roll entry for RAX504 Q1 2026 (submission: %)', v_submission_id;
END $$;
