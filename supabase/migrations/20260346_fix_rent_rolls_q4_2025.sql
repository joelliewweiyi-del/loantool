-- Fix: All rent rolls should be Q4 2025 received (not Q1 2026)
-- Also adds RAX493 (Inproba Beheer / Baarn) rent roll entry

DO $$
DECLARE
  -- 507 vars
  v_507_loan_id uuid;
  v_507_q4_sub_id uuid;
  v_507_q1_sub_id uuid;
  -- 504 vars
  v_504_loan_id uuid;
  v_504_q4_sub_id uuid;
  v_504_q1_sub_id uuid;
  -- 493 vars
  v_493_loan_id uuid;
  v_493_q4_sub_id uuid;
BEGIN
  -- ============ RAX507: Move entries from Q1 2026 → Q4 2025 ============
  SELECT id INTO v_507_loan_id FROM loans WHERE loan_id = '507';

  SELECT cs.id INTO v_507_q4_sub_id
  FROM covenant_submissions cs
  JOIN loan_covenants lc ON cs.covenant_id = lc.id
  WHERE cs.loan_id = v_507_loan_id
    AND lc.covenant_type = 'rent_roll'
    AND cs.period_label = 'Q4 2025';

  SELECT cs.id INTO v_507_q1_sub_id
  FROM covenant_submissions cs
  JOIN loan_covenants lc ON cs.covenant_id = lc.id
  WHERE cs.loan_id = v_507_loan_id
    AND lc.covenant_type = 'rent_roll'
    AND cs.period_label = 'Q1 2026';

  -- Move entries from Q1 2026 to Q4 2025
  UPDATE rent_roll_entries
  SET submission_id = v_507_q4_sub_id
  WHERE submission_id = v_507_q1_sub_id;

  -- Update Q4 2025 submission with full metadata
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2026-01-15',
      metadata = jsonb_build_object('annual_rent', 1011068.40, 'total_sqm', 4610, 'source', '87 Jorishof - Overzicht opbrengst en expiratie.pdf')
  WHERE id = v_507_q4_sub_id;

  -- Reset Q1 2026 back to pending
  UPDATE covenant_submissions
  SET status = 'pending',
      received_at = NULL,
      metadata = '{}'::jsonb
  WHERE id = v_507_q1_sub_id;

  RAISE NOTICE 'RAX507: Moved rent roll entries from Q1 2026 to Q4 2025';

  -- ============ RAX504: Move entries from Q1 2026 → Q4 2025 ============
  SELECT id INTO v_504_loan_id FROM loans WHERE loan_id = '504';

  SELECT cs.id INTO v_504_q4_sub_id
  FROM covenant_submissions cs
  JOIN loan_covenants lc ON cs.covenant_id = lc.id
  WHERE cs.loan_id = v_504_loan_id
    AND lc.covenant_type = 'rent_roll'
    AND cs.period_label = 'Q4 2025';

  SELECT cs.id INTO v_504_q1_sub_id
  FROM covenant_submissions cs
  JOIN loan_covenants lc ON cs.covenant_id = lc.id
  WHERE cs.loan_id = v_504_loan_id
    AND lc.covenant_type = 'rent_roll'
    AND cs.period_label = 'Q1 2026';

  -- Move entries from Q1 2026 to Q4 2025
  UPDATE rent_roll_entries
  SET submission_id = v_504_q4_sub_id
  WHERE submission_id = v_504_q1_sub_id;

  -- Change Q4 2025 from not_applicable to received
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2025-09-25',
      notes = NULL,
      metadata = jsonb_build_object('annual_rent', 720000.00, 'total_sqm', NULL, 'source', '20250904 AllongeHema Den Bosch + bijlagen nieuw let op.pdf')
  WHERE id = v_504_q4_sub_id;

  -- Reset Q1 2026 back to pending
  UPDATE covenant_submissions
  SET status = 'pending',
      received_at = NULL,
      metadata = '{}'::jsonb
  WHERE id = v_504_q1_sub_id;

  RAISE NOTICE 'RAX504: Moved rent roll entries from Q1 2026 to Q4 2025';

  -- ============ RAX493: New entry under Q4 2025 ============
  SELECT id INTO v_493_loan_id FROM loans WHERE loan_id = '493';

  SELECT cs.id INTO v_493_q4_sub_id
  FROM covenant_submissions cs
  JOIN loan_covenants lc ON cs.covenant_id = lc.id
  WHERE cs.loan_id = v_493_loan_id
    AND lc.covenant_type = 'rent_roll'
    AND cs.period_label = 'Q4 2025';

  IF v_493_q4_sub_id IS NULL THEN
    RAISE EXCEPTION 'No Q4 2025 rent_roll submission found for loan 493';
  END IF;

  -- Clear any existing entries
  DELETE FROM rent_roll_entries WHERE submission_id = v_493_q4_sub_id;

  -- Insert Inproba B.V. entry (owner-occupied)
  INSERT INTO rent_roll_entries (submission_id, loan_id, tenant_name, sqm, annual_rent, lease_start, lease_end, notice_period, renewal_period, notes, reference_document) VALUES
    (v_493_q4_sub_id, v_493_loan_id, 'Inproba B.V.', NULL, 986652.00, '2025-09-01', '2030-08-31', '12 maanden', '2 x 5 jaar, daarna doorlopend 5 jaar', 'Eigen gebruik (owner-occupied). Triple net lease. Hermesweg 17, Baarn. Distributiecentrum/magazijn/productie/kantoor. Indexering jaarlijks per 1 jan (eerste 2026). Getekend 25-09-2025.', '20250925 Lease agreement office Inproba Beheer BV.pdf');

  -- Change Q4 2025 from not_applicable to received
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2025-09-25',
      notes = NULL,
      metadata = jsonb_build_object('annual_rent', 986652.00, 'total_sqm', NULL, 'source', '20250925 Lease agreement office Inproba Beheer BV.pdf')
  WHERE id = v_493_q4_sub_id;

  RAISE NOTICE 'RAX493: Inserted 1 rent roll entry for Q4 2025';
END $$;
