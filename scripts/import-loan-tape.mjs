/**
 * Import loan tape data from Excel files into Supabase.
 *
 * Reads both Excel loan tape files, merges data (v1 has initial_facility,
 * red_iv_start_date, current_facility; v2 has more complete data for some loans),
 * and updates existing loans in the DB matching on loan_id.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-loan-tape.mjs
 */

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const SUPABASE_URL = 'https://waikgtdlwksjhxolwpyi.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

// ── Parse Excel files using xlsx-cli ──

function parseExcelCSV(filePath) {
  const csv = execSync(`npx xlsx-cli "${filePath}"`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return csv;
}

// Parse CSV with proper handling of quoted fields containing commas
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCSVToRows(csvText, headerRow) {
  const lines = csvText.split('\n').filter(l => l.trim());

  // Find the header row
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(headerRow)) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    console.error('Could not find header row containing:', headerRow);
    return [];
  }

  const headers = parseCSVLine(lines[headerIdx]).map(h => h.trim().replace(/^\uFEFF/, ''));
  const rows = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const loanId = fields[0]?.trim();

    // Only accept rows where Loan ID is a 3-digit number (our loan IDs are 484-527 range)
    if (!loanId) continue;
    if (!/^\d{3}$/.test(loanId)) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = fields[idx]?.trim() || '';
    });

    if (row['Loan ID']) {
      rows.push(row);
    }
  }

  return rows;
}

// ── Value parsers ──

function parseCurrency(val) {
  if (!val || val === '-' || val === ' -   ') return null;
  // Handle €-prefixed format: "€975,000.00"
  val = val.replace(/[€$\s]/g, '');
  // Handle " 25,000,000 " format (thousands commas)
  val = val.replace(/,/g, '');
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function parsePercent(val) {
  if (!val || val === '-' || val === ' -   ') return null;
  val = val.replace('%', '').trim();
  const num = parseFloat(val);
  return isNaN(num) ? null : Math.round(num / 100 * 10000) / 10000; // Store as decimal, 4 dp
}

function parseExcelDate(val) {
  if (!val || val === '-' || val === '0' || val === '0.00') return null;
  val = val.trim();
  // Handle M/D/YY or M/D/YYYY format
  const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    let [, month, day, year] = match;
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return null;
}

function parseBool(val) {
  if (!val) return false;
  return val.trim().toUpperCase() === 'TRUE';
}

// ── Main ──

async function main() {
  console.log('Parsing Excel files...\n');

  // Parse v1 (Feb 1) - has more columns including Initial Facility, RED IV Start Date
  const csv1 = parseExcelCSV(resolve(PROJECT_ROOT, 'docs/Loan tape RED IV 01-02-26.xlsx'));
  const v1Rows = parseCSVToRows(csv1, 'Loan ID,City,Status');
  console.log(`V1 (Feb 1): ${v1Rows.length} loan rows parsed`);

  // Parse v2 (Feb 23) - more structured, has complete data for 512, 526, 527
  const csv2 = parseExcelCSV(resolve(PROJECT_ROOT, 'docs/Loan tape RED IV 23-02-26 v2.xlsx'));
  const v2Rows = parseCSVToRows(csv2, 'Loan ID,City,Status');
  console.log(`V2 (Feb 23): ${v2Rows.length} loan rows parsed`);

  // Index by loan_id
  const v1Map = {};
  for (const row of v1Rows) {
    v1Map[row['Loan ID']] = row;
  }
  const v2Map = {};
  for (const row of v2Rows) {
    v2Map[row['Loan ID']] = row;
  }

  // Merge: v2 is more recent/complete, v1 supplements with extra columns
  const allLoanIds = new Set([...Object.keys(v1Map), ...Object.keys(v2Map)]);
  console.log(`\nTotal unique loan IDs: ${allLoanIds.size}`);
  console.log('Loan IDs:', [...allLoanIds].sort().join(', '));

  const updates = [];

  for (const loanId of allLoanIds) {
    const v1 = v1Map[loanId] || {};
    const v2 = v2Map[loanId] || {};

    // Prefer v2 data, fall back to v1
    const city = (v2['City'] || v1['City'] || '').trim() || null;
    const propertyStatus = (v2['Status'] || v1['Status'] || '').trim() || null;
    const remarks = (v2['Remarks'] || v1['Remarks'] || '').trim() || null;
    const category = (v2['Category'] || v1['Category'] || '').trim() || null;
    const earmarked = parseBool(v2['Earmarked'] || v1['Earmarked']);

    // These only exist in v1
    const currentFacility = (v1['Current Facility'] || '').trim() || null;
    const initialFacility = (v1['Initial Facility'] || '').trim() || null;
    const redIVStartDate = parseExcelDate(v1['RED IV Start Date'] || '');

    // Financial - prefer v2 (more recent), but skip event-sourced fields (outstanding)
    // We only update metadata fields, not financial state which is event-sourced
    const rentalIncome = parseCurrency(v2['Rental Income'] || v1['Rental Income']);
    const valuation = parseCurrency(v2['Valuation (as-is)'] || v1['Valuation (as-is)']);
    const valuationDate = parseExcelDate(v2['Valuation date'] || v1['Valuation date']);
    const ltv = parsePercent(v2['LTV'] || v1['LTV']);
    const maturityDate = parseExcelDate(v2['Maturity Date'] || v1['Maturity Date']);
    const originalStartDate = parseExcelDate(v2['Original Start Date'] || v1['Original Start Date']);

    const update = {
      loan_id: loanId,
      city,
      property_status: propertyStatus,
      remarks,
      category,
      earmarked,
      initial_facility: initialFacility,
      red_iv_start_date: redIVStartDate,
      rental_income: rentalIncome,
      valuation,
      valuation_date: valuationDate,
      ltv,
      maturity_date: maturityDate,
      loan_start_date: originalStartDate,
    };

    // If we know the current facility from v1, set vehicle
    // (v2 doesn't have this column but all these are RED IV loans)
    if (currentFacility && currentFacility !== 'RED IV') {
      // This means the loan is currently in a TLF facility
      // But v2 file is "RED IV" tape so they should be RED IV...
      // The "Current Facility" in v1 shows: RED IV, TLFJANA, TLFDECA, TLFNOV25A, etc.
      // Loans with TLF* as current facility may have moved to RED IV since
      // Since v2 is more recent and lists them all as RED IV loans, keep vehicle as-is
    }

    updates.push(update);
  }

  // Display what we're about to update
  console.log('\n── Updates to apply ──\n');
  for (const u of updates) {
    console.log(`Loan ${u.loan_id}:`);
    const fields = Object.entries(u)
      .filter(([k, v]) => k !== 'loan_id' && v !== null && v !== false)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n');
    console.log(fields || '  (no non-null fields)');
    console.log();
  }

  // Fetch existing loans from DB to get their UUIDs
  console.log('Fetching existing loans from DB...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/loans?select=id,loan_id`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    console.error('Failed to fetch loans:', res.status, await res.text());
    process.exit(1);
  }

  const existingLoans = await res.json();
  const loanIdToUUID = {};
  for (const loan of existingLoans) {
    loanIdToUUID[loan.loan_id] = loan.id;
  }

  console.log(`Found ${existingLoans.length} existing loans in DB`);
  console.log('Existing loan_ids:', existingLoans.map(l => l.loan_id).sort().join(', '));

  // Apply updates
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const update of updates) {
    const uuid = loanIdToUUID[update.loan_id];
    if (!uuid) {
      console.log(`  SKIP loan ${update.loan_id}: not found in DB (needs manual creation)`);
      notFound++;
      continue;
    }

    // Build patch payload (only non-null fields)
    const patch = {};
    for (const [key, value] of Object.entries(update)) {
      if (key === 'loan_id') continue;
      if (value !== null) {
        patch[key] = value;
      }
    }

    if (Object.keys(patch).length === 0) {
      console.log(`  SKIP loan ${update.loan_id}: no fields to update`);
      skipped++;
      continue;
    }

    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/loans?id=eq.${uuid}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(patch),
      }
    );

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error(`  ERROR loan ${update.loan_id}: ${patchRes.status} ${errText}`);
    } else {
      console.log(`  OK loan ${update.loan_id}: updated ${Object.keys(patch).length} fields`);
      updated++;
    }
  }

  console.log(`\n── Summary ──`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no changes): ${skipped}`);
  console.log(`Not found in DB: ${notFound}`);
}

main().catch(e => { console.error(e); process.exit(1); });
