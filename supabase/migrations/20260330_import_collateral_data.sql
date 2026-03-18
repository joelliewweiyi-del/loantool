-- Auto-generated from Zekerhedenlijst RED IV.xlsx
-- Run: node scripts/parse-collateral-xlsx.mjs

DO $$
DECLARE
  v_loan_uuid uuid;
  v_admin_id uuid;
BEGIN
  -- Use the first admin user as created_by
  SELECT ur.user_id INTO v_admin_id FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1;
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'No admin user found'; END IF;

  -- Loan 505 (4 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '505';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Zeist', 'A', '4033', '49,421', 'eigendom', '2025-09-11', 4900000, 'Den Dolder', 'Soestdijkerweg 17 (3734MG), Den Dolder', 'Prins Hendriksoord B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Zeist', 'A', '4001', '264', 'eigendom', '2025-09-11', 4900000, 'Den Dolder', 'Soestdijkerweg 17 (3734MG), Den Dolder', 'Prins Hendriksoord B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Baarn', 'D', '579', '3,805', 'eigendom', '2025-09-11', 4900000, 'Den Dolder', 'Soestdijkerweg 17 (3734MG), Den Dolder', 'Prins Hendriksoord B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Baarn', 'F', '640', '620', 'eigendom', '2025-09-11', 49000000, 'Den Dolder', 'Soestdijkerweg 17 (3734MG), Den Dolder', 'Prins Hendriksoord B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.loan_guarantors (loan_id, guarantor_name, guarantee_cap, status, created_by)
    VALUES (v_loan_uuid, 'Feike Siewertsz van Reesema', NULL, 'active', v_admin_id);
  END IF;

  -- Loan 504 (1 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '504';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Den Bosch', 'G', '6916', '1,308', 'eigendom', '2025-10-15', 11200000, 'Den Bosch', 'Pensmarkt 36 (5211 JT), Den Bosch', 'Pensmarkt Retail B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.loan_guarantors (loan_id, guarantor_name, guarantee_cap, status, created_by)
    VALUES (v_loan_uuid, 'Murat Tastan', NULL, 'active', v_admin_id);
  END IF;

  -- Loan 507 (2 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '507';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Ridderkerk', 'H', '7614-A (app-index 1)', NULL, 'appartementsrecht', '2025-10-03', 10500000, 'Ridderkerk', 'Sint Jorisplein (zonder nummer), Ridderkerk', 'Jorishof Ridderkerk C.V.; St. Beheer en Bewaar Jorishof Ridderkerk', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Ridderkerk', 'H', '7614-A (app-index 1)', NULL, 'appartementsrecht', '2025-10-03', 10500000, 'Ridderkerk', 'Sint Jorisplein 50-92 (2981 GC), Ridderkerk', 'Jorishof Ridderkerk C.V.; St. Beheer en Bewaar Jorishof Ridderkerk', NULL, 'active', v_admin_id);
  END IF;

  -- Loan 510 (66 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '510';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 98', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraat 38, 1398 AW', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2318', '75', 'recht_van_opstal', '2025-10-06', 14000000, 'Muiden', 'Zeestraat & Hellingstraat', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2607', '10', 'recht_van_opstal', '2025-10-06', 14000000, 'Muiden', 'Zeestraat & Hellingstraat', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2640', '347', 'recht_van_opstal', '2025-10-06', 14000000, 'Muiden', 'Zeestraat & Hellingstraat', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2682', '3,914', 'recht_van_opstal', '2025-10-06', 14000000, 'Muiden', 'Zeestraat & Hellingstraat', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2699', '1', 'recht_van_opstal', '2025-10-06', 14000000, 'Muiden', 'Zeestraat & Hellingstraat', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2701', '48', 'recht_van_opstal', '2025-10-06', 14000000, 'Muiden', 'Zeestraat & Hellingstraat', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 99', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat 40, 1398 AW', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 101', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat 42, 1398 AW', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 102', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat 44A, 1398 AW', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 106', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat 52A, 1398 AW', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 107', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat 52, 1398 AW', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 109', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat 74, 1398 AW', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 110', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat 78, 1398 AW', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 111', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat 76, 1398 AW', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 112', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat 80A, 1398 AW', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 113', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat 80, 1398 AW', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 116', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat 84A, 1398 AW', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 30', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 31', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 32', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 33', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 34', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 35', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 36', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 37', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 38', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 39', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 40', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 41', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 42', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 43', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 55', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 56', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 63', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 64', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 67', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 82', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 93', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 95', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 96', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 97', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 122', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2703-A, 123', NULL, 'appartementsrecht', '2025-10-06', 14000000, 'Muiden', 'Hellingstraaat (ongenummerd)', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2712', '463', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2713', '429', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2714', '268', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2715', '499', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2716', '10', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2717', '10', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2718', '10', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2719', '11', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2720', '10', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2721', '10', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2722', '12', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2723', '171', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2724', '167', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2725', '167', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2726', '216', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2316', '55', 'erfpacht', '2025-10-06', 14000000, 'Muiden', 'Gelegen ten noorden van het Remmingswerk van de Groote Zeesluis', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2356', '2,120', 'erfpacht', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2606', '37', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2609', '191', 'eigendom', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2683', '72', 'erfpacht', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2684', '38', 'erfpacht', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Muiden', 'B', '2685', '40', 'erfpacht', '2025-10-06', 14000000, 'Muiden', 'Plaatselijk niet nader aangeduid', 'Schoutenwerf B.V., Schoutenhaven B.V.', NULL, 'active', v_admin_id);
  END IF;

  -- Loan 509 (1 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '509';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Rotterdam', 'Q', '4075', '945', 'erfpacht', '2025-10-09', 2800000, 'Rotterdam', 'Rosestraat 123 (3071 JP)', 'Varod Street B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.loan_guarantors (loan_id, guarantor_name, guarantee_cap, status, created_by)
    VALUES (v_loan_uuid, 'R.I. Kremer', 280000, 'active', v_admin_id);
  END IF;

  -- Loan 511 (23 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '511';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Hilversum', 'K', '722', '3655', 'eigendom', '2025-10-31', 3500000, 'Hilversum', 'Sparrenlaan 28', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'K', '2940-A, app.index 1', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Westhavenweg 57A', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'K', '2940-A, app.index 8', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Westhavenweg 57D', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'L', '9020-A, app.index 5', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Rozengracht 232C', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Emmeloord', 'A', '2420-A, app.index 6', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Emmeloord', 'Verlengde Gildenweg 11F', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Emmeloord', 'A', '2420-A, app.index 17', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Emmeloord', 'Verlengde Gildenweg 11Q', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'AB', '2480-A, app.index 5', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Argonautenstraat 14-1', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'AB', '2464-A, app.index 1', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Argonautenstraat 8H', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'AB', '2464-A, app.index 3', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Argonautenstraat 8-2', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'O', '2425-A, app.index 15', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Groenendaalstraat 44-2', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'O', '2594-A, app.index 10', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Sasssenheimstraat 44-1', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'C', '10885-A, app.index 7', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Van Brakelstraat 36-3', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'Y', '3839-A, app.index 1', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Van der Hoopstraat 111-H', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'T', '6293-A, app.index 4', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Wilhelminastraat 144-3', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'I', '10964-A, app.index 3', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Utrechtsedwarsstraat 45-2', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'I', '10964-A, app.index 4', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Utrechtsedwarsstraat 45-3', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'P', '1089-A, app.index 2', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Zonnelaan 10', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'U', '10692-A, app.index 3', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Zeilstraat 25-2', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'T', '6574-A, app.index 4', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Ten Katestraat 28-3', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'Q', '9137-A, app.index 3', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Van Oldenbarneveldtstraat 31-2', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'L', '9239-A, app.index 8', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Westerstraat 216-2', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'L', '9239-A, app.index 9', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Westerstraat 216-3', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'O', '2766-A, app.index 4', NULL, 'appartementsrecht', '2025-10-31', 3500000, 'Amsterdam', 'Westlandgracht 101-3', 'Levasu B.V., Exploitatiemaatschappij Levasu B.V.', NULL, 'active', v_admin_id);
  END IF;

  -- Loan 514 (1 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '514';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'K', '8669', '138', 'erfpacht', '2025-10-31', 1260000, 'Amsterdam', 'Meeuwenlaan 92, Spijkerkade 15 (1021 JL)', 'Knights Strategy B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.loan_guarantors (loan_id, guarantor_name, guarantee_cap, status, created_by)
    VALUES (v_loan_uuid, 'M.A. van Schaick', NULL, 'active', v_admin_id);
    INSERT INTO public.loan_guarantors (loan_id, guarantor_name, guarantee_cap, status, created_by)
    VALUES (v_loan_uuid, 'T.A. Offenberg', NULL, 'active', v_admin_id);
  END IF;

  -- Loan 493 (2 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '493';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Baarn', 'H', '2736', '10,395', 'eigendom', '2205-10-06', 10500000, 'Baarn', 'Hermesweg 17 en 17 T2 (3741 GP)', 'Inproba Beheer B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Baarn', 'H', '2738', '5,030', 'eigendom', '2025-10-06', 10500000, 'Baarn', 'Hermesweg 19 (3741 GP)', 'Inproba Beheer B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.loan_guarantors (loan_id, guarantor_name, guarantee_cap, status, created_by)
    VALUES (v_loan_uuid, 'VEP Fund 4 Coöperatief U.A.', 1000000, 'active', v_admin_id);
  END IF;

  -- Loan 520 (2 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '520';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Oss', 'B', '6494', '22,058', 'eigendom', '2025-12-19', 16000000, 'Oss', 'Vorstengrafdonk 4 (5342 LR) en Paalgravenlaan 14 (5342 LT)', 'Castor Beheer B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Oss', 'B', '6496', '4,475', 'eigendom', '2025-12-19', 16000000, 'Oss', 'Vorstengrafdonk 4 (5342 LR) en Paalgravenlaan 14 (5342 LT)', 'Castor Beheer B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.loan_guarantors (loan_id, guarantor_name, guarantee_cap, status, created_by)
    VALUES (v_loan_uuid, 'H.G.L. van Veghel (privé)', NULL, 'active', v_admin_id);
  END IF;

  -- Loan 513 (9 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '513';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Den Bosch', 'I', '2407', '9', 'eigendom', '2025-12-18', 14000000, 'Den Bosch', 'Vughterweg 47 A-L (5211 CK)', 'St. Fort Sint Anthonie', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Den Bosch', 'S', '478', '593', 'eigendom', '2025-12-18', 14000000, 'Den Bosch', 'Vughterweg 47 A-L (5211 CK)', 'St. Fort Sint Anthonie', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Den Bosch', 'S', '481', '488', 'eigendom', '2025-12-18', 14000000, 'Den Bosch', 'Vughterweg 47 A-L (5211 CK)', 'St. Fort Sint Anthonie', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Den Bosch', 'S', '567', '130', 'eigendom', '2025-12-18', 14000000, 'Den Bosch', 'Vughterweg 47 A-L (5211 CK)', 'St. Fort Sint Anthonie', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Den Bosch', 'S', '640', '2,475', 'eigendom', '2025-12-18', 14000000, 'Den Bosch', 'Vughterweg 47 A-L (5211 CK)', 'St. Fort Sint Anthonie', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Den Bosch', 'S', '641', '290', 'eigendom', '2025-12-18', 14000000, 'Den Bosch', 'Vughterweg 47 A-L (5211 CK)', 'St. Fort Sint Anthonie', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Den Bosch', 'S', '763', '404', 'eigendom', '2025-12-18', 14000000, 'Den Bosch', 'Vughterweg 47 A-L (5211 CK)', 'St. Fort Sint Anthonie', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Den Bosch', 'S', '764', '1,109', 'eigendom', '2025-12-18', 14000000, 'Den Bosch', 'Vughterweg 47 A-L (5211 CK)', 'St. Fort Sint Anthonie', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Den Bosch', 'S', '1326', '1,233', 'eigendom', '2025-12-18', 14000000, 'Den Bosch', 'Vughterweg 47 A-L (5211 CK)', 'St. Fort Sint Anthonie', NULL, 'active', v_admin_id);
  END IF;

  -- Loan 515 (10 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '515';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Utrecht', 'O', '1381-A, 2', NULL, 'appartementsrecht', '2023-12-27', 16800000, 'Utrecht', 'Herculesplein (ongenummerd)', 'Galgenwaard Development B.V.', 'Bedrag garant (500k) niet in hypotheekakte; overname RED III', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Utrecht', 'O', '1365', '22,975', 'erfpacht', '2023-12-27', 16800000, 'Utrecht', 'Herculesplein (ongenummerd)', 'Galgenwaard Development B.V.', 'Bedrag garant (500k) niet in hypotheekakte; overname RED III', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Utrecht', 'O', '1376', '5,825', 'eigendom', '2023-12-27', 16800000, 'Utrecht', 'Herculesplein (ongenummerd)', 'Galgenwaard Development B.V.', 'Bedrag garant (500k) niet in hypotheekakte; overname RED III', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Utrecht', 'O', '1374', '92', 'eigendom', '2023-12-27', 16800000, 'Utrecht', 'Herculesplein (ongenummerd)', 'Galgenwaard Development B.V.', 'Bedrag garant (500k) niet in hypotheekakte; overname RED III', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Utrecht', 'O', '1107', '865', 'erfpacht', '2023-12-27', 16800000, 'Utrecht', 'Herculesplein (ongenummerd)', 'Galgenwaard Development B.V.', 'Bedrag garant (500k) niet in hypotheekakte; overname RED III', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Utrecht', 'O', '1118', '773', 'erfpacht', '2023-12-27', 16800000, 'Utrecht', 'Herculesplein (ongenummerd)', 'Galgenwaard Development B.V.', 'Bedrag garant (500k) niet in hypotheekakte; overname RED III', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Utrecht', 'O', '1362', '1,155', 'erfpacht', '2023-12-27', 16800000, 'Utrecht', 'Herculesplein 261 - 271 (oneven), 3584 AA', 'Galgenwaard Development B.V.', 'Bedrag garant (500k) niet in hypotheekakte; overname RED III', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Utrecht', 'O', '1360', '1,160', 'erfpacht', '2023-12-27', 16800000, 'Utrecht', 'Herculesplein 351 - 361 (oneven), 3584 AA', 'Galgenwaard Development B.V.', 'Bedrag garant (500k) niet in hypotheekakte; overname RED III', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Utrecht', 'O', '1361', '1,145', 'erfpacht', '2023-12-27', 16800000, 'Utrecht', 'Herculesplein 303 - 313 (oneven), 3584 AA', 'Galgenwaard Development B.V.', 'Bedrag garant (500k) niet in hypotheekakte; overname RED III', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Utrecht', 'O', '1381-A, 1', NULL, 'appartementsrecht', '2023-12-27', 16800000, 'Utrecht', 'Herculesplein (ongenummerd)', 'Galgenwaard Development B.V.', 'Bedrag garant (500k) niet in hypotheekakte; overname RED III', 'active', v_admin_id);
    INSERT INTO public.loan_guarantors (loan_id, guarantor_name, guarantee_cap, status, created_by)
    VALUES (v_loan_uuid, 'Jongerius Invest B.V.', NULL, 'active', v_admin_id);
  END IF;

  -- Loan 484 (2 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '484';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Utrecht', 'B', '5681', '1,072', 'eigendom', '2022-12-15', 14700000, 'Utrecht', 'Oudenoord 330, 3513EX', 'Hermon Erfgoed BV', 'Overname RED III', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Utrecht', 'B', '4111', '1,749', 'eigendom', '2022-12-15', 14700000, 'Utrecht', 'Oudenoord 340, 3513EX', 'Hermon Erfgoed BV', 'Overname RED III', 'active', v_admin_id);
  END IF;

  -- Loan 522 (5 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '522';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Oud-Zevenaar', 'C', '2917', '1,980', 'eigendom', '2026-01-21', 5600000, 'Zevenaar', 'Babberichseweg, ongenummerd', 'Office Centre Schiphol West I B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Oud-Zevenaar', 'C', '3052', '12,050', 'eigendom', '2026-01-21', 5600000, 'Zevenaar', 'Babberichseweg, ongenummerd', 'Office Centre Schiphol West I B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Oud-Zevenaar', 'C', '3053', '8,000', 'eigendom', '2026-01-21', 5600000, 'Zevenaar', 'Babberichseweg, ongenummerd', 'Office Centre Schiphol West I B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Oud-Zevenaar', 'C', '3056', '5,320', 'eigendom', '2026-01-21', 5600000, 'Zevenaar', 'Babberichseweg, ongenummerd', 'Office Centre Schiphol West I B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Zevenaar', 'A', '2323', '27,510', 'eigendom', '2026-01-21', 5600000, 'Zevenaar', 'Babberichseweg, ongenummerd', 'Office Centre Schiphol West I B.V.', NULL, 'active', v_admin_id);
  END IF;

  -- Loan 518 (11 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '518';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'U', '10834-A index 2', '3/100 aandeel', 'appartementsrecht', '2026-01-22', 7000000, 'Amsterdam', 'Ruysdaelstraat 46', 'Saffier Vastgoed I B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'U', '10834-A index 3', '13/100 aandeel', 'eigendom', '2026-01-22', 7000000, 'Amsterdam', 'Ruysdaelstraat 48-50', 'Saffier Vastgoed I B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'U', '10834-A index 4', '17/100 aandeel', 'eigendom', '2026-01-22', 7000000, 'Amsterdam', 'Ruysdaelstraat 54-56', 'Saffier Vastgoed I B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'U', '10575-A index 1', '1/3 aandeel', 'eigendom', '2026-01-22', 7000000, 'Amsterdam', 'Cornelis Schuytstraat 12-H', 'Saffier Vastgoed I B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Almere', 'K', '6240', '18.761 m²', 'eigendom', '2026-01-22', 7000000, 'Almere', 'Radioweg 37-47', 'Saffier Vastgoed II B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Almere', 'K', '7723', '1.003 m²', 'eigendom', '2026-01-22', 7000000, 'Almere', 'Radioweg parkeerterrein', 'Saffier Vastgoed II B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Almere', 'K', '7740', '470 m²', 'eigendom', '2026-01-22', 7000000, 'Almere', 'Radioweg 33', 'Saffier Vastgoed II B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Almere', 'K', '7744', '198 m²', 'eigendom', '2026-01-22', 7000000, 'Almere', 'Radioweg parkeerplaats', 'Saffier Vastgoed II B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Almere', 'G', '3921-A index 1', '2/3 aandeel', 'eigendom', '2026-01-22', 7000000, 'Almere', 'Radioweg 2-4', 'Saffier Vastgoed II B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Almere', 'G', '3921-A index 2', '1/3 aandeel', 'eigendom', '2026-01-22', 7000000, 'Almere', 'Radioweg 6', 'Saffier Vastgoed II B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amersfoort', 'G', 'Diverse (Bachweg complex)', 'meerdere', 'erfpacht', '2026-01-22', 7000000, 'Amersfoort', 'Bachweg / Heiligenbergerweg complex', 'Diamant OG II B.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.loan_guarantors (loan_id, guarantor_name, guarantee_cap, status, created_by)
    VALUES (v_loan_uuid, 'Jan Wieger van der Linden', 5000000, 'active', v_admin_id);
  END IF;

  -- Loan 526 (2 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '526';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Oude Ijsselmondsehoofd', 'D', '4650', '820', 'eigendom', '2026-02-17', 5880000, 'Rotterdam', 'Oude Ijsselmondsehoofd 49, 362, 364 (3077BR)', 'Waterside Beheer B.V.; Waterside C.V.', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Oude Ijsselmondsehoofd', 'D', '6635', '2,460', 'eigendom', '2026-02-17', 5880000, 'Rotterdam', 'Oude Ijsselmondsehoofd 8 t/m 370 even nummers (3077BR)', 'Waterside Beheer B.V.; Waterside C.V.', NULL, 'active', v_admin_id);
  END IF;

  -- Loan 527 (11 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '527';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Vught', 'H', '1518', '6,190', 'eigendom', '2026-02-10', 4200000, 'Cromvoirt', 'Pepereind 13B', 'PRST B.V.; PRSG B.V.', 'Overname RED III (voorheen 479)', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Vught', 'H', '1839', '1,470', 'eigendom', '2026-02-10', 4200000, 'Cromvoirt', 'Pepereind 13B', 'PRST B.V.; PRSG B.V.', 'Overname RED III (voorheen 479)', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Vught', 'H', '2022', '25,722', 'eigendom', '2026-02-10', 4200000, 'Cromvoirt', 'Pepereind 13B', 'PRST B.V.; PRSG B.V.', 'Overname RED III (voorheen 479)', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Vught', 'H', '2053', '4,825', 'eigendom', '2026-02-10', 4200000, 'Cromvoirt', 'Pepereind 13B', 'PRST B.V.; PRSG B.V.', 'Overname RED III (voorheen 479)', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Vught', 'H', '2060', '114', 'eigendom', '2026-02-10', 4200000, 'Cromvoirt', 'Pepereind 13B', 'PRST B.V.; PRSG B.V.', 'Overname RED III (voorheen 479)', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Vught', 'H', '2061', '29,315', 'eigendom', '2026-02-10', 4200000, 'Cromvoirt', 'Pepereind 13B', 'PRST B.V.; PRSG B.V.', 'Overname RED III (voorheen 479)', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Vught', 'H', '2065', '930', 'eigendom', '2026-02-10', 4200000, 'Cromvoirt', 'Pepereind 13B', 'PRST B.V.; PRSG B.V.', 'Overname RED III (voorheen 479)', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Vught', 'H', '1721', '13,440', 'eigendom', '2026-02-10', 4200000, 'Cromvoirt', 'Nabij Cromvoirtsedijk (ongenummerd) - perceel cultuurgrond', 'PRST B.V.; PRSG B.V.', 'Overname RED III (voorheen 479)', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Vught', 'H', '1722', '13,250', 'eigendom', '2026-02-10', 4200000, 'Cromvoirt', 'Nabij Cromvoirtsedijk (ongenummerd) - perceel cultuurgrond', 'PRST B.V.; PRSG B.V.', 'Overname RED III (voorheen 479)', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Vught', 'H', '1724', '71', 'eigendom', '2026-02-10', 4200000, 'Cromvoirt', 'Nabij Cromvoirtsedijk (ongenummerd) - perceel cultuurgrond', 'PRST B.V.; PRSG B.V.', 'Overname RED III (voorheen 479)', 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Vught', 'H', '2169', '2,480', 'eigendom', '2026-02-10', 4200000, 'Cromvoirt', 'Pepereind 13A, 5266AJ', 'PRST B.V.; PRSG B.V.', 'Overname RED III (voorheen 479)', 'active', v_admin_id);
    INSERT INTO public.loan_guarantors (loan_id, guarantor_name, guarantee_cap, status, created_by)
    VALUES (v_loan_uuid, 'B.J.M. van de Ven', 3500000, 'active', v_admin_id);
  END IF;

  -- Loan 528 (4 parcels)
  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '528';
  IF v_loan_uuid IS NOT NULL THEN
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Uithoorn', 'B', '9156', '3,450', 'eigendom', '2026-03-16', 4900000, 'Uithoorn', 'Amsteldijk-Noord 35, 1422 XX', 'By The River B.V.; Ori Ben Yakir', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Uithoorn', 'B', '9155', '720', 'eigendom', '2026-03-16', 4900000, 'Uithoorn', 'Amsteldijk-Noord 35, 1422 XX', 'By The River B.V.; Ori Ben Yakir', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'K', '8085', '2,760', 'erfpacht', '2026-03-16', 4900000, 'Amsterdam', 'Spijkerkade 2 & 3, 1021 JS en Gedempt Hamerkanaal 86, 1021 KR', 'By The River B.V.; Ori Ben Yakir', NULL, 'active', v_admin_id);
    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)
    VALUES (v_loan_uuid, 'Amsterdam', 'K', '7259', '414', 'erfpacht', '2026-03-16', 4900000, 'Amsterdam', 'Spijkerkade 2, 1021 JS', 'By The River B.V.; Ori Ben Yakir', NULL, 'active', v_admin_id);
  END IF;

END $$;