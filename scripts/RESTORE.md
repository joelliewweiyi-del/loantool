# RAX Finance — Restore from Backup

This file is bundled inside every backup zip. Follow these steps to restore the system.

## Prerequisites (install on fresh machine)

1. **Node.js** (v18+): https://nodejs.org — or `scoop install nodejs`
2. **PostgreSQL client** (for psql): `scoop install postgresql`
3. **Supabase CLI**: `scoop install supabase`
4. **Git**: https://git-scm.com — or `scoop install git`

## Get Your DATABASE_URL

From Supabase Dashboard → Settings → Database → Connection string (URI):
```
postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

## Option A: Automated Restore (recommended)

```bash
# Extract the backup zip, then from inside the extracted folder:
node restore.mjs --db-url "YOUR_DATABASE_URL" --file .
```

This will:
- Restore the database schema and data
- Clone the code from the git bundle
- Redeploy all Edge Functions

## Option B: Database Only (most common — undo accidental changes)

```bash
psql "YOUR_DATABASE_URL" -f schema.sql
psql "YOUR_DATABASE_URL" -f data.sql
```

## Option C: Manual Full Restore

```bash
# 1. Restore database
psql "YOUR_DATABASE_URL" -f schema.sql
psql "YOUR_DATABASE_URL" -f data.sql

# 2. Restore code
git clone repo.bundle loantool
cd loantool
npm install

# 3. Restore config
cp ../env/.env .env
# Create .env.local with your new credentials (the backup redacts secrets)

# 4. Link Supabase and deploy Edge Functions
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy process-daily-accruals
supabase functions deploy post-period-to-afas
supabase functions deploy correct-event-amount
supabase functions deploy get-afas-debtors
supabase functions deploy get-afas-schema
supabase functions deploy test-afas-connection
supabase functions deploy test-afas-read
supabase functions deploy test-afas-write
supabase functions deploy test-afas-draws
supabase functions deploy parse-loan-document
supabase functions deploy update-afas-token
# (deploy any other functions found in supabase/functions/)
```

## Verify Restore

1. Run `npm run dev` and check the app loads
2. Verify loan data is present on the Loans page
3. Check a loan detail page — events, periods, accruals should match
