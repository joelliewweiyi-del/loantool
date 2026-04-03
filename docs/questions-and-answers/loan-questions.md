# Loan Questions & Responses

Running Q&A log for investor/back-leverage due diligence. Check here first before searching Supabase documents.

---

# BAWAG Back-Leverage Facility

## RAX 493 — Inproba

### Q: What are the lease terms?

7yr triple net, signed Sep 2025. ~4yr remaining at exit.

> **Source:** `Credit Proposal RAX493.pdf` — Section 5.3

### Q: What is the amortisation holiday?

EUR 100k/qtr starting 1 Apr 2026. Grace period during PE turnaround.

> **Source:** `Kredietbrief RAX493.pdf` — p.3 (Aflossing)
> **Source:** `Credit Proposal RAX493.pdf` — Section 1 / 3.1

### Q: What is the guarantee structure?

EUR 1m cap, irrevocable, first demand. Covers difference above EUR 6.5m outstanding.

> **Source:** `Kredietbrief RAX493.pdf` — p.1 (Garant)
> **Source:** `Credit Proposal RAX493.pdf` — Section 8.1 / Section 9

### Q: Is there cross-default with the opco?

No cross-default clause. RAX finances the property holdco (Inproba Beheer); Rabobank finances the opco (Inproba B.V.). Structurally separate.

> **Source:** `Kredietbrief RAX493.pdf` — p.6-7 (Aanvullende verplichtingen / Achterstelling)

---

## RAX 513 — Fort Sint Anthonie

### Q: What is the refurbishment history?

Built 2002, renovated 2023 with tenants in place (never vacant). Brought to EPC-A.

> **Source:** `Credit Proposal RAX513 (final).pdf` — Section 5.1 "Property description" (p.7)

### Q: What is the occupancy?

97%, 18 tenants. Only 5 vacant parking spots.

> **Source:** `Credit Proposal RAX513 (final).pdf` — Section 5.3 "Rent analysis" (p.8)

### Q: Why is the mortgage EUR 10m + 40% on a EUR 8.25m loan?

Standard Dutch notarial practice. Inscription higher than loan to cover future costs/interest without re-registering.

> **Source:** `Credit Proposal RAX513 (final).pdf` — Section 2 "Credit terms", Securities row (p.4-5)

### Q: What is the 2026 lease expiry/break risk?

~EUR 259k at risk (21% of rent). Mise en Place already terminated. Emma Solutions, Weener XL, Factor Finance, Claassen Moolenbeek have 2026 notice/expiry dates. Checking with PM on tenant sentiment.

> **Source:** `Credit Proposal RAX513 (final).pdf` — Section 5.3 footnote (p.8)
> **Source:** Supabase `rent_roll_entries` table — submission received 2025-10-01

---

## RAX 516 — Jaan OG

### Q: VPV / ERV / reletting?

Refer to valuation report.

> **Source:** `concept Taxatierapport Geldermalsen.pdf` + `concept Taxatierapport Kapelle.pdf` (on file in Supabase)

### Q: What is the repayment structure?

EUR 67.5k/qtr fixed + full free cash flow sweep (semi-annual). Rent is only PropCo source.

> **Source:** `Kredietbrief RAX516 fully signed.pdf` — p.3 (Aflossing)
> **Source:** `Credit Proposal RAX516.pdf` — Section 2 "Credit terms" (p.4): Repayment: "EUR 270.000 plus excess cash flow"

### Q: What is the guarantee structure?

COROOS International N.V. (Curacao), group holding only. No third parties. EUR 10.4m subordinated from COROOS Beheer, ring-fenced.

> **Source:** `Kredietbrief RAX516 fully signed.pdf` — p.1 (Garant) + p.4 (Zekerheden / Achterstelling)
> **Source:** `Credit Proposal RAX516.pdf` — Section 8.1 "Structure risks" (p.12)

### Q: QSix — has the sale of units completed? Same PropCo? Where are the units?

Sale of units to retire remaining QSix loan completed. Transfer to related company, financed with refi and bridge combined with our facility. QSix loan paid off in full. Same propco; no other assets in Jaan OG. QSix units are other side of the road / adjacent.

> **Source:** `Credit Proposal RAX516.pdf` — Section 3.1 "Description transaction" (p.5): QSix EUR 40m, RAX EUR 27m, bridge EUR 13m
> **Source:** `Memo closing Coroos.pdf` — Section "Breakdown aflossing QSix lening" (p.3)

### Q: Do you have underwriting / cash flow models?

We don't build underwriting cash flow models. Our approach is exposure-based: LTV, collateral value, debt service coverage. Can share the COROOS group financials.

> **Source:** Internal RAX methodology — no document reference

---

## RAX 517 — Polderstaete

### Q: What is the paydown source?

Not explicit in docs. Fund Flow section shows EUR 7.25m -> EUR 1.25m repayment -> EUR 6m transfer. Borrower has ICR 5.6x and UBO net worth EUR 5.95m.

> **Source:** `Credit Proposal RAX517.pdf` — Fund Flow section + Financial credit base / IB 2021 sections

### Q: What is the development plan?

Plan A is residential (750 homes), but dependent on municipal zoning which is delayed. Currently hold & collect.

> **Source:** `Credit Proposal RAX517.pdf` — Description + Business Case sections

### Q: What about the cap rate given the short WALT?

Short WALT (1.48yr), building rights tenure, reasonable-to-good quality. LTV only 36%. Even if municipality + Dura Vermeer leave, ICR stays above 2x.

> **Source:** `Credit Proposal RAX517.pdf` — Description section (risk scenarios)

Closing memo bijgevoegd mochten ze nog meer vragen hebben.

---

# Cerberus — Loan Questions & Responses

---

## RAX 516 — Jaan OG B.V. (Coroos)

### Q1: The valuation you shared is on a current value basis. Has the borrower instructed a valuation on vacant possession basis?

Yes. Faasse & Vermont valued Geldermalsen at EUR 27.8m on current rent and EUR 34.8m vrij van huur en gebruik (vacant possession). Kapelle was valued at EUR 23.9m (rental income equal to market rent); no separate VP figure for Kapelle.

In addition, Troostwijk performed a liquidation value analysis (RICS definition, 6-month marketing period with limited information) across both sites:
- Best case: EUR 36.9m (orderly process, clear redevelopment vision)
- Base case: EUR 33.05m (limited info, 6-month marketing)
- Worst case: EUR 29.0m (time pressure, limited insight into redevelopment potential)

RAX's condition precedent requires minimum liquidation value of EUR 30m. The closing memo concludes the value sits toward the upper end of the range, well above the EUR 27m financing level.

> `Memo closing Coroos.pdf` — Section "Liquidatiewaarde Troostwijk" (p.1-2)
> `Credit Proposal RAX516.pdf` — Section 6 "Valuation" (p.10-11); Section 2 "Credit terms" — Conditions precedent (p.4)

---

### Q2: Do you have any visibility of terms of unit 9 & 10 sales (lease / VP, price / areas)?

Hal 10 (Geldermalsen): Faase & Fermont has provided a sale note. Approximately 10 interested parties, but only Panattoni is in concrete discussions. The bridge financing provides room to not rush the process.

Hal 9 & 10 context: These units are outside the RAX ringfence (held in MOVR entities, not in Jaan OG BV). The refinancing was structured as:
- Mogelijk Fonds 18: EUR 7.5m (MOVR 2)
- Prospr bridge: EUR 4.5m (MOVR 2)
- RAX Finance: EUR 27m (Jaan OG)

Interest costs for the Mogelijk and Prospr loans can be funded from rental income of hal 9 and 10 (outside Jaan OG ringfence). No specific lease terms, sale prices, or area breakdowns for units 9 & 10 are disclosed in the memo. That detail may be in the Faase & Fermont note referenced therein.

> `Memo closing Coroos.pdf` — Section "Verkoop hal 10" (p.4); Section "Breakdown aflossing QSix lening en betaalbaarheid lening" (p.3)
> `Credit Proposal RAX516.pdf` — Section 3.3 "Fund Flow" (p.5): QSix EUR 40m, RAX EUR 27m, bridge unit 9&10 EUR 13m

---

## RAX 515 — Galenwaard Development B.V.

### Q1: We understand ground lease is expiring in 2035. Do you have visibility of extension options?

The site is a redevelopment location for the construction of four residential towers. Prior to redevelopment, the ground lease canon will be bought out — this is included in the development budget. Planning permission is expected by end of 2027.

---

### Q2: Do you have visibility of updated rent roll / leasing activity?

Yes. Last rent roll received 2026-01-01 (Q4 2025 submission).

---

### Q3: Has the borrower conducted a valuation of residential development scenario?

The valuation report on file (TR Herculesplein 315 - Utrecht.pdf) covers the current use scenario. A development cost estimate (stichtingskostenopzet) from 2023 is available on file.

---

## RAX 537 — S. Verwaijen

### Q1: How are the EUR 1.9m additional rent payments structured?

Underwrite in progress.

---

## RAX 513 — Stichting Fort Sint Anthonie

### Q1: How is the cash sweep covenant intended to work (full sweep / up to EUR 1m, conditional / unconditional, etc)?

The credit proposal specifies a Cash Sweep at rent-level EUR 1m. This is listed as a covenant alongside LTV 75% and ICR 1.60. The mechanism is designed to directly link RAX's exposure to rental performance — when gross rental income exceeds EUR 1m, the excess cash flow is swept to reduce the loan balance.

The executive summary describes it as: *"a EUR 1 million cash-sweep mechanism [that] further mitigates risk by directly linking our exposure to rental performance."*

Current gross rental income is EUR 1.26m p.a. (EUR 196/m2 LFA), so the sweep triggers on income above the EUR 1m threshold. The kredietbrief would contain the exact mechanics (full sweep vs. partial, frequency, conditions).

> `Credit Proposal RAX513 (final).pdf` — Section 2 "Credit terms", Covenants row (p.5): "Cash Sweep (rent-level EUR 1m)"
> `Credit Proposal RAX513 (final).pdf` — Section 1 "Executive Summary" (p.2): cash-sweep mechanism description
> For exact mechanics: `Kredietbrief RAX513 161225 (final) volledig getekend.pdf` (on file)

---

### Q2: Has the borrower conducted evaluation of the development scenario?

Yes — the borrower acquired the asset with the intention to redevelop into ~125 healthcare units. A detailed StiKo (stichtingskosten) analysis is included in the credit proposal:
- 125 care-homes (51-55 m2 avg.), 1 commercial space, 103 parking spaces
- Total development costs: EUR 42.3m (incl. tax)
- Expected sale proceeds: EUR 52.3m
- Expected development result: EUR 10m

> `Credit Proposal RAX513 (final).pdf` — Section 3.4 "Exit strategy" (p.6): redevelopment intent
> `Credit Proposal RAX513 (final).pdf` — Appendix 1 "Redevelopment plan" (p.11-12): full StiKo breakdown

---

## RAX 504 — Median Investment B.V. (HEMA Den Bosch)

### Q1: We understand there is a shortfall between rental income of 780k p.a. and the 1.0m annual debt service (250k per quarter). Do you have visibility how the shortfall will be funded?

The borrower was deliberately delaying signing the allonge to maintain negotiating leverage. The allonge has since been signed; as a result there is no longer an amortization obligation and the loan is serviceable from rental income.

---

# BAWAG — Additional Loan Questions (April 2026)

## RAX 517 — Polderstaete

### Q: How long has the property been used as a refugee centre? Is this accommodation or administrative?

Since 2022. It is accommodation (not administrative). Tenant is Gemeente Haarlemmermeer, 3,175 m² in Cluster III. Note: municipality contract cannot be shared with BAWAG.

### Q: What do we expect NOI to be if the municipal space was re-let in a traditional sense?

Municipality pays EUR 1m/yr at EUR 315/m². Other tenants pay EUR 50–175/m². Re-letting at ~EUR 100/m² would yield ~EUR 317k, dropping total NOI from EUR 2,290k to ~EUR 1,607k. ICR stays above 2x even if municipality + Dura Vermeer both leave.

> **Source:** Rent roll Q4 2025; `Credit Proposal RAX517.pdf` — Description section (risk scenarios)

### Q: How long left on the municipality contract? What notice period is required to terminate?

Lease ends 2027-02-28. Alderman has committed to 10-year extension ("Toezegging wethouder: nog met 10 jaar verlengd"). Input needed: is extension signed, and what is the notice period?

> **Source:** Rent roll Q1 2026

### Q: Does the loan structure include any cash sweep/amortisation to de-risk the drop off in income?

ICR covenant ≥ 1.5x (actual: 3.80x). No cash sweep or amortisation — covenants are LTV 65% and ICR 1.5x. Not needed given the low risk profile.

---

## RAX 504 — Median / HEMA Den Bosch

### Q: Is the building only listed because of the contents of the basement? If the ornaments were relocated would the listed status be removed?

The property is in a protected cityscape (beschermd stadsgezicht) and is a municipal monument. Use is tied to the existing structure and appearance. Given the location, retail is an appropriate designation. It is an excellent retail location and there is no need for de-listing. The listing does not prevent facade renovation.

### Q: Has HEMA occupied the entire building since 1930 or have they taken and given back various other parts? Why are they now downsizing?

HEMA is not downsizing — they extended to 2035 with 4x 10-year renewals and are investing in a "HEMA 100" renovation. Current lease dates from 2005; likely in use by HEMA before that but cannot be confirmed with certainty. They still lease the entire building; different arrangements may be made in the future.

> **Source:** Allonge HEMA Den Bosch (signed 2025)

### Q: What's the Borrower's source of cash for the incentives in the allonge?

Incentives total ~EUR 1.1m (EUR 820k investment contribution + ~EUR 180k rent-free + up to EUR 100k facade). Funded from cash flow of the borrower's businesses (döner restaurants and real estate portfolio) and the sale of a residential property.

> **Source:** Allonge — Articles 6-8

### Q: How do Dutch second mortgages work? Can the 1st charge remove that 2nd charge in enforcement?

First-ranking mortgagee can enforce and sell free and clear under Dutch law. Second mortgagee cannot block — only claims residual proceeds. Yes, there is a second mortgage in favour of private investor Koppelaar I B.V.

### Q: How is the junior loan subordinated? Contractual or structural?

Both contractual and structural.

### Q: Is RAX taking any security over the subordinated instruments?

Yes. Subordination per RAX standard contract terms: no right of immediate enforcement (parate executie), full subordination, prohibition on demand for repayment, and obligation to cooperate with discharge (royement).

---

## RAX 507 — Jorishof Ridderkerk

### Q: Do you have historic footfall and occupancy data?

No historic data available. Current occupancy: 86%. Rental income from retail and the care apartments above provides more than sufficient comfort.

### Q: Are there any other shopping centres in the town? How does this compare if they were ranked?

Jorishof and Ridderhof together form "Winkelhart Ridderkerk", which is the dominant shopping centre in the town. There are a few smaller local centres but no real competition.

### Q: How long have the 5 shops been vacant? Is 100% occupancy realistic?

Longest vacancies since Jan 2019 (7+ years). 100% not realistic — loan underwrites on 86%.

> **Source:** Rent roll Q1 2026

### Q: What's the timeline for the completion of the care apartments?

Permit irrevocable, all 38 units pre-leased, space within existing security. Expected completion: summer 2026.

### Q: Who is the care unit operator? What's their financial strength?

Zorgvilla Tante Toos / Stichting PB Vastgoed. No relevant financials available. Retail rental income alone is sufficient to service the loan.

### Q: Is the loan advanced in full day 1 with cash held back or committed but unfunded? Does the back leverage mirror this?

EUR 6.5m committed and funded; EUR 5.7m drawn, EUR 800k remaining committed. Back leverage structure TBD.

### Q: Is the subordinated loan intragroup or 3rd party? Secured? Contractual or structural?

Intragroup. Secured by second mortgage. Both contractual and structural subordination.

---

## RAX 509 — Varod Street Rotterdam

### Q: Who is the long leaseholder? Leasehold terms? Peppercorn or geared? Forfeiture rights? Mortgagee protection? When do leaseholds lose value?

Erfpacht from municipality of Rotterdam. Dutch erfpacht doesn't suffer the same cliff-edge depreciation as English leasehold. Input needed: canon type, remaining term, forfeiture and mortgagee protection clauses.

### Q: Are there any automatic or legally mandated rights of extension?

Temporary erfpacht (tijdelijk erfpacht), pre-paid (afgekocht) until 2097. Given the remaining term (~71 years), no impact on value.

### Q: Any update on the hotel redevelopment angle?

Zoning allows hotel/hospitality. Borrower is progressing permit. Input needed: current permit status.

### Q: How much is the private guarantee for? Interest only or principal? Any restrictions on calling?

Abstract guarantee, capped at EUR 200,000.

---

## RAX 511 — Levasu Amsterdam

### Q: Is the Borrower taking RAX debt against unencumbered properties to release cash for UK properties levered by Santander?

The RAX loan finances the purchase of two UK assets. Santander will refinance them. The process took longer than expected, hence the bridge was needed.

### Q: Are the three additional owner-occupied properties unencumbered? Any income stream?

Owner-occupied properties generate no rental income. The rental income from the residential units is more than sufficient.

### Q: By how much are the 18 units under-rented? How long to reach ERV? Any rental increase restrictions?

Vacant value confirmed significantly above current rent (EUR 124k p.a. gross). No specific ERV figure available. Coverage is so ample that asset-level analysis is not considered relevant.

---

## RAX 515 — Galenwaard Utrecht

### Q: Is the leasehold really only to 2035? Any extension right? What happens when it matures?

Ground lease canon will be bought out prior to redevelopment (in development budget). Planning permission expected end 2027.

> **Source:** Cerberus Q&A (answered previously)

### Q: What was the updated valuation?

On file: EUR 20.05m (Nov 2023). No updated valuation yet — first new valuation scheduled for 1 July 2027, to be based on the redevelopment scenario.

### Q: What is the other short-term debt in the vehicle? How does it interact with the RAX loan?

Shareholder loan of EUR 2.3m.

### Q: Same as 504 re the 2nd mortgage

First mortgagee can enforce free of junior liens. Yes, second mortgage in respect of the shareholder loan.

### Q: What is the "correction" in the footnote on the Balance Sheet section?

The subordinated loan is classified as equity (aansprakelijk vermogen) on the balance sheet.

### Q: Was the original loan from 2023 or does the relationship go back further?

Facility originated in RED III, rolled into RED IV. Input needed: original origination date.

---

## RAX 528 — By The River

### Q: Why was security taken over Uithoorn given the unknown value and contamination issue?

The property does have an appraised value of ~EUR 2m. The building permit process has now been completed and bids of ~EUR 6–7m have been received. The contamination is isolated and has limited impact on value.

### Q: Has any diligence / examination of the contamination been done?

Yes — contamination is isolated (see above).

### Q: Amsterdam Noord is leasehold until 2047? What happens to the security when that matures?

Loan matures Sep 2026, well before 2047. Perpetual ground lease (voortdurend recht van erfpacht), pre-paid until 2047. At that point the canon will be re-assessed. The property will likely be redeveloped before then, at which point a new canon assessment or buyout will take place.

### Q: How does the Power of Sale work? Any restrictions or triggers?

The lender has the right to sell the property privately (onderhands) in case of default, avoiding the public auction process and achieving a better sale price.
