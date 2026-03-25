-- Rent roll upload: RAX520 (Oss — Castor Beheer / Pollux Holding) Q4 2025
-- Source: 3 lease contracts from docs/rent rolls/oss/
-- 2 tenants: Dollevoet (Paalgravenlaan 14) + Meubi-Trend (Vorstengrafdonk 4)
-- Combined annual rent: €1,500,000 excl. BTW

DO $$
DECLARE
  v_loan_id uuid;
  v_submission_id uuid;
BEGIN
  SELECT id INTO v_loan_id FROM loans WHERE loan_id = '520';

  SELECT cs.id INTO v_submission_id
  FROM covenant_submissions cs
  JOIN loan_covenants lc ON cs.covenant_id = lc.id
  WHERE cs.loan_id = v_loan_id
    AND lc.covenant_type = 'rent_roll'
    AND cs.period_label = 'Q4 2025';

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'No Q4 2025 rent_roll submission found for loan 520';
  END IF;

  DELETE FROM rent_roll_entries WHERE submission_id = v_submission_id;

  INSERT INTO rent_roll_entries (submission_id, loan_id, tenant_name, sqm, annual_rent, lease_start, lease_end, notice_period, renewal_period, notes, reference_document) VALUES
    -- Paalgravenlaan 14, Oss — Dollevoet
    (v_submission_id, v_loan_id, 'Expeditie- en Transportbedrijf Dollevoet B.V.', 8765, 650000.00, '2026-04-01', '2031-09-30', '12 maanden', '5 jaar', 'Paalgravenlaan 14, 5342 LR Oss. Verhuurder: Castor Beheer B.V. KvK 16056004. 7.508m² magazijn + 219m² kantoor + 1.038m² mezzanine + parkeren. Breakoptie na 3,5 jaar (per 01-05-2029, 12 mnd opzegtermijn). Indexatie jaarlijks per 1 juni (CPI, eerste 01-06-2027). Huurvrije periode conform betalingsschema. Getekend 13-14 dec 2025.', 'Huurovereenkomst Paalgravenlaan 14 te Oss (incl. bijlagen) - getekend.pdf'),
    -- Vorstengrafdonk 4, Oss — Meubi-Trend
    (v_submission_id, v_loan_id, 'Meubi-Trend B.V.', 13185, 850000.00, '2026-01-01', '2036-01-01', '12 maanden', '5 jaar', 'Vorstengrafdonk 4, 5342 LM Oss. Verhuurder: Castor Beheer B.V. + Pollux Holding B.V. KvK 56463820. Double net lease. Indexatie jaarlijks per 1 okt (CPI, max 3,5%, eerste 01-10-2026). Eerste termijn: alleen huurder kan opzeggen. Related party: H.G.L. van Veghel vertegenwoordigt beide partijen (via Protop Holding B.V.). Getekend 15 dec 2025.', 'hovk Vorstengrafdonk 4 te Oss Meubi Trend - getekend.pdf');

  -- Mark submission as received
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2025-12-15',
      metadata = jsonb_build_object(
        'annual_rent', 1500000,
        'total_sqm', 21950,
        'source', 'Lease contracts Oss (Dollevoet + Meubi-Trend)',
        'note', 'Dollevoet lease start 01-04-2026 (not yet commenced). Meubi-Trend related party transaction.'
      )
  WHERE id = v_submission_id;

  RAISE NOTICE 'RAX520: Inserted 2 rent roll entries for Q4 2025 (total €1,500,000)';
END $$;
