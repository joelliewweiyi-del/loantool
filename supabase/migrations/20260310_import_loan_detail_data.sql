-- Import google_maps_url, kadastrale_kaart_url, photo_url, additional_info
-- from Loan tape RED IV 01-02-26.xlsx

UPDATE loans SET
  google_maps_url = 'https://maps.app.goo.gl/x385UQeZKvp2qAGQ6',
  kadastrale_kaart_url = 'https://kadastralekaart.com/kaart/perceel/LWR01/B/5681',
  photo_url = 'https://i.imgur.com/CeR2Uvu.png',
  additional_info = 'This financing concerns the redevelopment of an office property in Utrecht into a hotel and short-stay apartments. The asset is a former office building for which permits have been obtained to create roughly 40 hotel rooms and around 90 short-stay units, supported by a fixed-price construction contract and a signed operating agreement with an established local operator. The acquisition was previously financed under an earlier vehicle (RED III), which will be refinanced through this construction loan. The risk-bearing capital amounts to roughly 30 percent of the total investment. Construction risks are mitigated through third-party supervision and a cost-overrun guarantee. Operational risk relates mainly to the short-stay component but is supported by conservative assumptions and strong operator performance. Given the acceptable leverage metrics, solid location and clear value-creation strategy, this is considered an appropriate financing for RED IV.'
WHERE loan_id = '484';

UPDATE loans SET
  google_maps_url = 'https://maps.app.goo.gl/oSoxvhLHxdShkkwy6',
  kadastrale_kaart_url = 'https://kadastralekaart.com/kaart/perceel/BAA01/H/2736',
  photo_url = 'https://i.imgur.com/FcQ7Res.png',
  additional_info = E'Financing of a light-industrial warehouse in Baarn, near the A1-highway. Consists of 15.358m2 LFA (plot size 15.425m2). The property is in good condition and leased (owner-user) for \u20AC900.000 per annum; \u20AC59/m2 LFA. ICR 1,22 (based on a net income of \u20AC730.000 per annum).\n\nLTV (61%) is good, but to further guarantee a solid financing position we arranged a \u20AC1.000.000 guarantee from the sponsor. Overall, the transaction presents a well-structured and balanced financing facility with appropriate downside protection and a clear exit-optionality.\n\nLoan metrics are good. Overall, this is a responsible loan for RED IV.'
WHERE loan_id = '493';

UPDATE loans SET
  google_maps_url = 'https://maps.app.goo.gl/jZDJQvR6hmf9TUFt9',
  kadastrale_kaart_url = 'https://kadastralekaart.com/kaart/perceel/HTG00/G/6916',
  photo_url = 'https://i.imgur.com/0aZbpAD.png',
  additional_info = E'Acquisition financing of an A1-retail asset in Den Bosch (approx. 4.200m2 LFA divided over 5 layers). Borrower bought the property, in a share-transaction, for approx. \u20AC10.670.000. We finance \u20AC7.000.000 (65% LTV).\n\nThe property''s location is good. The property is leased to HEMA for \u20AC780.000 per annum. Recently, an extension of the lease contract has been signed. The new end-date is 01-11-2035, hence limiting vacancy risk during the loan period.\n\nThe borrower is an experienced entrepreneur and real estate investor. The borrower personally guarantees for this loan.\n\nLoan metrics are good. Overall, this is a responsible loan for RED IV.'
WHERE loan_id = '504';

UPDATE loans SET
  google_maps_url = 'https://maps.app.goo.gl/XgedgBv4umzfGicT9',
  kadastrale_kaart_url = 'https://kadastralekaart.com/kaart/perceel/ZEI00/A/4001',
  photo_url = 'https://i.imgur.com/sf08rQy.png',
  additional_info = E'Financing of the acquisition of an estate in Den Dolder. Purchase price \u20AC3.800.000.\n\nThis concerns the financing of a country estate consisting of a complex of buildings, a.o. a residual building, office wings, situated on a generous plot of 54,110 m\u00B2. The total gross floor area amounts to 1,563 m\u00B2. The estate has NSW-status, which provides favourable tax treatment (no transfer tax). The property is in good condition.\n\nBorrower intends to redevelop the estate, converting the office wing and the main residence into residential units:\n\u2022 10 affordable maisonette homes in the office wing (priced up to NHG cap / max. \u20AC450,000) \u2013 GO 574 m\u00B2\n\u2022 2 penthouses in former main residence \u2013 GO 260 m\u00B2\n\u2022 2 apartments in former main residence \u2013 GO 170 m\u00B2\n\u2022 Main villa \u2013 GO 462 m\u00B2\n\u2022 Garden/groundskeeper''s house \u2013 approx. 100 m\u00B2\n\nLoan metrics are strong. Even in the current as-is situation, the loan-to-cost level is responsible at 66% LTC, and the borrower provides a personal guarantee. Overall, this represents a responsible financing for RED IV.'
WHERE loan_id = '505';

UPDATE loans SET
  google_maps_url = 'https://maps.app.goo.gl/8vhTyidXzgWG7xhE7',
  kadastrale_kaart_url = 'https://kadastralekaart.com/kaart/perceel/RDK01/H/6686',
  photo_url = 'https://i.imgur.com/yuPTY3y.png',
  additional_info = E'Property, shopping centre, consists of 21 retail units and an underground Q-Park garage (140 spaces). Annual rental income \u20AC724.000 (excl. \u20AC170.000 service charges), WAULT 8.6 years, with HEMA as anchor tenant.\n\nBorrower will convert the former (vacant) library on the first floor into 38 healthcare-residential units (1.180 m\u00B2). Permit is irrevocable and all units are pre-leased to one healthcare operator (contract signed).\n\nWe finance the construction, but we hold the first mortgage right over the entire asset. Low leverage: 32% LTV. Borrower is a reputable and experienced real estate developer.\n\nConclusion: Low-risk loan backed by leased-retail cash flow and a secured, pre-leased healthcare redevelopment.'
WHERE loan_id = '507';

UPDATE loans SET
  google_maps_url = 'https://maps.app.goo.gl/FptBuZHcGyUDT5H86',
  kadastrale_kaart_url = 'https://kadastralekaart.com/kaart/perceel/RTD05/Q/4075',
  photo_url = 'https://i.imgur.com/QE6pVzd.png',
  additional_info = E'Financing of an office building (leasehold) in Rotterdam \u2013 Kop van Zuid.\nBorrower acquired the asset in 2024 for \u20AC2.250.000 (approx. 66% LTC).\n\nThe property comprises 1.646 m\u00B2 GFA (incl. 313 m\u00B2 basement) and 900 m\u00B2 usable area, across a basement, ground floor, two upper floors and an attic, on a 945 m\u00B2 plot. The building is fully leased to a large physiotherapy practice for ~\u20AC160,000 p.a.. Lease runs until Oct-2031.\n\nThe property has redevelopment potential. Borrower is progressing a hotel redevelopment plan and permit application, aligned with the municipal area vision. Zoning ("Gemengd \u2013 3") allows residential, office, commercial, social and hotel/hospitality uses. We finance on the as-is value.\n\nLocation and future potential enhance marketability. Rental income covers interest (ICR ~1.09) and borrower provides a personal guarantee. Overall, a low-risk financing with secure cash flow, solid collateral and (future) upside from redevelopment. Exit expected via refinancing upon permit approval.'
WHERE loan_id = '509';

UPDATE loans SET
  google_maps_url = 'https://maps.app.goo.gl/ZC6GoESnvdcv5QAb9',
  kadastrale_kaart_url = 'https://kadastralekaart.com/kaart/perceel/MDN01/B/2682',
  photo_url = 'https://i.imgur.com/LkntWiX.png',
  additional_info = E'Financing of the construction of phase 3 of this resi-project ("De Werf bij de Sluis in Muiden"). The construction of phase 2 is almost finished.\n\nThe project consists of high-end apartments located at the Vecht-river, including a sports-harbour.\n\nThe borrower is a well-capitalized and professional party with a good track-record in developing. The security comes from the underlying value of the assets which is partly the land position of Phase 3 and the unsold apartments of phase 2.\n\nLoan metrics are good. Overall, this is a responsible loan for RED IV.'
WHERE loan_id = '510';

UPDATE loans SET
  additional_info = E'The company requires temporary liquidity to bridge the period until completion of an ongoing refinancing process with a major bank. Several unencumbered assets are available as collateral, mainly residential units (split apartments) in Amsterdam, generating approximately \u20AC124,000 gross per year, complemented by three owner-occupied commercial properties. The total portfolio value, including these assets, amounts to roughly \u20AC5.44 million, resulting in an LTV between 46\u201357%. The facility is provided at a conservative level considering the underlying value of the collateral. The vacant value of the residential assets is significantly higher than the current low rental levels.\n\nThe portfolio consists of 18 apartments in Amsterdam, two commercial properties in the Western Docklands, two industrial sites in Emmeloord, one apartment in Hilversum, and a recently acquired residential property in Hilversum valued at \u20AC1.5 million and situated on 7,100 m\u00B2 of land. The average loan amount per asset, excluding the Hilversum residence, is around \u20AC108,000, with an estimated average value of \u20AC235,000. This reflects a prudent financing level given the liquidity and quality of the assets, of which approximately 75% are Amsterdam apartments.\n\nThe borrower is financially solid with sufficient cash flow and a long-standing profitable track record. Assets are well-located and easily marketable. The operator has extensive experience in real estate and provides personal recourse. Exit will occur through refinancing once the bank facility is completed.\n\nOverall, a suitable proposition for RED IV.'
WHERE loan_id = '511';

UPDATE loans SET
  google_maps_url = 'https://maps.app.goo.gl/bs2Ne8cMyrQArArX7',
  kadastrale_kaart_url = 'https://kadastralekaart.com/kaart/perceel/HTG00/S/478',
  photo_url = 'https://i.imgur.com/Re0YyXC.png',
  additional_info = E'This financing concerns the acquisition of a fully leased office property in ''s-Hertogenbosch. The asset consists of three connected towers with a flexible layout, allowing for separation into individual units, and provides approximately 6,300m\u00B2 LFA with ample parking. The property is modern, recently renovated, energy efficient and generates stable rental income. The WALT of 4.97 years strengthens the income profile, while a \u20AC1 million cash-sweep mechanism further mitigates risk by directly linking our exposure to rental performance. Exit risk is limited; supported by strong occupancy (WALT) and a long-term redevelopment potential into healthcare housing as a future upside alternative. While such redevelopment would require substantial work and time \u2014 zoning changes and permits \u2014 it provides an attractive optionality. Even if redevelopment proves challenging, the property in its current state remains a well-lettable investment product with solid saleability, particularly at the applied financing level.'
WHERE loan_id = '513';

UPDATE loans SET
  google_maps_url = 'https://maps.app.goo.gl/hAtL4DG9LciUpMXdA',
  kadastrale_kaart_url = 'https://kadastralekaart.com/kaart/perceel/ASD07/K/8669',
  photo_url = 'https://i.imgur.com/KmOoASF.jpeg',
  additional_info = E'This financing concerns the acquisition of a leased residential property in Amsterdam-Noord (leasehold) consisting of three units with a total GFA of roughly 250\u2013275m\u00B2. The borrower intends to vacate the units, legally subdivide the property and either sell the apartments individually or renovate further depending on market conditions. The valuation supports the business plan, with current value around \u20AC960.000 and exit potential of \u20AC1.500.000\u2013\u20AC1.650.000. Key risks relate to liquidity pressure and timing of subdivision, mitigated by an 18-month interest reserve and personal guarantees. Overall, the loan amount is considered acceptable given the vacant-possession potential and marketability.'
WHERE loan_id = '514';

UPDATE loans SET
  google_maps_url = 'https://maps.app.goo.gl/6aTGsroijrGwSurw7',
  kadastrale_kaart_url = 'https://kadastralekaart.com/kaart/perceel/UTT00/O/1117',
  photo_url = 'https://i.imgur.com/xljbU1O.png',
  additional_info = 'This proposal concerns the financing of multiple commercial objects located near the FC Utrecht stadium. In the near future, there are opportunities to redevelop the area, with the possibility to add residential units on top of the existing structures. Borrower wishes to bridge the term to obtain a permit for this redevelopment. Borrower is an SPV with two sponsors: a professional developer with proven track-record and a private investor with healthy financials. There is only limited recourse. Objects are well-maintained and well-rented to cover the interest expenses. WALT is acceptable given the maturity of this loan. LTV based on the as is situation and cash flow are sufficient. The loan fits well within the terms of RED.'
WHERE loan_id = '515';

UPDATE loans SET
  google_maps_url = 'https://maps.app.goo.gl/2Gw73caiUCVRvPNb6',
  kadastrale_kaart_url = 'https://kadastralekaart.com/kaart/perceel/OSS00/B/6494',
  photo_url = 'https://i.imgur.com/6t0C7AB.png',
  additional_info = E'This financing concerns a first-mortgage loan secured on a recently completed, modern industrial property located on a well-accessible business park near the motorway. The asset has an appraised value of approximately \u20AC23.5 million and is fully leased, generating around \u20AC1.5 million in annual rental income. The financing is provided at a conservative leverage level, with an LTV of roughly 34 percent, offering substantial downside protection. Rental income is diversified between an external logistics tenant under a long-term lease and an owner-occupier. Sponsor commitment is reinforced through significant subordinated capital remaining in the structure. Overall, the combination of strong asset quality, low leverage, stable income and clear exit options results in an attractive, well-secured financing aligned with the investment profile of RAX RED IV.'
WHERE loan_id = '520';
