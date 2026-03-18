#!/usr/bin/env node
/**
 * Verify collateral import: compare DB data against source Excel.
 */
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load env
const envLocalPath = path.join(ROOT, '.env.local');
const envLocal = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : '';
const envFile = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
function getVar(name) {
  const match = (envLocal + '\n' + envFile).match(new RegExp('^' + name + '=(.+)$', 'm'));
  if (!match) return undefined;
  return match[1].trim().replace(/^["']|["']$/g, '');
}

const supabaseUrl = getVar('VITE_SUPABASE_URL');
const supabaseKey = getVar('VITE_SUPABASE_PUBLISHABLE_KEY') || getVar('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

// Sign in as admin to bypass RLS
const email = getVar('TEST_ADMIN_EMAIL') || 'joel@rfrax.com';
const password = getVar('TEST_ADMIN_PASSWORD') || getVar('ADMIN_PASSWORD');

// Read Excel
const wb = XLSX.readFile(path.join(ROOT, 'docs', 'Zekerhedenlijst RED IV.xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

function getCellFormatted(sheet, row, col) {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = sheet[addr];
  if (!cell) return '';
  return (cell.w || String(cell.v || '')).trim();
}

function normalizeOwnership(val) {
  if (!val) return 'eigendom';
  const s = String(val).toLowerCase().trim();
  if (s.includes('appartementsrecht')) return 'appartementsrecht';
  if (s.includes('erfpacht')) return 'erfpacht';
  if (s.includes('opstal')) return 'recht_van_opstal';
  return 'eigendom';
}

// Parse Excel items
let currentLoanId = null;
const excelItems = [];
const excelGuarantors = new Map(); // "loanId|name" -> cap

for (let i = 3; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length < 5) continue;
  const rawId = row[1];
  if (rawId && String(rawId).trim()) currentLoanId = String(rawId).trim();
  if (!currentLoanId) continue;
  const gemeente = String(row[3] || '').trim();
  const sectie = String(row[4] || '').trim();
  const nummer = String(row[5] || '').trim();
  if (!gemeente && !sectie && !nummer) continue;
  if (!gemeente && sectie && !nummer && !row[6] && !row[8] && !row[9]) continue;

  excelItems.push({
    loan_id: currentLoanId,
    gemeente: gemeente || null,
    sectie: sectie || null,
    perceelnummer: nummer || null,
    kadastrale_grootte: getCellFormatted(ws, i, 6) || null,
    ownership_type: normalizeOwnership(String(row[8])),
    registration_amount: row[9] || null,
    city: String(row[10] || '').trim() || null,
    address: String(row[11] || '').trim() || null,
    security_provider: String(row[18] || '').trim() || null,
  });

  // Guarantors
  for (let g = 0; g < 4; g++) {
    const name = String(row[19 + g * 2] || '').trim();
    if (name && name !== 'nvt' && name !== '-') {
      const key = currentLoanId + '|' + name;
      if (!excelGuarantors.has(key)) excelGuarantors.set(key, currentLoanId);
    }
  }
}

async function run() {
  // Sign in
  if (password) {
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      console.log('Auth warning (continuing with anon):', authErr.message);
    }
  }

  // Fetch collateral items with loan_id join
  const { data: dbItems, error: dbErr } = await supabase
    .from('collateral_items')
    .select('*, loans!inner(loan_id)')
    .order('created_at');
  if (dbErr) { console.error('DB error fetching collateral_items:', dbErr.message); return; }

  // Fetch guarantors
  const { data: dbGuarantors, error: gErr } = await supabase
    .from('loan_guarantors')
    .select('*, loans!inner(loan_id)')
    .order('created_at');
  if (gErr) { console.error('DB error fetching loan_guarantors:', gErr.message); return; }

  let failures = 0;

  // 1. Total row count
  console.log('=== 1. TOTAL ROW COUNT ===');
  console.log(`  Excel: ${excelItems.length}`);
  console.log(`  DB:    ${dbItems.length}`);
  if (excelItems.length === dbItems.length) {
    console.log('  PASS');
  } else {
    console.log('  FAIL');
    failures++;
  }

  // 2. Per-loan count
  console.log('\n=== 2. PER-LOAN COUNT ===');
  const excelByLoan = {};
  for (const item of excelItems) {
    if (!excelByLoan[item.loan_id]) excelByLoan[item.loan_id] = [];
    excelByLoan[item.loan_id].push(item);
  }
  const dbByLoan = {};
  for (const item of dbItems) {
    const lid = item.loans.loan_id;
    if (!dbByLoan[lid]) dbByLoan[lid] = [];
    dbByLoan[lid].push(item);
  }

  const allLoanIds = [...new Set([...Object.keys(excelByLoan), ...Object.keys(dbByLoan)])].sort((a, b) => +a - +b);
  let loanCountPass = true;
  console.log('  Loan    | Excel | DB    | Result');
  console.log('  --------|-------|-------|-------');
  for (const lid of allLoanIds) {
    const e = excelByLoan[lid]?.length || 0;
    const d = dbByLoan[lid]?.length || 0;
    const ok = e === d;
    if (!ok) loanCountPass = false;
    console.log(`  ${lid.padEnd(8)}| ${String(e).padEnd(6)}| ${String(d).padEnd(6)}| ${ok ? 'OK' : 'MISMATCH'}`);
  }
  if (loanCountPass) console.log('  PASS'); else { console.log('  FAIL'); failures++; }

  // 3. Field-level spot checks
  console.log('\n=== 3. FIELD-LEVEL SPOT CHECKS ===');
  let fieldErrors = 0;

  function checkField(label, excelVal, dbVal) {
    const eStr = String(excelVal ?? '').trim();
    const dStr = String(dbVal ?? '').trim();
    if (eStr !== dStr) {
      console.log(`  MISMATCH ${label}: excel=${JSON.stringify(eStr)} db=${JSON.stringify(dStr)}`);
      fieldErrors++;
      return false;
    }
    return true;
  }

  // Loan 505, first parcel (Zeist A 4033)
  const db505first = dbByLoan['505']?.find(i => i.perceelnummer === '4033');
  const ex505first = excelByLoan['505']?.find(i => i.perceelnummer === '4033');
  if (db505first && ex505first) {
    console.log('  Loan 505, Zeist A 4033:');
    checkField('gemeente', ex505first.gemeente, db505first.gemeente);
    checkField('sectie', ex505first.sectie, db505first.sectie);
    checkField('ownership', ex505first.ownership_type, db505first.ownership_type);
    checkField('grootte', ex505first.kadastrale_grootte, db505first.kadastrale_grootte);
    checkField('city', ex505first.city, db505first.city);
    checkField('address', ex505first.address, db505first.address);
    checkField('security_provider', ex505first.security_provider, db505first.security_provider);
    checkField('reg_amount', String(ex505first.registration_amount), String(db505first.registration_amount));
    if (fieldErrors === 0) console.log('    All fields OK');
  }

  // Loan 518, first parcel (Amsterdam U 10834-A index 2)
  const db518first = dbByLoan['518']?.find(i => i.perceelnummer === '10834-A index 2');
  const ex518first = excelByLoan['518']?.find(i => i.perceelnummer === '10834-A index 2');
  if (db518first && ex518first) {
    const beforeErrors = fieldErrors;
    console.log('  Loan 518, Amsterdam U 10834-A index 2:');
    checkField('gemeente', ex518first.gemeente, db518first.gemeente);
    checkField('ownership', ex518first.ownership_type, db518first.ownership_type);
    checkField('grootte', ex518first.kadastrale_grootte, db518first.kadastrale_grootte);
    checkField('city', ex518first.city, db518first.city);
    checkField('address', ex518first.address, db518first.address);
    checkField('reg_amount', String(ex518first.registration_amount), String(db518first.registration_amount));
    if (fieldErrors === beforeErrors) console.log('    All fields OK');
  }

  // Loan 510 ownership type distribution
  const db510 = dbByLoan['510'] || [];
  const ex510 = excelByLoan['510'] || [];
  console.log(`  Loan 510 (${db510.length} parcels):`);
  const dbOwnership510 = {};
  for (const i of db510) { dbOwnership510[i.ownership_type] = (dbOwnership510[i.ownership_type] || 0) + 1; }
  const exOwnership510 = {};
  for (const i of ex510) { exOwnership510[i.ownership_type] = (exOwnership510[i.ownership_type] || 0) + 1; }
  for (const type of [...new Set([...Object.keys(dbOwnership510), ...Object.keys(exOwnership510)])]) {
    const eCount = exOwnership510[type] || 0;
    const dCount = dbOwnership510[type] || 0;
    const ok = eCount === dCount;
    if (!ok) fieldErrors++;
    console.log(`    ${type}: excel=${eCount} db=${dCount} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  if (fieldErrors === 0) console.log('  PASS'); else { console.log(`  FAIL (${fieldErrors} errors)`); failures++; }

  // 4. Guarantor check
  console.log('\n=== 4. GUARANTOR CHECK ===');
  console.log(`  Excel unique guarantors: ${excelGuarantors.size}`);
  console.log(`  DB guarantors: ${dbGuarantors.length}`);

  const dbGuarantorKeys = new Set(dbGuarantors.map(g => g.loans.loan_id + '|' + g.guarantor_name));
  let gMissing = 0;
  for (const [key] of excelGuarantors) {
    if (!dbGuarantorKeys.has(key)) {
      console.log(`  MISSING: ${key}`);
      gMissing++;
    }
  }
  // List all DB guarantors
  for (const g of dbGuarantors) {
    const cap = g.guarantee_cap ? `EUR ${Number(g.guarantee_cap).toLocaleString('nl-NL')}` : 'no cap';
    console.log(`  Loan ${g.loans.loan_id}: ${g.guarantor_name} (${cap})`);
  }
  if (gMissing === 0 && dbGuarantors.length === excelGuarantors.size) {
    console.log('  PASS');
  } else {
    console.log(`  FAIL (${gMissing} missing, count: excel=${excelGuarantors.size} db=${dbGuarantors.length})`);
    failures++;
  }

  // 5. All statuses active
  console.log('\n=== 5. STATUS CHECK ===');
  const nonActive = dbItems.filter(i => i.status !== 'active');
  console.log(`  Non-active items: ${nonActive.length}`);
  if (nonActive.length === 0) console.log('  PASS'); else { console.log('  FAIL'); failures++; }

  // 6. Registration amounts check (per loan, deduplicated)
  console.log('\n=== 6. REGISTRATION AMOUNTS ===');
  let amountErrors = 0;
  for (const lid of allLoanIds) {
    const exItems = excelByLoan[lid] || [];
    const dbItemsLoan = dbByLoan[lid] || [];
    const exAmounts = [...new Set(exItems.filter(i => i.registration_amount).map(i => Number(i.registration_amount)))].sort();
    const dbAmounts = [...new Set(dbItemsLoan.filter(i => i.registration_amount).map(i => Number(i.registration_amount)))].sort();
    const match = JSON.stringify(exAmounts) === JSON.stringify(dbAmounts);
    if (!match) {
      console.log(`  Loan ${lid}: MISMATCH excel=${JSON.stringify(exAmounts)} db=${JSON.stringify(dbAmounts)}`);
      amountErrors++;
    }
  }
  if (amountErrors === 0) console.log('  All registration amounts match across all loans');
  console.log(amountErrors === 0 ? '  PASS' : '  FAIL');
  if (amountErrors > 0) failures++;

  // Summary
  console.log('\n================================');
  if (failures === 0) {
    console.log('ALL CHECKS PASSED');
  } else {
    console.log(`${failures} CHECK(S) FAILED`);
  }
  console.log('================================');
}

run().catch(console.error);
