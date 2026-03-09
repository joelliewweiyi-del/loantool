# CLAUDE.md — RAX Finance Loan Management System

## What This Is

A loan servicing tool for **RAX Finance**, a Dutch real estate private credit fund. It tracks loan events, calculates interest accruals using the 30E/360 (Eurobond) day count convention, manages billing periods, generates borrower interest notices, and posts charges to **AFAS Profit** (Dutch ERP/accounting software).

The system currently manages two investment vehicles: **RED IV** (RAX RED IV B.V.) and **TLF**. Each vehicle has its own loan portfolio. Vehicle is a field on the `loans` table and drives the tab filter on the Loans page.

The app is a SPA (React) backed by Supabase (PostgreSQL + Auth + Deno Edge Functions). There is no separate backend server — all business logic lives either in the frontend (`src/lib/`) or in Supabase Edge Functions (`supabase/functions/`).

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui (Radix primitives + Tailwind CSS) |
| Server state | TanStack Query v5 |
| Forms | react-hook-form + zod |
| Routing | react-router-dom v6 |
| Dates | date-fns v3 |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Edge Functions | Deno (TypeScript) |
| Accounting integration | AFAS Profit REST API |
| Auth | Supabase Auth (email/password) |

---

## Design System — "Ink & Parchment"

The UI follows a custom design system called **Ink & Parchment**, derived from the RAX Finance brand. All tokens live in CSS custom properties in `src/index.css`.

### Color Palette

| Token | HSL | Purpose |
|---|---|---|
| `--primary` | `200 100% 18%` | RAX teal-navy (from logo `#003B5C`). Headings, active states, links. |
| `--accent-amber` | `40 90% 52%` | Attention/action: drafts, pending items, warnings, draws. |
| `--accent-sage` | `152 35% 45%` | Confirmation/success: approved, paid, matched, connected. |
| `--destructive` | `0 65% 48%` | Errors, variance, missing data. |
| `--background` | `40 20% 97%` | Warm parchment off-white (not cold gray). |
| `--sidebar-background` | `210 15% 94%` | Cool light gray — temperature contrast with warm content. |

**Rule: Only 3 semantic accents** (amber, sage, destructive). No raw Tailwind color classes (`emerald-600`, `orange-100`, etc.) — always use the design tokens.

### Text Hierarchy

`--foreground` → `--foreground-secondary` → `--foreground-tertiary` → `--foreground-muted` (4 levels, warm-tinted).

### Typography

IBM Plex Sans (body) + IBM Plex Mono (numbers, loan IDs, amounts). No Barlow.

### Signature Patterns

- **FinancialStrip** (`src/components/loans/FinancialStrip.tsx`): Horizontal label-value pairs with top/bottom border. Replaces card-grid KPI bars. Used on Loans, LoanDetail, MonthlyApproval.
- **PeriodPipeline** (`src/components/loans/PeriodPipeline.tsx`): 5-dot lifecycle visualization (open → submitted → approved → sent → paid). Horizontal in table rows, vertical in notice workflow.
- **LoanStatusBadge** (`src/components/loans/LoanStatusBadge.tsx`): 3 semantic categories — action (amber), done (sage), problem (destructive).

### Status Color Mapping

| Category | CSS Class | Color | Statuses |
|---|---|---|---|
| Action needed | `.status-action` | amber | `draft`, `open`, `submitted` |
| Completed | `.status-done` | sage | `approved`, `sent`, `paid`, `active`, `repaid` |
| Problem | `.status-problem` | destructive | `defaulted` |
| Neutral | `.status-neutral` | muted | fallback |

---

## Key Concepts and Architecture

### Event Sourcing

Loan state is **derived by replaying events** from the `loan_events` table — not stored directly. The `loans.outstanding` column is a denormalized cache only (updated when events are approved). The source of truth is always the event ledger.

The core replay function is `getLoanStateAtDate(events, targetDate)` in `src/lib/loanCalculations.ts`. It applies events in chronological order up to the target date, computing: outstanding principal, interest rate, commitment, and undrawn amount.

Events have a lifecycle: **draft → approved**. Only approved events affect calculations.

### 30E/360 Day Count Convention

Interest is calculated using the **30E/360 Eurobond** method (not actual/365 or actual/360). Day 31 is capped to 30 for both start and end dates. Formula:

```
days = (Y2 - Y1) × 360 + (M2 - M1) × 30 + (D2 - D1) + 1
```

Implemented in `daysBetween30360()` in `src/lib/format.ts`. This is used for all period accrual calculations. Daily accruals in the Edge Function use calendar days for the daily loop, but the 30/360 count is what drives the interest notice totals.

### Interest Segmentation

When a rate change or principal draw/repayment occurs **mid-period**, the period is split into sub-segments. Each segment accrues independently. This is handled by `calculateInterestSegments()` and `calculateCommitmentFeeSegments()` in `src/lib/loanCalculations.ts`.

Events on the **first day** of the period (period_start) affect the opening balance. Events on the **last day** (period_end) are excluded from segmentation (they affect the next period's opening).

### PIK vs Cash-Pay

Loans have `interest_type`: either `'pik'` (Payment-in-Kind) or `'cash_pay'`.

- **Cash-pay**: Interest is owed in cash. An AFAS invoice is posted.
- **PIK**: Interest capitalizes into principal via a `pik_capitalization_posted` event. The PM creates this event from the "Roll Up" button on the Accruals tab; the controller approves it.

Fees (`fee_invoice` events) can also be cash or PIK independently of the loan's interest type.

### Period Lifecycle

```
open → submitted → approved → sent → paid
```

- **open**: Default state, accumulating accruals
- **submitted**: PM has submitted for review (not heavily used yet)
- **approved**: Controller has approved (either individually or via Monthly Approval batch)
- **sent**: Interest notice has been sent to borrower; AFAS posting attempted
- **paid**: Payment confirmed received (cash-pay) or interest capitalized and booked (PIK)

### Monthly Approval

The controller reviews all periods for a calendar month and batch-approves them in one action. Periods with economic events (draws, repayments, rate changes) are flagged "Manual" for review; others are "Auto". The `monthly_approvals` table records the batch approval.

### AFAS Integration

AFAS Profit is the fund's accounting ERP. The loan tool is the **single source of truth** for all loan calculations. AFAS is the accounting backend — it records what has happened financially (bank payments, disbursements) and receives postings from the loan tool for what should be booked.

**Architecture principle**: The loan tool tells AFAS what to book (interest charges). AFAS tells the loan tool what actually moved through the bank (payments received, draws disbursed). The controller reviews and confirms both directions — nothing is auto-matched or auto-posted.

#### Push to AFAS (Loan Tool → AFAS)

Two types of interest postings:
1. **PIK / capitalized interest** — interest that rolls up into principal (no cash movement). Posted as a journal entry.
2. **Cash interest receivable** — interest that the borrower owes in cash. Posted as an invoice/receivable against the borrower's debtor account.

GL accounts 9350–9354 are used for different types of interest income (exact mapping TBD). Every posting to these accounts requires a mandatory field (`DimAx1` / verbijzonderingsveld) filled with the **loan ID**.

Push is always **controller-initiated** (click to post, no auto-push). The dashboard confirms success/failure per posting.

#### Depot Split Accounting in AFAS (CRITICAL)

Loans with `cash_interest_percentage < 100` (e.g. 50% cash) have a depot/interest reserve split. The borrower pays the full interest, but only the cash portion is actual bank revenue — the rest settles against an interest reserve (depot).

**How AFAS books this — TWO methods exist for the same economic outcome:**

**Method 1 (used Dec 2025, Jan 2026):** Within a single J50 bank entry:
- Credit on debtor account (e.g. 514) for the **full invoice amount** (e.g. €4,812.50)
- Debit on account **1751** (interest depot reserve) for the depot portion (e.g. €2,406.25)
- Net cash = credit − debit = €2,406.25

**Method 2 (used Feb 2026+):** Split across two journals:
- J50 credit on debtor account for **only the cash portion** (€2,406.25)
- J90 (memorial) credit on debtor account for the **depot portion** (€2,406.25)

**Both methods produce the same net cash of €2,406.25.**

**IMPORTANT for code:** When reading J50 (bank) entries via `Profit_Transactions_Allocated` or `Profit_Transactions`, the credit on the debtor account may be the GROSS amount (Method 1) or the NET amount (Method 2). You MUST also query account 1751 debits in the same bank entry (same `EntryNo`) and subtract them to get the true cash amount. Never assume the J50 credit on the debtor account equals the actual cash received.

**Key accounts:**
- **Account 514** (or any debtor account): J50 credit = invoice settlement (may be gross or net depending on method)
- **Account 1751**: J50 debit = depot portion clawed back from the gross settlement. Only present in Method 1.
- **Journal 90**: Credit on debtor account = depot settlement. Only present in Method 2.

**The `test-afas-draws` Edge Function** accepts an optional `connector` parameter (default: `Profit_Transactions_Allocated`). Use `Profit_Transactions` for raw/unallocated data.

#### Pull from AFAS (AFAS → Loan Tool)

Two types of incoming data, synced via **daily automated background job**:

1. **Received interest payments** — when a borrower transfers interest to our bank account, AFAS picks it up and settles it against the open debtor item. The loan tool pulls this data to verify the payment matches what was calculated. Controller reviews and confirms the match. On confirmation, the period moves to `paid` status.
2. **Loan draws** — draws originate in AFAS as bank payments out to the borrower. AFAS links them to loans via a mandatory field (`DimAx1`) containing the loan ID. Draws flow into the AFAS dashboard first. The **PM reviews and confirms** the draw (controller already verified it on the AFAS/bank side), which creates a `principal_draw` event in the loan tool.

All deltas between expected and actual amounts are flagged for review. No auto-matching.

#### Debtor Management

Borrowers are existing debtors in AFAS. For newly created loans in the system, a new AFAS debtor account is created — shown first in the AFAS dashboard for review before creation. Only minimal data needed: debtor code + name.

Debtor codes need to be mapped to loans (`afas_debtor_code` column on `loans` table, TBD). Existing loans need a bulk upload of debtor IDs.

#### Current State

Existing AFAS integration code is **draft/test quality**:
- `post-period-to-afas` Edge Function exists but only handles PIK, GL account hardcoded
- `get-afas-debtors`, `test-afas-connection`, `test-afas-read`, `test-afas-write` are test utilities
- No pull (read) integration exists yet (daily sync jobs not built)
- **AFAS Dashboard exists** (`/afas` route) — shows connector status, cash payments, draws, and a data explorer with reconciliation. However, it reads raw AFAS data directly via Edge Functions, not from a staging table.
- JSON connector mappings and API keys are being prepared

AFAS credentials and admin code are stored as Supabase secrets (`AFAS_BASE_URL`, `AFAS_TOKEN`, `AFAS_ADMINISTRATIE_CODE`).

#### Target Architecture (Phase 2)

**Three data flows with clear ownership:**

1. **Push: interest → AFAS** (Controller initiates)
   - Period approved → appears in Dashboard Outbox
   - Controller clicks "Post" → Edge Function posts to AFAS with GL account (9350–9354 based on interest type), `DimAx1` = loan ID, debtor code from `loans` table
   - Success/failure shown in dashboard

2. **Pull: payments received** (Daily auto-sync, Controller confirms)
   - Daily job pulls settled debtor items from AFAS
   - Matched to periods via invoice ref + debtor code
   - Lands in Dashboard Inbox with expected vs. actual amount
   - Delta ≠ 0 → flagged for review
   - Controller clicks Confirm → period status → `paid`

3. **Pull: loan draws** (Daily auto-sync, PM confirms)
   - Daily job pulls bank payments where `DimAx1` is set
   - Lands in Dashboard Inbox with loan ID + amount + date
   - PM reviews and clicks Confirm Draw → creates `principal_draw` event (draft → normal approval flow)
   - Four-eyes: controller already verified in AFAS/bank, PM confirms in loan tool

**Staging table — `afas_sync_items`:**

Pulled AFAS data lands in a staging table before becoming actual events:

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid | PK |
| `sync_type` | text | `'payment_received'` or `'loan_draw'` |
| `afas_reference` | text | AFAS transaction ID |
| `debtor_code` | text | AFAS debtor |
| `loan_id` | uuid / null | Matched loan (via DimAx1 / debtor code) |
| `amount` | numeric | Actual amount from AFAS |
| `afas_date` | date | Transaction date |
| `expected_amount` | numeric / null | What loan tool calculated (for payments) |
| `delta` | numeric / null | `amount - expected_amount` |
| `status` | text | `'pending'` / `'confirmed'` / `'flagged'` / `'dismissed'` |
| `confirmed_by` | uuid / null | User who confirmed |
| `confirmed_at` | timestamptz / null | When confirmed |
| `created_event_id` | uuid / null | The `loan_event` created on confirmation |
| `synced_at` | timestamptz | When pulled from AFAS |
| `raw_json` | jsonb | Full AFAS response for audit |

Daily sync upserts into this table. The dashboard reads from it. When controller/PM confirms, it creates the actual event and links back via `created_event_id`.

**Components to build:**

| Component | Type | Purpose |
|---|---|---|
| `afas_debtor_code` column on `loans` | DB migration | Join key between systems |
| `afas_sync_items` table | DB migration | Staging table for pulled AFAS data |
| `sync-afas-payments` Edge Function | Deno | Daily job: pull settled debtor items |
| `sync-afas-draws` Edge Function | Deno | Daily job: pull bank payments with DimAx1 |
| `create-afas-debtor` Edge Function | Deno | Create minimal debtor in AFAS |
| Rework `post-period-to-afas` | Deno | Handle both PIK and cash-pay, dynamic GL, DimAx1 |
| AFAS Dashboard page | React | **Done (basic)** — needs Outbox + Inbox panels with staging table |
| Period `paid` status | DB + frontend | New status in lifecycle |

**Blocked on:** AFAS JSON connector definitions (GET response field names), GL account mapping (9350–9354), and debtor code bulk upload.

### RBAC

Three roles stored in `user_roles` table:
- **pm**: Can create events, create loans, roll up PIK interest
- **controller**: Can approve events, approve months, post to AFAS
- **admin**: Can delete loans, correct event amounts

Role checks via `useAuth()` hook which exposes `isPM`, `isController`, `isAdmin` booleans.

### Simulated Date

`src/lib/simulatedDate.ts` provides `getCurrentDate()` for development/demo purposes. Currently hardcoded to `2026-06-15` — **this will need to be set to `null` before going live**.

---

## Important Files

### Design System

| File | Purpose |
|---|---|
| [src/index.css](src/index.css) | All CSS custom properties (design tokens), status classes, data-table styles, utility classes. Source of truth for the color system. |
| [tailwind.config.ts](tailwind.config.ts) | Tailwind extended with semantic tokens from CSS vars: `accent.amber`, `accent.sage`, `border.strong`, `foreground.secondary/tertiary/muted` |

### Core Calculation Engine

| File | Purpose |
|---|---|
| [src/lib/loanCalculations.ts](src/lib/loanCalculations.ts) | All interest/accrual math: `getLoanStateAtDate`, `calculateInterestSegments`, `calculatePeriodAccruals`, `calculateAccrualsSummary` |
| [src/lib/format.ts](src/lib/format.ts) | `daysBetween30360` (30E/360 implementation), `formatCurrency`, `formatPercent`, `formatDate`, `formatEventType` |
| [src/lib/simulatedDate.ts](src/lib/simulatedDate.ts) | Dev-only date simulation — **must be nulled before production** |

### Types

| File | Purpose |
|---|---|
| [src/types/loan.ts](src/types/loan.ts) | All TypeScript interfaces: `Loan`, `LoanEvent`, `Period`, `MonthlyApproval`, `AccrualEntry`, `NoticeSnapshot`, `UserRole`, etc. Key union types: `EventType` (11 values), `LoanStatus`, `PeriodStatus`, `AppRole`, `InterestType` |
| [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts) | Auto-generated Supabase DB types — do not hand-edit |

### Hooks (Data Layer)

| File | Purpose |
|---|---|
| [src/hooks/useLoans.ts](src/hooks/useLoans.ts) | `useLoans`, `useLoan`, `useLoanEvents`, `useLoanPeriods`, `useCreateLoan`, `useApproveEvent`, `useDeleteLoan`, `useLatestChargesPerLoan`. Also contains `generateMonthlyPeriods` |
| [src/hooks/useAccruals.ts](src/hooks/useAccruals.ts) | `useAccruals(loanId)` — orchestrates loan + events + periods, runs `calculateAllPeriodAccruals` |
| [src/hooks/useMonthlyApproval.ts](src/hooks/useMonthlyApproval.ts) | `useMonthlyApprovals`, `useMonthlyApprovalDetails`, `useApproveMonth`, `useTriggerDailyAccruals` |
| [src/hooks/useAuth.tsx](src/hooks/useAuth.tsx) | Auth context with Supabase; exposes `user`, `roles`, `isPM`, `isController`, `isAdmin`, `signIn`, `signOut` |

### Pages

| File | Purpose |
|---|---|
| [src/pages/Loans.tsx](src/pages/Loans.tsx) | Loan portfolio list with vehicle tabs (RED IV / TLF), FinancialStrip metrics, sortable table, search. Single-click rows navigate to detail. |
| [src/pages/LoanDetail.tsx](src/pages/LoanDetail.tsx) | Single loan view: FinancialStrip, tabs: Interest Periods → Notices → Event Ledger |
| [src/pages/MonthlyApproval.tsx](src/pages/MonthlyApproval.tsx) | Month-by-month batch approval for controller. Tabs: Cash Payments / Draws & Repayments. FinancialStrip summaries. |
| [src/pages/Afas.tsx](src/pages/Afas.tsx) | Consolidated AFAS page with 2 tabs: Dashboard + Data Explorer. Route: `/afas`. |
| [src/pages/AfasDashboard.tsx](src/pages/AfasDashboard.tsx) | AFAS connector status, cash payments, draws. Embedded inside Afas.tsx via `embedded` prop. |
| [src/pages/AfasData.tsx](src/pages/AfasData.tsx) | AFAS data explorer (connectors, raw data, reconciliation). Embedded inside Afas.tsx via `embedded` prop. |
| [src/pages/Auth.tsx](src/pages/Auth.tsx) | Login / sign-up |

### Key Components

| File | Purpose |
|---|---|
| [src/components/loans/FinancialStrip.tsx](src/components/loans/FinancialStrip.tsx) | Ledger-style horizontal metrics strip. Items: `{ label, value, accent?, mono? }`. |
| [src/components/loans/PeriodPipeline.tsx](src/components/loans/PeriodPipeline.tsx) | 5-dot period lifecycle visualization. Horizontal (table rows) or vertical (notices). |
| [src/components/loans/LoanStatusBadge.tsx](src/components/loans/LoanStatusBadge.tsx) | Status badges with 3 semantic color categories. |
| [src/components/loans/AccrualsTab.tsx](src/components/loans/AccrualsTab.tsx) | Main accruals UI: period table with PeriodPipeline, expandable segments, PIK "Roll Up" button, daily breakdown |
| [src/components/loans/NoticePreviewTab.tsx](src/components/loans/NoticePreviewTab.tsx) | Interest notice preview — renders the full PDF-style notice document per period, vertical PeriodPipeline for workflow |
| [src/components/loans/CreateLoanDialog.tsx](src/components/loans/CreateLoanDialog.tsx) | New loan creation form |
| [src/components/loans/BatchUploadDialog.tsx](src/components/loans/BatchUploadDialog.tsx) | CSV batch loan import |
| [src/components/loans/EditLoanDialog.tsx](src/components/loans/EditLoanDialog.tsx) | Edit loan metadata (borrower name, dates, rates, etc.) |
| [src/components/layout/AppLayout.tsx](src/components/layout/AppLayout.tsx) | Sidebar layout with grouped navigation: Portfolio, Workflow, Integration |

### Edge Functions (Supabase / Deno)

| File | Purpose |
|---|---|
| [supabase/functions/process-daily-accruals/index.ts](supabase/functions/process-daily-accruals/index.ts) | Nightly batch: iterates all active loans, generates `accrual_entries` rows per day. Supports single date, date range, and backfill modes. **Duplicates** `getLoanStateAtDate` logic (not shared with frontend). |
| [supabase/functions/post-period-to-afas/index.ts](supabase/functions/post-period-to-afas/index.ts) | Posts a period's interest charge to AFAS as a sales invoice. Requires period status = `sent`. **PIK only** — reads `pik_capitalization_posted` event. |
| [supabase/functions/correct-event-amount/index.ts](supabase/functions/correct-event-amount/index.ts) | Admin correction: creates a reversal + new event pair to fix an event amount |
| [supabase/functions/get-afas-debtors/index.ts](supabase/functions/get-afas-debtors/index.ts) | Fetches debtor list from AFAS for the data explorer |
| [supabase/functions/test-afas-connection/index.ts](supabase/functions/test-afas-connection/index.ts) | AFAS connectivity test |

### Database

Migrations are in `supabase/migrations/`. Key tables:

| Table | Purpose |
|---|---|
| `loans` | One row per loan. `outstanding` is denormalized cache. `vehicle` field = 'RED IV' or 'TLF'. |
| `loan_events` | Append-only event ledger. `status` = draft/approved. `metadata` JSON for extra fields. |
| `periods` | Pre-generated monthly periods per loan. `status` drives the approval workflow. |
| `accrual_entries` | Daily accrual rows generated by Edge Function (one per loan per day) |
| `monthly_approvals` | One row per calendar month; records batch approval by controller |
| `user_roles` | Maps `user_id` → `AppRole` (pm, controller, admin) |
| `notice_snapshots` | Immutable JSON snapshot when a notice is sent |
| `processing_jobs` | Log of Edge Function runs |
| `loan_facilities` | TLF-specific sub-facility tracking |
| `audit_logs` | Change audit trail |

Key DB functions: `calculate_principal_balance`, `get_loan_balances`, `determine_period_processing_mode`, `period_has_economic_events`, `create_founding_event`, `admin_delete_loan`, `admin_correct_event_amount`.

RLS is enabled on all tables. Policies use `has_any_role()` and `has_role()` helper functions defined in migrations.

---

## Event Types

The `EventType` union (11 values) and how each affects loan state:

| Event | Affects |
|---|---|
| `principal_draw` | Increases outstanding principal |
| `principal_repayment` | Decreases outstanding principal |
| `interest_rate_set` | Sets initial rate |
| `interest_rate_change` | Changes current rate |
| `pik_flag_set` | Sets `interestType` to PIK |
| `commitment_set` | Sets total commitment |
| `commitment_change` | Changes commitment |
| `commitment_cancel` | Sets commitment to 0 (semantics: full cancellation) |
| `cash_received` | Accounting only; no state change |
| `fee_invoice` | Records a fee; metadata has `fee_type` and `payment_type` (cash/pik) |
| `pik_capitalization_posted` | Increases outstanding principal (PIK interest rolled up) |

Events are hidden from the UI's event ledger view: `cash_received`, correction/reversal pairs, auto-generated approved PIK capitalizations, and `principal_repayment` with `adjustment_type: fee_split`.

---

## Workflow — How a Period Gets Processed

1. **Loan created** → founding events auto-created (`commitment_set`, `interest_rate_set`, `principal_draw`, `fee_invoice`) → monthly periods pre-generated to maturity
2. **Daily** (Edge Function) → `accrual_entries` inserted for each active loan
3. **PM** → reviews Accruals tab → clicks "Roll Up" on a PIK loan to create a `pik_capitalization_posted` draft event
4. **Controller** → approves the PIK event (or reviews and approves individual events)
5. **Controller** → goes to Monthly Approval → reviews exceptions → clicks "Approve All Periods"
6. **Controller** → for each approved period → posts to AFAS (PIK only currently)
7. Interest Notice tab → preview → "Send to Borrower" (snapshot stored, status → `sent`)

---

## Current State and Known Issues

### Critical

1. **Cash-pay AFAS posting is not implemented.** The `post-period-to-afas` function only handles PIK loans. Cash-pay loans have no path from `approved` to being invoiced in AFAS. The function returns a 400 if `totalAmount` would be 0.

2. **`SIMULATED_DATE` is hardcoded to `2026-06-15`.** `src/lib/simulatedDate.ts` must be set to `null` before going live, otherwise `getCurrentDate()` always returns that date.

3. **`loans.interest_rate` and `loans.total_commitment` are not synced from events.** When an `interest_rate_change` or `commitment_change` event is approved, `useApproveEvent` only updates `loans.outstanding`. The rate and commitment columns on the `loans` table can drift from the event ledger truth. The Loans list page reads from `loans` columns directly.

### High Priority

4. **Period creation failure is silently swallowed.** In `useCreateLoan`, the period generation call is wrapped in a try/catch that only does `console.error` — not throws. A loan can be created with no periods and there will be no UI error.

5. **`useMonthlyApprovalDetails` has a write side-effect inside a React Query `queryFn`.** It creates a `monthly_approvals` record if one doesn't exist. This can fire multiple times (strict mode, refetches) and is an anti-pattern. Should be moved to a mutation or an upsert.

6. **Daily accrual totals vs. 30/360 period totals don't reconcile.** The Edge Function sums calendar-day accruals; the frontend calculates 30/360 period totals. These can differ by small amounts due to day-count differences, especially at period boundaries.

7. **`useAccruals` uses `new Date()` directly** (line 59) instead of `getCurrentDate()` from `simulatedDate.ts`. The simulated date is therefore not applied consistently.

8. **`generateMonthlyPeriods` uses `new Date()` directly** — same issue, bypasses simulated date.

### Medium Priority

9. **No self-approval prevention.** A user with `controller` role can approve their own draft events.

10. **`commitment_cancel` semantics are ambiguous.** The event sets commitment to 0 in `applyEventToState`, but it's unclear if this means full cancellation or partial. There's no `amount` check — any `commitment_cancel` event zeroes the commitment.

11. **GL account hardcoded as `"9350"` in `post-period-to-afas`** with a TODO comment. This needs to be configurable per loan or vehicle.

12. **`useLatestChargesPerLoan` is an expensive fan-out query.** It fetches all approved events for all loans that have open periods — effectively a full event table scan. Will degrade as loan count grows.

13. **Notice "Send to Borrower" and "Download PDF" buttons are UI-only stubs.** Clicking them does nothing yet — no actual email sending or PDF generation is wired up.

14. **Payment instructions on interest notices contain placeholder text** (`[Bank Name]`, `[IBAN Number]`, `[BIC Code]`). These need to be real account details before notices can be sent to borrowers.

15. **Invoice number collision risk.** AFAS invoice numbers are generated as `INT-{loan_id}-{period_end}`. If a period is re-posted after correction, a duplicate invoice number could be created.

---

## Roadmap

### Phase 1 — Core Functionality ✓
- Event sourcing loan ledger
- 30E/360 interest accruals
- PIK and cash-pay loan types
- Period lifecycle management
- Monthly batch approval workflow
- Interest notice preview
- AFAS posting (PIK)
- Two-vehicle portfolio (RED IV, TLF)
- RBAC (pm / controller / admin)

### Phase 1.5 — UI Rework ✓ ("Ink & Parchment")
- Custom design system: warm parchment surfaces, RAX teal-navy primary, 3 semantic accents
- Cool light sidebar (temperature contrast) with grouped navigation
- FinancialStrip component replacing card-grid KPI bars
- PeriodPipeline lifecycle visualization (5-dot horizontal/vertical)
- LoanStatusBadge with 3 semantic categories
- Consolidated AFAS page (`/afas`) with Dashboard + Data Explorer tabs
- Deleted AfasGLExplorer (no longer needed)
- Single-click loan rows, tighter data density
- IBM Plex Sans + Mono typography
- All colors use semantic tokens (no raw Tailwind color classes)

### Phase 2 — Hardening for Production

**Error handling and robustness:**
- Throw (don't swallow) period creation failures in `useCreateLoan`
- Fix mutation-in-queryFn anti-pattern in `useMonthlyApprovalDetails`
- Add self-approval prevention (controller cannot approve own events)
- Null out `SIMULATED_DATE` and audit all `new Date()` usages — replace with `getCurrentDate()` consistently

**AFAS posting completeness:**
- Implement cash-pay AFAS posting path
- Make GL account (`AcId`) configurable per loan or vehicle
- Add idempotency protection against duplicate invoice numbers
- Wire up AFAS debtor codes to loans (currently no debtor linkage)

**Data integrity:**
- Sync `loans.interest_rate`, `loans.total_commitment` from events on approval (not just `loans.outstanding`)
- Add DB constraint or trigger to prevent `period_end < period_start`
- Add unique constraint on `accrual_entries(loan_id, date)` to prevent duplicate daily entries

**Notice delivery:**
- Implement actual email sending (Supabase + Resend or SendGrid)
- Implement PDF generation (server-side, e.g. Puppeteer in Edge Function)
- Fill in real bank account / IBAN details in notice template

**Testing:**
- Unit tests for `daysBetween30360` with edge cases (day 31, February, year-end)
- Unit tests for `calculateInterestSegments` with mid-period rate changes
- Unit tests for `getLoanStateAtDate` with all 11 event types
- Integration tests for the monthly approval batch flow
- End-to-end test: create loan → accrue → roll up PIK → approve → post to AFAS

**AFAS push testing:**
- Make `test-afas-write` generic: accept a `connector` parameter (default `FiEntries`) so it can post to any AFAS update connector (needed for `KnSalesRelationOrg` debtor creation)
- Test cash-pay interest push (Connector #2 / `FiEntryPar`) against AFAS test env using a real loan's calculated accruals — verify via `test-afas-read` that the entry landed correctly
- Test new debtor creation (Connector #5 / `KnSalesRelationOrg`) against AFAS test env — create a test debtor, then read it back via `get-afas-debtors` to confirm
- Build `create-afas-debtor` Edge Function using the `KnSalesRelationOrg` template from `docs/afas-connectors.md`
- Implement cash-pay posting path in `post-period-to-afas` using the `FiEntryPar` template (Connector #2) from `docs/afas-connectors.md`
- Add dry-run mode to both new push functions (debtor creation + cash-pay posting) — preview the JSON payload without actually posting
- Read-back verification after each push: query AFAS to confirm the posted entry/debtor exists and matches expected values

**Reconciliation:**
- Expose a reconciliation view: 30/360 period totals vs. sum of daily `accrual_entries`
- Alert when they diverge beyond a tolerance threshold

### Phase 3 — Enterprise Cleanup

**Refactoring:**
- Extract shared loan state replay logic into a shared package (currently duplicated between `src/lib/loanCalculations.ts` and `process-daily-accruals` Edge Function)
- Replace `(loan as any).loan_id` casts with proper typed DB types throughout frontend
- Move `generateMonthlyPeriods` out of `useLoans.ts` into `src/lib/`
- Add strict TypeScript config (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)

**Multi-vehicle support:**
- Make vehicle list dynamic (currently hardcoded as `'RED IV' | 'TLF'`)
- Per-vehicle AFAS `administratie_code` configuration (currently a single env var)
- Per-vehicle GL account mapping

**Documentation:**
- Document all event types and their state-change semantics
- Document the 30E/360 implementation with reference to ISDA definition
- Document AFAS API integration (endpoints, auth, data mapping)
- Add JSDoc to all public functions in `src/lib/`

**Operational tooling:**
- Admin UI for backfilling accrual entries (currently requires direct Edge Function call)
- Audit log viewer in the frontend
- Processing job history viewer
- Alerting for failed AFAS posts

**Performance:**
- Replace `useLatestChargesPerLoan` fan-out with a server-side aggregation (DB view or RPC)
- Add pagination to the events ledger (currently loads all events)
- Cache accrual calculations in DB for large loan histories

---

## Development Notes

- Run dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Supabase local: `supabase start` (requires Supabase CLI)
- Deploy Edge Functions: `supabase functions deploy <name>`
- The project was scaffolded with Lovable (note `lovable-tagger` in devDependencies)
- Path alias `@/` maps to `src/` (configured in `vite.config.ts`)
- All monetary amounts are stored and calculated in **EUR**, displayed with `formatCurrency()` which uses `€` symbol
- Rates are stored as decimals (0.08 = 8%) but displayed as percentages via `formatPercent()`
- Routes: `/loans`, `/loans/:id`, `/monthly-approval`, `/afas` (consolidated). Legacy routes `/afas-dashboard`, `/afas-data`, `/afas-gl-explorer` redirect to `/afas`.
- Sidebar navigation is grouped: **Portfolio** (Loans), **Workflow** (Monthly Approval), **Integration** (AFAS)
- **Color rule**: Never use raw Tailwind color classes (e.g. `text-emerald-600`, `bg-orange-100`). Always use semantic tokens: `text-accent-sage`, `text-accent-amber`, `text-primary`, `text-destructive`, or their `bg-` / `border-` variants with opacity modifiers.

---

## Daily Backup System

Automated daily backup to OneDrive with full system restore capability. Creates a single zip file containing the database dump, git bundle, env config, and self-contained restore tools.

### How It Works

- **Backup**: `supabase db dump` (wraps pg_dump) captures the full database — schema, data, functions, triggers, RLS, enums, auth users. `git bundle` captures all code + history. Everything goes into one zip on OneDrive.
- **Restore**: Extract zip → run bundled `restore.mjs` → `psql` restores schema + data (triggers auto-disabled via `SET session_replication_role = replica`), `git clone` restores code, Edge Functions auto-redeployed.
- **Automation**: Windows Task Scheduler runs `backup.ps1` daily at 2 AM. `StartWhenAvailable` catches up if the PC was asleep.
- **Self-contained**: Every backup zip includes `restore.mjs` and `RESTORE.md` — restore works from a fresh machine without cloning the repo first.
- **Smart**: Git bundle is skipped if HEAD hasn't changed since last backup. Old backups auto-deleted after retention period.
- **Alerting**: On failure, `BACKUP_FAILED.txt` is created in the project root (visible in VS Code) and an entry is written to Windows Event Log.

### Backup Files

| File | Purpose |
|---|---|
| [scripts/backup.mjs](scripts/backup.mjs) | Main backup script — dumps DB, creates git bundle, verifies, zips to OneDrive |
| [scripts/restore.mjs](scripts/restore.mjs) | Interactive restore script — also bundled inside every backup zip |
| [scripts/backup.ps1](scripts/backup.ps1) | PowerShell wrapper for Task Scheduler — loads env, runs backup, alerts on failure |
| [scripts/setup-scheduled-backup.ps1](scripts/setup-scheduled-backup.ps1) | One-time Task Scheduler registration (run as admin) |
| [scripts/RESTORE.md](scripts/RESTORE.md) | Plain-text restore guide bundled in every zip |

### Commands

```bash
npm run backup                                          # Manual backup
npm run restore                                         # Interactive restore (lists available backups)
npm run restore -- --file path/to/backup.zip            # Direct restore
npm run restore -- --db-only --file path.zip            # Database only (most common)
npm run restore -- --dry-run --file path.zip            # Preview without changes
npm run restore -- --db-url "postgresql://..." --file .  # From extracted zip on fresh machine
```

### Environment Variables (`.env.local`)

```bash
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
BACKUP_ONEDRIVE_PATH=C:/Users/joel_/OneDrive/RAX-Backups
BACKUP_RETENTION_DAYS=30
```

`DATABASE_URL`: From Supabase Dashboard → Settings → Database → Connection string (URI).

### Setup

```bash
# 1. Add DATABASE_URL and BACKUP_ONEDRIVE_PATH to .env.local
# 2. Install psql (needed for restore only):
scoop install postgresql
# 3. Register daily Task Scheduler job (run as admin):
powershell -ExecutionPolicy Bypass -File scripts/setup-scheduled-backup.ps1
```

### Backup ZIP Contents

```
rax-backup-2026-03-04T0200.zip
├── RESTORE.md        # Human-readable restore instructions
├── restore.mjs       # Self-contained restore script
├── manifest.json     # Metadata + verification results
├── schema.sql        # Full DB schema (tables, functions, triggers, RLS, enums)
├── data.sql          # All data (including auth.users)
├── repo.bundle       # Complete git repo + history (omitted if no new commits)
└── env/
    ├── .env          # Public config
    └── .env.local    # Secrets redacted
```

### What's Backed Up vs. Not

| Backed up | Not backed up (manual) |
|---|---|
| All database tables, functions, triggers, RLS, enums | Supabase vault secrets (AFAS_TOKEN, etc.) |
| Auth users (auth.users) | Supabase project settings (auth config, rate limits) |
| All code + git history | |
| All Edge Function source code | |
| Environment config (.env) | |

### Marker Files

- `last-successful-backup.json` — Updated after each successful backup. If this is days old, backups may be failing.
- `BACKUP_FAILED.txt` — Created on backup failure, deleted on next success. Visible in VS Code file explorer.
