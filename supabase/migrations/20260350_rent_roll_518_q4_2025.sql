-- Rent roll upload: RAX518 Q4 2025
-- Source: "518 - WALT en Huurlijst vRF.xlsx", reference date 6 March 2026
-- 8 tenant groups across Amsterdam, Almere, Amersfoort
-- Total annual rent: €1,089,533
-- WALT: 3.31 years (all tenants) / 3.99 years (excl. rolling/notional)

DO $$
DECLARE
  v_loan_id uuid;
  v_submission_id uuid;
BEGIN
  SELECT id INTO v_loan_id FROM loans WHERE loan_id = '518';

  SELECT cs.id INTO v_submission_id
  FROM covenant_submissions cs
  JOIN loan_covenants lc ON cs.covenant_id = lc.id
  WHERE cs.loan_id = v_loan_id
    AND lc.covenant_type = 'rent_roll'
    AND cs.period_label = 'Q4 2025';

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'No Q4 2025 rent_roll submission found for loan 518';
  END IF;

  DELETE FROM rent_roll_entries WHERE submission_id = v_submission_id;

  INSERT INTO rent_roll_entries (submission_id, loan_id, tenant_name, sqm, annual_rent, lease_start, lease_end, notice_period, renewal_period, notes, reference_document) VALUES
    -- Amsterdam - Ruysdaelstraat
    (v_submission_id, v_loan_id, 'Hendrik Amsterdam B.V.', NULL, 129600.00, '2025-05-01', '2035-04-30', NULL, '5+5 jaar', 'Ruysdaelstraat 50-56, Amsterdam (restaurant). HOVK 06-02-2025. 10 jaar vast.', '518 - WALT en Huurlijst vRF.xlsx'),
    (v_submission_id, v_loan_id, 'VOF AV Restaurants (Elysianne)', NULL, 44636.00, '2024-09-01', '2029-08-31', '6 maanden', '5+5 jaar', 'Ruysdaelstraat 48-parterre, Amsterdam (bedrijfsruimte). Art. 7:290 BW. ACHTERSTAND €28.140 per 05-01-2026. Deurwaarder (Payq) sinds 19-05-2025. Geen betalingen sinds okt 2025.', '518 - WALT en Huurlijst vRF.xlsx'),
    (v_submission_id, v_loan_id, 'Can''t Do Without B.V.', NULL, 68821.00, '2008-09-01', '2028-08-31', NULL, '5 jaar', 'Cornelis Schuystraat 12H, Amsterdam (winkel). Art. 7:290 BW. Rolling 5jr extensions. Index 01-09-2026.', '518 - WALT en Huurlijst vRF.xlsx'),

    -- Almere - Radioweg
    (v_submission_id, v_loan_id, 'Stichting Pluryn (groepswoningen)', NULL, 384750.00, '2026-01-01', '2028-12-31', NULL, NULL, 'Radioweg 37-47, Almere. Allonge 3: verlengd 01-01-2026 t/m 31-12-2028. €32.062,50/mnd. Alle facturen betaald t/m jan 2026.', '518 - WALT en Huurlijst vRF.xlsx'),
    (v_submission_id, v_loan_id, 'Stichting Pluryn (kantoor)', NULL, 79726.00, '2026-01-01', '2028-12-31', NULL, NULL, 'Radioweg 33, Almere. Allonge 2 (18-03-2025): verlengd t/m 31-12-2028. Huur gecorrigeerd van €72k naar €79.726 (€6.643,81/mnd).', '518 - WALT en Huurlijst vRF.xlsx'),
    (v_submission_id, v_loan_id, 'Thexton Armstrong Schulte (B.H. Schulte)', 86, 13917.00, '2017-06-01', NULL, '3 maanden', '1 jaar doorlopend', 'Radioweg 6, Almere (kantoor). €161,83/m². Huur gecorrigeerd van €10.480 naar €13.917.', '518 - WALT en Huurlijst vRF.xlsx'),
    (v_submission_id, v_loan_id, 'Omega Groep B.V.', 59, 5316.00, '2025-01-01', NULL, '3 maanden', '1 jaar doorlopend', 'Radioweg 4 kamer 1.16, Almere. Voorheen Emmagroep. €443/mnd. NB: Discrepantie met Hoen (unit 1.07a, 23,7m², €361,83/mnd) — verifiëren.', '518 - WALT en Huurlijst vRF.xlsx'),
    (v_submission_id, v_loan_id, 'Diverse huurders (Radioweg 2-6 overig)', NULL, 152767.00, NULL, NULL, NULL, NULL, 'Radioweg 2-6, Almere. Residueel: totaal Radioweg €172k minus Thexton €13.917 minus Omega €5.316. Geen individuele contracten.', '518 - WALT en Huurlijst vRF.xlsx'),

    -- Amersfoort - Bachweg
    (v_submission_id, v_loan_id, 'Diverse huurders (woningen)', NULL, 210000.00, NULL, NULL, NULL, NULL, 'Bachweg 125-183, Amersfoort. 19 woningen onbepaalde tijd. Gem. €11k/unit. Uitpondstrategie.', '518 - WALT en Huurlijst vRF.xlsx');

  -- Mark submission as received
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2026-03-06',
      metadata = jsonb_build_object(
        'annual_rent', 1089533,
        'total_sqm', NULL,
        'walt', 3.31,
        'walt_excl_rolling', 3.99,
        'source', '518 - WALT en Huurlijst vRF.xlsx',
        'flags', 'AV Restaurants arrears €28k; Omega discrepancy; Radioweg overig no leases; Bachweg no leases'
      )
  WHERE id = v_submission_id;

  RAISE NOTICE 'RAX518: Inserted 9 rent roll entries for Q4 2025 (total €1,089,533)';
END $$;
