# AFAS Connector Reference

This document contains the JSON templates for each AFAS API connector, with field annotations showing which values are static and which are dynamic (populated from loan tool data).

---

## 1. Push: Post PIK Interest (Journal Entry)

**Direction:** Loan Tool → AFAS
**AFAS Connector:** FiEntryPar (Financial Entry)
**Purpose:** Post capitalized (PIK) interest as a balanced journal entry. Debits the loan receivable account, credits interest income and commitment fee accounts.

### Structure

One **debit line** (debtor sub-account) and one or more **credit lines** (interest income + commitment fee). The entry must balance: debit = sum of credits.

| Line | GL Account | Side | DimAx1 | Represents |
|---|---|---|---|---|
| 1 | 104xx (per borrower) | Debit (AmDe) | null | Debtor sub-account (PIK receivable) |
| 2 | 9350 | Credit (AmCr) | loan ID | Interest income |
| 3 | 9351 | Credit (AmCr) | loan ID | Commitment fee income |

If commitment fee = 0 for a period, the 9351 line should be omitted (only 2 lines).

**Important:** DimAx1 (loan ID) is only set on the **credit lines** (9350/9351), NOT on the debit line. The debit line uses a borrower-specific debtor sub-account (104xx range) which identifies the borrower.

### Validated Against Live AFAS Data (Journal 70, UnitId=5)

Existing PIK postings in AFAS confirm this structure:

```
EntryNo 11 (loan 484 — Oudenoord):
  Debit  10431  DimAx1=null  71,062.49  (debtor sub-account)
  Credit 9350   DimAx1=484   57,404.74  (interest income)
  Credit 9351   DimAx1=484   13,657.75  (commitment fee)

EntryNo 15 (loan 507 — Jorishof):
  Debit  10473  DimAx1=null  29,638.32  (debtor sub-account)
  Credit 9350   DimAx1=507   24,460.62  (interest income)
  Credit 9351   DimAx1=507    5,177.70  (commitment fee)

EntryNo 12 (loan 493 — Inproba, no commitment fee):
  Debit  10465  DimAx1=null  50,000.00  (debtor sub-account)
  Credit 9350   DimAx1=493   50,000.00  (interest income only)
```

### AFAS Identifiers Per Loan

The AFAS debtor code equals the loan ID (e.g. loan 507 = debtor "507", shown as "RAX507" in AFAS UI). The only additional mapping needed is the **debtor sub-account** (GL account for that borrower's receivable), stored as `afas_debtor_account` on the `loans` table.

| Loan ID | Debtor Account | Borrower | Vehicle |
|---|---|---|---|
| 484 | 10431 | Oudenoord Herontwikkeling B.V. | RED IV |
| 493 | 10465 | Inproba Beheer B.V. | RED IV |
| 504 | 10471 | Median Investment B.V. | RED IV |
| 505 | 10472 | Prins Hendriksoord B.V. | RED IV |
| 507 | 10473 | Jorishof Ridderkerk B.V. | RED IV |
| 509 | 10474 | Varod Street B.V. | RED IV |
| 510 | 10442 | Schoutenwerf B.V. | RED IV |
| 511 | 10475 | Levasu B.V. | RED IV |
| 512 | 10476 | A. Postma | RED IV |
| 513 | 513 | Stichting Fort Sint Anthonie | RED IV |
| 514 | 10477 | Knights Strategy B.V. | RED IV |
| 515 | 10435 | Galgenwaard Development | RED IV |
| 518 | 518 | TBD | TLF |
| 520 | 520 | Castor Beheer B.V. | TLF |
| 522 | 522 | TBD | TLF |
| 526 | 526 | TBD | TLF |

**Still needed:** Debtor sub-accounts for loans 513, 518, 520, 522, 526.

### Field Reference

#### Header — `FiEntryPar.Element.Fields`

| Field | Example | Static/Dynamic | Description |
|---|---|---|---|
| `Year` | 2026 | Dynamic | Fiscal year — from period end date |
| `Peri` | 2 | Dynamic | Fiscal period (month) — from period end date |
| `UnId` | 5 | Dynamic | Administration unit. **5 = RED IV**, TLF code TBD |
| `JoCo` | "90" | Static | Journal code — always "90" for PIK entries |
| `AuNu` | true | Static | Auto-numbering — always true |

#### Line Items — `FiEntries.Element[].Fields`

| Field | Example | Static/Dynamic | Description |
|---|---|---|---|
| `VaAs` | "1" | Static | VAT scenario — always "1" (no VAT) |
| `AcNr` | "104xx" / "9350" / "9351" | Dynamic (debit) / Static (credits) | Debit = debtor sub-account per borrower; Credits = income accounts |
| `EnDa` | "2026-02-23" | Dynamic | Entry date — period end date (YYYY-MM-DD) |
| `BpDa` | "2026-02-23" | Dynamic | Booking period date — same as EnDa |
| `BpNr` | "484" | Dynamic | Loan ID (from `loans` table) |
| `Ds` | "484-P02-2026" | Dynamic | Description — pattern: `{loanId}-P{period:02}-{year}` |
| `AmDe` | "71562.47" | Dynamic | **Debit** amount (only on line 1 — loan receivable) |
| `AmCr` | "57976.16" | Dynamic | **Credit** amount (only on credit lines — income accounts) |

#### Dimension Entry — `FiDimEntries.Element.Fields`

| Field | Example | Static/Dynamic | Description |
|---|---|---|---|
| `DiC1` | "484" | Dynamic | DimAx1 (verbijzonderingsveld) — **loan ID**, mandatory |
| `AmDe` | "71562.47" | Dynamic | Mirrors the line's debit amount (on debit line) |
| `AmCr` | "57976.16" | Dynamic | Mirrors the line's credit amount (on credit lines) |

### Dynamic Field Mapping

| JSON Field | Source in Loan Tool |
|---|---|
| `Year` | `period.period_end.getFullYear()` |
| `Peri` | `period.period_end.getMonth() + 1` |
| `UnId` | Vehicle lookup: RED IV = 5, TLF = TBD |
| `BpNr` | `loan.id` or loan reference number |
| `DiC1` | Same as BpNr — loan ID |
| `Ds` | `{loanId}-P{String(month).padStart(2,'0')}-{year}` |
| `EnDa` / `BpDa` | `period.period_end` formatted as YYYY-MM-DD |
| `AmDe` (debit line) | `interestAmount + commitmentFeeAmount` (total PIK for period) |
| `AmCr` (9350 line) | Interest amount from `calculatePeriodAccruals()` |
| `AmCr` (9351 line) | Commitment fee amount from `calculatePeriodAccruals()` |

### Example JSON

```json
{
  "FiEntryPar": {
    "Element": {
      "Fields": {
        "Year": 2026,
        "Peri": 2,
        "UnId": 5,
        "JoCo": "90",
        "AuNu": true
      },
      "Objects": [
        {
          "FiEntries": {
            "Element": [
              {
                "Fields": {
                  "VaAs": "1",
                  "AcNr": "1751",
                  "EnDa": "2026-02-23",
                  "BpDa": "2026-02-23",
                  "BpNr": "484",
                  "Ds": "484-P02-2026",
                  "AmDe": "71562.47"
                },
                "Objects": [
                  {
                    "FiDimEntries": {
                      "Element": {
                        "Fields": {
                          "DiC1": "484",
                          "AmDe": "71562.47"
                        }
                      }
                    }
                  }
                ]
              },
              {
                "Fields": {
                  "VaAs": "1",
                  "AcNr": "9350",
                  "EnDa": "2026-02-23",
                  "BpDa": "2026-02-23",
                  "BpNr": "484",
                  "Ds": "484-P02-2026",
                  "AmCr": "57976.16"
                },
                "Objects": [
                  {
                    "FiDimEntries": {
                      "Element": {
                        "Fields": {
                          "DiC1": "484",
                          "AmCr": "57976.16"
                        }
                      }
                    }
                  }
                ]
              },
              {
                "Fields": {
                  "VaAs": "1",
                  "AcNr": "9351",
                  "EnDa": "2026-02-23",
                  "BpDa": "2026-02-23",
                  "BpNr": "484",
                  "Ds": "484-P02-2026",
                  "AmCr": "13586.31"
                },
                "Objects": [
                  {
                    "FiDimEntries": {
                      "Element": {
                        "Fields": {
                          "DiC1": "484",
                          "AmCr": "13586.31"
                        }
                      }
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  }
}
```

---

## 2. Push: Post Cash-Pay Interest (Receivable Entry)

**Direction:** Loan Tool → AFAS
**AFAS Connector:** FiEntries (Financial Entry, via `FiEntryPar` wrapper)
**Purpose:** Post cash-pay interest as a debtor receivable. Debits the debtor account (creating an open item), credits interest income and commitment fee accounts. The open item can then be matched against the bank payment when the borrower pays.

### Structure

One **debit line** (debtor account) and one or more **credit lines** (interest income + commitment fee). The entry must balance: debit = sum of credits.

| Line | Account | Side | VaAs | DimAx1 | Represents |
|---|---|---|---|---|---|
| 1 | Debtor code (e.g. "484") | Debit (AmDe) | "2" | null | Debtor receivable (open item) |
| 2 | 9350 | Credit (AmCr) | "1" | loan ID | Interest income |
| 3 | 9351 | Credit (AmCr) | "1" | loan ID | Commitment fee income |

If commitment fee = 0 for a period, the 9351 line should be omitted (only 2 lines).

**Important:** The debit line `AcNr` is the **debtor code** (e.g. "484"), NOT a GL account number. In AFAS journal 70 (memorial), posting to a debtor code creates an open receivable on that debtor. This is different from PIK (Connector #1), which posts to a debtor sub-account GL (104xx range).

### Key Differences from PIK (Connector #1)

| | Cash-Pay (Connector #2) | PIK (Connector #1) |
|---|---|---|
| Journal code (`JoCo`) | "70" (memorial) | "90" |
| Debit `AcNr` | Debtor code (e.g. "484") | Debtor sub-account GL (e.g. "10431") |
| Debit `VaAs` | "2" (exempt/shifted) | "1" (no VAT) |
| Effect | Creates open receivable on debtor | Journal entry (no open item) |
| `BpNr` format | `{loanId}_{month}_{yearShort}` | `{loanId}` |
| `Ds` format | `{loanId} Rente P{period:02} {year}` | `{loanId}-P{period:02}-{year}` |

### Field Reference

#### Header — `FiEntryPar.Element.Fields`

| Field | Example | Static/Dynamic | Description |
|---|---|---|---|
| `Year` | 2026 | Dynamic | Fiscal year — from period end date |
| `Peri` | 3 | Dynamic | Fiscal period (month) — from period end date |
| `UnId` | 5 | Dynamic | Administration unit. **5 = RED IV**, TLF code TBD |
| `JoCo` | "70" | Static | Journal code — always "70" for cash interest entries |
| `AuNu` | true | Static | Auto-numbering — always true |

#### Debit Line (debtor) — `FiEntries.Element[0].Fields`

| Field | Example | Static/Dynamic | Description |
|---|---|---|---|
| `VaAs` | "2" | Static | VAT scenario — "2" for debtor line |
| `AcNr` | "484" | Dynamic | **Debtor code** (= loan ID, NOT a GL account) |
| `EnDa` | "2026-03-03" | Dynamic | Entry date — period end date (YYYY-MM-DD) |
| `BpDa` | "2026-03-03" | Dynamic | Booking period date — same as EnDa |
| `BpNr` | "484_03_26" | Dynamic | Invoice reference — `{loanId}_{month:02}_{yearShort:02}` |
| `Ds` | "484 Rente P03 2026" | Dynamic | Description — `{loanId} Rente P{period:02} {year}` |
| `AmDe` | "71562.47" | Dynamic | **Debit** amount — total (interest + commitment fee) |

No `FiDimEntries` on the debit line — the debtor is identified by `AcNr`.

#### Credit Lines (income accounts) — `FiEntries.Element[1..n].Fields`

| Field | Example | Static/Dynamic | Description |
|---|---|---|---|
| `VaAs` | "1" | Static | VAT scenario — "1" (no VAT) |
| `AcNr` | "9350" / "9351" | Static | Interest income / commitment fee income |
| `EnDa` | "2026-03-03" | Dynamic | Entry date — same as debit line |
| `BpDa` | "2026-03-03" | Dynamic | Booking period date — same as EnDa |
| `BpNr` | "484_03_26" | Dynamic | Invoice reference — same as debit line |
| `Ds` | "484 Rente P03 2026" | Dynamic | Description — same as debit line |
| `AmCr` | "57976.16" | Dynamic | **Credit** amount per income account |

#### Dimension Entry — `FiDimEntries.Element.Fields` (credit lines only)

| Field | Example | Static/Dynamic | Description |
|---|---|---|---|
| `DiC1` | "484" | Dynamic | DimAx1 — **loan ID**, mandatory on credit lines |
| `AmCr` | "57976.16" | Dynamic | Mirrors the line's credit amount |

### Dynamic Field Mapping

| JSON Field | Source in Loan Tool |
|---|---|
| `Year` | `period.period_end.getFullYear()` |
| `Peri` | `period.period_end.getMonth() + 1` |
| `UnId` | Vehicle lookup: RED IV = 5, TLF = TBD |
| `AcNr` (debit) | `String(loan.id)` — debtor code = loan ID |
| `BpNr` | `{loanId}_{String(month).padStart(2,'0')}_{String(year % 100).padStart(2,'0')}` |
| `Ds` | `{loanId} Rente P${String(month).padStart(2,'0')} {year}` |
| `EnDa` / `BpDa` | `period.period_end` formatted as YYYY-MM-DD |
| `AmDe` (debit line) | `interestAmount + commitmentFeeAmount` (total for period) |
| `AmCr` (9350 line) | Interest amount from `calculatePeriodAccruals()` |
| `AmCr` (9351 line) | Commitment fee amount from `calculatePeriodAccruals()` |
| `DiC1` | `String(loan.id)` — loan ID |

### Example JSON

```json
{
  "FiEntryPar": {
    "Element": {
      "Fields": {
        "Year": 2026,
        "Peri": 3,
        "UnId": 5,
        "JoCo": "70",
        "AuNu": true
      },
      "Objects": [
        {
          "FiEntries": {
            "Element": [
              {
                "Fields": {
                  "VaAs": "2",
                  "AcNr": "484",
                  "EnDa": "2026-03-03",
                  "BpDa": "2026-03-03",
                  "BpNr": "484_03_26",
                  "Ds": "484 Rente P03 2026",
                  "AmDe": "71562.47"
                }
              },
              {
                "Fields": {
                  "VaAs": "1",
                  "AcNr": "9350",
                  "EnDa": "2026-03-03",
                  "BpDa": "2026-03-03",
                  "BpNr": "484_03_26",
                  "Ds": "484 Rente P03 2026",
                  "AmCr": "57976.16"
                },
                "Objects": [
                  {
                    "FiDimEntries": {
                      "Element": {
                        "Fields": {
                          "DiC1": "484",
                          "AmCr": "57976.16"
                        }
                      }
                    }
                  }
                ]
              },
              {
                "Fields": {
                  "VaAs": "1",
                  "AcNr": "9351",
                  "EnDa": "2026-03-03",
                  "BpDa": "2026-03-03",
                  "BpNr": "484_03_26",
                  "Ds": "484 Rente P03 2026",
                  "AmCr": "13586.31"
                },
                "Objects": [
                  {
                    "FiDimEntries": {
                      "Element": {
                        "Fields": {
                          "DiC1": "484",
                          "AmCr": "13586.31"
                        }
                      }
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  }
}
```

---

## 3. Pull: Get Cash Interest Payments Received

**Direction:** AFAS → Loan Tool
**AFAS Connector:** `Profit_Transactions_Allocated` (GET)
**Purpose:** Pull cash interest payments received from borrowers. These appear as credits on debtor sub-accounts (104xx range) in the bank journal. Runs as a daily automated sync job.

### Request

**Endpoint:**
```
GET /connectors/Profit_Transactions_Allocated
```

**Query Parameters:**

| Parameter | Value | Description |
|---|---|---|
| `filterfieldids` | `JournalId,AccountNo` | Fields to filter on |
| `filtervalues` | `50,10400..10499` | Journal 50 (bank), Accounts 10400–10499 (debtor sub-accounts) |
| `operatortypes` | `1,15` | 1 = equals, 15 = range |
| `skip` | 0 | Pagination offset |
| `take` | 500 | Page size |
| `orderbyfieldids` | `-EntryDate` | Sort descending by entry date |

**Headers:**
```
Content-Type: application/json
Accept: application/json
Accept-language: nl-nl
Authorization: AfasToken <base64-encoded token>
```

**Filter logic:** All transactions from the bank journal (50) that hit debtor sub-accounts (104xx). Credits = payments received from borrowers. Debits = refunds/corrections (rare). The borrower is identified by the debtor sub-account number — **DimAx1 is NOT set** on these rows.

### Response Fields

Same fields as Connector #4 (see above). Key fields for this use case:

| Field | Type | Description |
|---|---|---|
| `AccountNo` | string | Debtor sub-account (e.g. "10465" = Inproba/RAX493) |
| `AmtCredit` | decimal | Payment amount received (credit = payment in) |
| `AmtDebit` | decimal | Refund/correction amount (debit = money back out, rare) |
| `EntryDate` | date | Payment booking date |
| `Description` | string | Contains borrower name + loan reference (e.g. "Inproba Beheer B.V. /RAX493 Interest charges 1-2026") |
| `EntryNo` + `SeqNo` | int | Unique key for dedup |
| `DimAx1` | string | **Always null/empty** — borrower identified by AccountNo instead |

### Sample Data (confirmed live, RED IV / UnitId=5, Dec 2025 – Feb 2026)

```
2026-02-25  10442  Cr=20,250     Schoutenwerf B.V. /RAX510
2026-02-24  10477  Cr=2,406.25   Knights Strategy B.V. /Interest payment february 2026 account RAX514
2026-02-12  10472  Cr=18,229.17  Prins Hendriksoord B.V.. /RAX505
2026-02-09  10473  Cr=32,788.34  Jorishof Ridderkerk C.V. /RAX507 202601
2026-02-01  10465  Cr=50,000     Inproba Beheer B.V. /RAX493 Interest charges 1-2026
2026-01-30  10471  Cr=46,666.67  MEDIAN INVESTMENT BV /RAX504
2026-01-30  10477  Cr=4,812.50   Knights Strategy B.V. /RAX514
2025-12-30  10465  Cr=50,000     Inproba Beheer B.V. /RAX493 Interest charges 12-2025
```

One refund observed:
```
2026-02-25  10452  Dr=250        KESS CORPORATION N.V. /RAX472 - Teveel betaalde rente P02 2026
```

### Interpretation

- **Credit on 104xx** = cash interest payment received from borrower
- **Debit on 104xx** = refund or correction (e.g. overpayment returned)
- **Borrower identification:** via `AccountNo` → `afas_debtor_account` on `loans` table (NOT via DimAx1)
- **Unique key** for dedup: `EntryNo` + `SeqNo`
- Most borrowers pay monthly, typically around the 30th/1st

### Key Difference from Connector #4 (Draws)

| | Connector #3 (Payments) | Connector #4 (Draws) |
|---|---|---|
| AccountNo filter | `10400..10499` (debtor sub-accounts) | `1750..1751` (loan receivable accounts) |
| Borrower ID | `AccountNo` (debtor sub-account) | `DimAx1` (loan ID) |
| Credit means | Payment received | Repayment |
| Debit means | Refund | Draw |

### Field Mapping to `afas_sync_items`

| Response Field | `afas_sync_items` Column | Notes |
|---|---|---|
| `EntryNo` + `SeqNo` | `afas_reference` | Unique within administration (e.g. "42-3") |
| `AccountNo` | maps to `loan_id` | Via `loans.afas_debtor_account` lookup |
| `AmtCredit` | `amount` | Payment received |
| `EntryDate` | `afas_date` | Payment date |
| `Description` | — | Stored in `raw_json`, useful for display |
| Full row | `raw_json` | Stored for audit |
| — | `sync_type` | `'payment_received'` |
| — | `status` | Initially `'pending'` |

---

## 4. Pull: Get Loan Draws / Movements (Bank Transactions on Loan Accounts)

**Direction:** AFAS → Loan Tool
**AFAS Connector:** `Profit_Transactions_Allocated` (GET)
**Purpose:** Pull bank movements on loan receivable accounts to capture draws (money disbursed to borrowers). Runs as a daily automated sync job.

**Note:** Cash interest received payments use a different filter — see **Connector #3** (AccountNo 104xx instead of 1750/1751).

### Request

**Endpoint:**
```
GET /connectors/Profit_Transactions_Allocated
```

**Query Parameters:**

| Parameter | Value | Description |
|---|---|---|
| `filterfieldids` | `JournalId,AccountNo` | Fields to filter on |
| `filtervalues` | `50,1750..1751` | Journal 50 (bank), Accounts 1750–1751 (loan receivables) |
| `operatortypes` | `1,15` | 1 = equals, 15 = range |
| `skip` | 0 | Pagination offset |
| `take` | 20 | Page size (increase for production sync) |
| `orderbyfieldids` | `-EntryDate` | Sort descending by entry date |

**Headers:**
```
Content-Type: application/json
Accept: application/json
Accept-language: nl-nl
Authorization: AfasToken <base64-encoded token>
```

**Filter logic:** All transactions from the bank journal (50) that hit the loan receivable GL accounts (1750–1751). The DimAx1 field in the response identifies which loan the draw belongs to.

### Response Fields (confirmed from live data)

| Field | Type | Label (NL) | Description |
|---|---|---|---|
| `UnitId` | int | Administratie | Administration unit (5 = RED IV) |
| `EntryNo` | int | Nummer journaalpost | Journal entry number |
| `SeqNo` | int | Volgnummer journaalpost | Line sequence within entry |
| `Year` | int | Jaar | Fiscal year |
| `Period` | int | Periodenummer | Fiscal period (month) |
| `JournalId` | string | Code dagboek | Journal code ("50" = bank) |
| `AccountNo` | string | Rekeningnummer | GL account ("1750" = principal, "1751" = PIK/accrued) |
| `Omschrijving` | string | Omschrijving | Line description (usually null) |
| `AmtDebit` | decimal | Bedrag debet | Debit amount (draw = debit on 1750/1751) |
| `AmtCredit` | decimal | Bedrag credit | Credit amount (repayment = credit on 1750) |
| `EntryDate` | date | Datum boeking | Booking date |
| `InvoiceId` | string | Factuurnummer | Invoice number (null for bank entries) |
| `VoucherDate` | date | Boekstukdatum | Voucher date |
| `VoucherNo` | string | Boekstuknummer | Voucher number (e.g. "B052500001") |
| `Description` | string | Omschrijving boeking | Full description — contains borrower name + loan ref |
| `DimAx1` | string | Verbijzonderingsas 1 | **Loan ID** (e.g. "484", "507", "513") |
| `DimAx2`–`DimAx5` | string | Verbijzonderingsas 2–5 | Not used for loans |
| `Created` | date | Datum toegevoegd | Record creation timestamp |
| `Modified` | date | Datum gewijzigd | Last modification timestamp |
| `Type` | string | Type rekening | Account type (e.g. "Activa") |
| `Collect_On` | string | Type verzamelrekening | Collection account type |

### Sample Data (confirmed live, RED IV / UnitId=5)

```
Journal 50 + Account 1750/1751:
  2025-12-08  1751  DimAx1=507  Debit=258,375    "RAX507 Termijn 11" (draw)
  2025-12-15  1750  DimAx1=512  Credit=975,000   "algehele aflossing RAX512" (repayment)
  2025-12-17  1751  DimAx1=484  Debit=27,469     "RAX484" (draw)
  2025-12-17  1750  DimAx1=513  Debit=8,250,000  "RAX513 Leningen" (draw)
  2025-12-19  1751  DimAx1=507  Debit=775,125    "RAX507 Termijnen 12 13 14" (draw)
  2025-12-29  1751  DimAx1=514  Debit=2,406      "RAX514 dec-25" (small — possibly interest?)
```

### Interpretation

- **Debit on 1750** = new principal draw (money out to borrower)
- **Debit on 1751** = draw on PIK/accrued interest account
- **Credit on 1750** = principal repayment (money back from borrower)
- **DimAx1** = loan ID — reliably set on all 1750/1751 bank rows
- **Unique key** for dedup: `EntryNo` + `SeqNo` (unique within an administration)

### Note: Cash Interest Received Uses Different Accounts

Cash interest payments from borrowers do **NOT** appear on accounts 1750/1751. They settle against **debtor sub-accounts (104xx range)** in the same bank journal (50). See **Connector #3** for the filter and field mapping.

### Field Mapping to `afas_sync_items`

| Response Field | `afas_sync_items` Column | Notes |
|---|---|---|
| `EntryNo` + `SeqNo` | `afas_reference` | Unique within administration (e.g. "35-1") |
| `DimAx1` | maps to `loan_id` | Loan ID lookup (e.g. "484" → loan with that ref) |
| `AmtDebit` or `AmtCredit` | `amount` | Debit = draw, Credit = repayment |
| `EntryDate` | `afas_date` | Transaction date |
| `Description` | — | Stored in `raw_json`, useful for display |
| `AccountNo` | — | "1750" vs "1751" distinguishes principal vs PIK |
| Full row | `raw_json` | Stored for audit |
| — | `sync_type` | `'loan_draw'` or `'principal_repayment'` based on debit/credit |
| — | `status` | Initially `'pending'` |

---

## 5. Push: Create New Debtor

**Direction:** Loan Tool → AFAS
**AFAS Connector:** KnSalesRelationOrg (Sales Relation — Organisation)
**Purpose:** Create a new debtor in AFAS when a new loan is onboarded. The debtor code equals the loan ID (e.g. loan 518 = debtor "518", displayed as "RAX518" in AFAS UI). Required data: debtor code, organisation name, and borrower address.

### Structure

Single element with nested `KnOrganisation` (org details) and `KnBasicAddressAdr` (address) objects.

### Field Reference

#### Sales Relation — `KnSalesRelationOrg.Element`

| Field | Location | Example | Static/Dynamic | Description |
|---|---|---|---|---|
| `@DbId` | Element attribute | "518" | Dynamic | Debtor ID — loan ID (string). Set as XML attribute on Element, not in Fields. |

#### Sales Relation Fields — `KnSalesRelationOrg.Element.Fields`

| Field | Example | Static/Dynamic | Description |
|---|---|---|---|
| `IsDb` | true | Static | Is debtor — always true |
| `PaCd` | "30" | Static | Payment condition code (30 days) |
| `CuId` | "EUR" | Static | Currency — always EUR |
| `ColA` | "1400" | Static | Collection account (default receivables GL) |

#### Organisation — `KnOrganisation.Element.Fields`

| Field | Example | Static/Dynamic | Description |
|---|---|---|---|
| `PadAdr` | true | Static | Pad address — always true |
| `AutoNum` | false | Static | No auto-numbering — we provide our own debtor code |
| `MatchOga` | "6" | Static | Match method (6 = match on BcCo) |
| `BcCo` | "518" | Dynamic | Business/debtor code — same as `@DbId` (= loan ID) |
| `Nm` | "Borrower Name B.V." | Dynamic | Organisation name — from `loan.borrower_name` |

#### Address — `KnBasicAddressAdr.Element.Fields`

| Field | Example | Static/Dynamic | Description |
|---|---|---|---|
| `CoId` | "NL" | Static | Country code — always NL |
| `PbAd` | false | Static | Is postal address — false |
| `StAd` | "" | Static | State — empty (not used in NL) |
| `Ad` | "Keizersgracht" | Dynamic | Street name — from borrower address |
| `HmNr` | 100 | Dynamic | House number — from borrower address |
| `ZpCd` | "1015 AA" | Dynamic | Postal code — from borrower address |
| `Rs` | "Amsterdam" | Dynamic | City — from borrower address |

### Dynamic Field Mapping

| JSON Field | Source in Loan Tool |
|---|---|
| `@DbId` | `String(loan.id)` — loan ID as debtor code |
| `BcCo` | Same as `@DbId` |
| `Nm` | `loan.borrower_name` |
| `Ad` | Borrower street name |
| `HmNr` | Borrower house number |
| `ZpCd` | Borrower postal code |
| `Rs` | Borrower city |

### Example JSON

```json
{
  "KnSalesRelationOrg": {
    "Element": {
      "@DbId": "518",
      "Fields": {
        "IsDb": true,
        "PaCd": "30",
        "CuId": "EUR",
        "ColA": "1400"
      },
      "Objects": [
        {
          "KnOrganisation": {
            "Element": {
              "Fields": {
                "PadAdr": true,
                "AutoNum": false,
                "MatchOga": "6",
                "BcCo": "518",
                "Nm": "Borrower Name B.V."
              },
              "Objects": [
                {
                  "KnBasicAddressAdr": {
                    "Element": {
                      "Fields": {
                        "CoId": "NL",
                        "PbAd": false,
                        "StAd": "",
                        "Ad": "Keizersgracht",
                        "HmNr": 100,
                        "ZpCd": "1015 AA",
                        "Rs": "Amsterdam"
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    }
  }
}
```

---

## Vehicle Administration Codes

| Vehicle | UnId | Notes |
|---|---|---|
| RED IV | 5 | Confirmed |
| TLF | TBD | Awaiting code — same AFAS environment, different administration |

## GL Account Mapping

| AcNr | Purpose | Used In |
|---|---|---|
| 104xx | Debtor sub-accounts (per borrower) | PIK journal entry — debit line |
| 1750 | Loan receivable — principal | Bank journal (draws/repayments) |
| 1751 | Loan receivable — PIK/accrued interest | Bank journal (draws) + PIK journal entry |
| 1752 | Loan receivable — TLF | TLF loan accounts (confirmed by accountant) |
| 9350 | Interest income | PIK credit / Cash-pay invoice |
| 9351 | Commitment fee income | PIK credit / Cash-pay invoice |
| 9352 | TBD | — |
| 9353 | TBD | — |
| 9354 | TBD | — |

## Bank Journal Codes

| JournalId | Description | Notes |
|---|---|---|
| 50 | Current bank account | Active — used for all draws/repayments currently |
| 5 | New bank account | Coming March/April 2026 — must be included in sync |
| 52 | New bank account | Coming March/April 2026 — must be included in sync |

## Known Loan IDs in AFAS (from live data)

**RED IV (UnitId=5):** 484, 493, 504, 505, 507, 509, 510, 511, 512, 513, 514
**TLF:** 518, 520, 526, 527 (confirmed by accountant)
