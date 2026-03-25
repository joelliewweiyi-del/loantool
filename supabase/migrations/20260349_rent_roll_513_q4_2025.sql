-- Rent roll upload: RAX513 (BTB VG / Fort Sint Anthonie, Vughterweg 47, 's-Hertogenbosch) Q4 2025
-- Source: "Huurovz BTB VG per 1-10-2025.pdf"
-- Reference date: 1 October 2025 (prepared 23 September 2025)
-- 17 tenants + 5 vacant parking spaces
-- Total lettable area: 6,417 m²
-- Using "totaal per jaar" column (rent + service costs + other revenue): €1,261,796.72

DO $$
DECLARE
  v_loan_id uuid;
  v_submission_id uuid;
BEGIN
  SELECT id INTO v_loan_id FROM loans WHERE loan_id = '513';

  SELECT cs.id INTO v_submission_id
  FROM covenant_submissions cs
  JOIN loan_covenants lc ON cs.covenant_id = lc.id
  WHERE cs.loan_id = v_loan_id
    AND lc.covenant_type = 'rent_roll'
    AND cs.period_label = 'Q4 2025';

  IF v_submission_id IS NULL THEN
    RAISE EXCEPTION 'No Q4 2025 rent_roll submission found for loan 513';
  END IF;

  DELETE FROM rent_roll_entries WHERE submission_id = v_submission_id;

  -- annual_rent = totaal per jaar (rent + service costs + other revenue)
  INSERT INTO rent_roll_entries (submission_id, loan_id, tenant_name, sqm, annual_rent, lease_start, lease_end, notice_period, renewal_period, notes, reference_document) VALUES
    (v_submission_id, v_loan_id, 'Wonen bij De Familie B.V.', 290, 69919.36, '2024-01-01', '2033-12-31', '31-12-2032', '5 jaar', 'Vughterweg 47 bg. 8 units. Kwartaal. Waarborgsom €22.590,94. 10% BTW compensatie. Huur €63.563,08 + servicekosten €6.356,28.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Standby Thuiszorg B.V.', 366, 72920.60, '2024-01-01', '2033-12-31', '31-12-2032', '5 jaar', 'Vughterweg 47, 1e etage. Kwartaal. Waarborgsom €24.810,23. 10% BTW compensatie. Huur €66.291,44 + servicekosten €6.629,16.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Standby Online B.V.', 366, 73428.52, '2024-01-01', '2033-12-31', '31-12-2032', '5 jaar', 'Vughterweg 47, 2e etage. Kwartaal. Waarborgsom €28.657,57.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Familie Immo B.V.', 354, 101303.16, '2022-07-01', '2033-12-31', '31-12-2032', '5 jaar', 'Vughterweg 47, 3e etage. Kwartaal. Waarborgsom €36.552,67.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Familie Immo B.V. (parkeren)', 0, 27174.20, '2022-07-01', '2033-12-31', '31-12-2032', '5 jaar', 'Vughterweg 47 parkeren. 35 plekken. Overige opbrengsten.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Van Hattum en Blankevoort B.V.', 1020, 206639.96, '2024-09-01', '2029-08-31', '30-11-2028', '5 jaar', 'Vughterweg 47-A. 42 units. Maandelijks. Waarborgsom €79.013,00.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Emma Solutions ICT B.V.', 488, 83506.56, '2022-08-01', '2026-10-31', '31-10-2025', '5 jaar', 'Vughterweg 47-B. 17 units. Maandelijks. Waarborgsom €30.744,87. Huur €79.161,84 + servicekosten €4.344,72.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Claassen, Moolenbeek & Partners', 150, 22184.64, '2018-01-01', '2027-12-31', '31-12-2026', '2 jaar', 'Vughterweg 47-G. 5 units. Kwartaal. Bankgarantie €3.246,86. Huur €19.855,92 + servicekosten €2.328,72.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Advocaten van Nu B.V.', 361, 61920.72, '2023-12-01', '2028-11-30', '30-11-2027', '5 jaar', 'Vughterweg 47-C. 9 units. Kwartaal. Waarborgsom €13.221,37.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Factor Finance B.V.', 253, 62045.64, '2007-06-01', '2027-05-31', '30-11-2026', '5 jaar', 'Vughterweg 47-H. 8 units (4 incl. + 4 extra). Maandelijks. Bankgarantie €13.885,82. Huur €58.431,24 + servicekosten €3.614,40.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Centrum Integrale Revalidatie (CIR)', 477, 93150.00, '2024-03-01', '2034-02-28', '31-05-2033', '5 jaar', 'Vughterweg 47-J. 10 units. Maandelijks. Bankgarantie €31.157,55. Indexatie tot 3%=100%, daarboven 50% met max 4%.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Screen Group BV', 350, 60201.36, '2023-12-15', '2028-12-31', '31-12-2027', '5 jaar', 'Vughterweg 47-F. 6 units. Maandelijks. Bankgarantie €23.434,14. Huur €56.209,08 + servicekosten €3.992,28.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Adelaer Real-Estate BV', 340, 60606.48, '2016-09-01', '2030-12-31', '31-12-2029', '5 jaar', 'Vughterweg 47-N. 8 units. Maandelijks. Geen zekerheid (n.v.t.). Huur €58.929,72 + servicekosten €1.676,76.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Zorg van de Zaak', 420, 67951.52, '2022-07-01', '2032-06-30', '30-06-2031', '5 jaar', 'Vughterweg 47-L. 8 units. Kwartaal. Corporate guarantee. 5% BTW compensatie. 3 mnd opzegtermijn. Huur €60.298,28 + servicekosten €4.417,48 + overige €3.235,76.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Mise en Place', 192, 31107.00, '2024-07-01', '2025-12-30', NULL, NULL, 'Vughterweg 47-P. 2 units. Maandelijks. Waarborgsom €12.523,50. OPGEZEGD (terminated).', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Weener XL', 360, 60267.24, '2022-07-01', '2027-06-30', '30-06-2026', '5 jaar', 'Vughterweg 47-R. 10 units. Kwartaal. Geen zekerheid (n.v.t.).', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Actief Holding B.V.', 630, 103719.76, '2023-01-01', '2028-12-31', '31-12-2027', '5 jaar', 'Vughterweg 47-K. 21 units. Kwartaal. Waarborgsom €34.528,75.', 'Huurovz BTB VG per 1-10-2025.pdf'),
    (v_submission_id, v_loan_id, 'Leegstand (parkeren)', 0, 3750.00, NULL, NULL, NULL, NULL, '5 vacante parkeerplaatsen.', 'Huurovz BTB VG per 1-10-2025.pdf');

  -- Mark submission as received
  UPDATE covenant_submissions
  SET status = 'received',
      received_at = '2025-10-01',
      metadata = jsonb_build_object(
        'annual_rent', 1261796.72,
        'total_sqm', 6417,
        'tenants', 17,
        'source', 'Huurovz BTB VG per 1-10-2025.pdf',
        'reference_date', '2025-10-01',
        'note', 'annual_rent = totaal per jaar (huur + servicekosten + overige opbrengsten)'
      )
  WHERE id = v_submission_id;

  RAISE NOTICE 'RAX513: Inserted 18 rent roll entries for Q4 2025 (totaal per jaar €1,261,796.72)';
END $$;
