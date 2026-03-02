import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://waikgtdlwksjhxolwpyi.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const raw = readFileSync(new URL('./all_data.csv.csv', import.meta.url), 'utf8');
const lines = raw.split('\n').filter(l => l.trim());
const dataLines = lines.slice(1); // skip header

// Group by table
const byTable = {};
for (const line of dataLines) {
  const semiIdx = line.indexOf(';');
  if (semiIdx === -1) continue;
  const table = line.substring(0, semiIdx);
  let jsonStr = line.substring(semiIdx + 1);
  if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
    jsonStr = jsonStr.slice(1, -1).replace(/""/g, '"');
  }
  try {
    const data = JSON.parse(jsonStr);
    if (!byTable[table]) byTable[table] = [];
    byTable[table].push(data);
  } catch (e) {
    console.error('Parse error for', table, ':', e.message);
  }
}

// Import order (FK dependencies)
const importOrder = [
  'loans',
  'loan_events',
  'periods',
  'monthly_approvals',
  'accrual_entries',
  'user_roles',
  'processing_jobs',
];

async function upsertBatch(table, rows) {
  // Supabase REST API: POST with Prefer: resolution=merge-duplicates for upsert
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`  ERROR on ${table} batch ${i}-${i + batch.length}:`, res.status, errText.substring(0, 300));
      // Try one by one for this batch to identify the problem row
      for (let j = 0; j < batch.length; j++) {
        const singleRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify([batch[j]]),
        });
        if (singleRes.ok) {
          inserted++;
        } else {
          const sErr = await singleRes.text();
          console.error(`  SKIP row ${i + j}:`, sErr.substring(0, 200));
        }
      }
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

async function main() {
  console.log('Starting import to', SUPABASE_URL);
  console.log();

  for (const table of importOrder) {
    const rows = byTable[table];
    if (!rows || rows.length === 0) {
      console.log(table + ': no rows, skipping');
      continue;
    }
    console.log(table + ': importing ' + rows.length + ' rows...');
    const count = await upsertBatch(table, rows);
    console.log('  -> ' + count + '/' + rows.length + ' imported');
  }

  console.log();
  console.log('Done. Verifying counts...');
  console.log();

  for (const table of importOrder) {
    const expected = (byTable[table] || []).length;
    if (expected === 0) continue;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
      method: 'HEAD',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact',
      },
    });
    const count = res.headers.get('content-range');
    console.log(table + ': ' + count + ' (expected ' + expected + ')');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
