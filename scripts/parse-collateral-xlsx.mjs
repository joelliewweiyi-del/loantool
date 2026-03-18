#!/usr/bin/env node
/**
 * Parse Zekerhedenlijst RED IV.xlsx and generate SQL migration for collateral_items + loan_guarantors.
 *
 * Usage:
 *   node scripts/parse-collateral-xlsx.mjs
 *
 * Output: supabase/migrations/20260330_import_collateral_data.sql
 * Also outputs a verification CSV for cross-checking against the source Excel.
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const INPUT = path.join(ROOT, 'docs', 'Zekerhedenlijst RED IV.xlsx');
const OUTPUT_SQL = path.join(ROOT, 'supabase', 'migrations', '20260330_import_collateral_data.sql');
const OUTPUT_VERIFY = path.join(ROOT, 'scripts', 'collateral_import_verification.csv');

// Read workbook
const wb = XLSX.readFile(INPUT);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Helper to get the formatted (display) value of a cell
function getCellFormatted(sheet, row, col) {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = sheet[addr];
  if (!cell) return '';
  // Use the formatted string if available, otherwise the raw value
  return (cell.w || String(cell.v || '')).trim();
}

// Column mapping (0-indexed, from row 3 headers)
// Col B=1: Loan ID (nr)
// Col C=2: Mutatiedatum
// Col D=3: Gemeente
// Col E=4: Sectie
// Col F=5: Nummer
// Col G=6: Kadastrale grootte
// Col H=7: unit (m²)
// Col I=8: Erfpacht/Eigendom/Opstal
// Col J=9: Inschrijvingsbedrag
// Col K=10: Stad
// Col L=11: Adres
// Col M=12: Lender
// Col N=13: Borrower 1
// ...
// Col S=18: Zekerheidgever
// Col T=19: Garant 1
// Col U=20: Cap 1
// Col V=21: Garant 2
// Col W=22: Cap 2
// Col X=23: Garant 3
// Col Y=24: Cap 3
// Col Z=25: Garant 4
// Col AA=26: Cap 4
// Col AB=27: Gezamenlijk Garantie cap
// Col AC=28: Bijzonderheden

function escSql(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  return "'" + String(val).replace(/'/g, "''").trim() + "'";
}

function parseAmount(val) {
  if (!val) return null;
  const s = String(val).replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseDate(val) {
  if (!val) return null;
  // xlsx returns Excel serial dates as numbers
  if (typeof val === 'number') {
    // Convert Excel serial date to JS Date
    // Excel epoch is 1900-01-01 (serial 1), but Excel has a leap year bug (1900 is not a leap year but Excel thinks it is)
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    const y = jsDate.getUTCFullYear();
    const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(jsDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // Try to parse string dates in various formats
  const s = String(val).trim();
  // DD-MM-YYYY or DD/MM/YYYY
  const match1 = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (match1) {
    let [, d, m, y] = match1;
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // MM/DD/YY (US format from xlsx)
  const match2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (match2) {
    let [, m, d, y] = match2;
    y = (parseInt(y) > 50 ? '19' : '20') + y;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function normalizeOwnership(val) {
  if (!val) return 'eigendom';
  const s = String(val).toLowerCase().trim();
  if (s.includes('appartementsrecht') || s.includes('appartement')) return 'appartementsrecht';
  if (s.includes('erfpacht')) return 'erfpacht';
  if (s.includes('opstal')) return 'recht_van_opstal';
  if (s.includes('eigendom')) return 'eigendom';
  return 'eigendom';
}

function parseCapAmount(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s === 'nvt' || s === '-' || s === '—') return null;
  // Try to extract number from strings like "EUR 280.000" or "€ 5,000,000" or "EUR 1.000.000"
  const cleaned = s.replace(/EUR|€|\s/gi, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// Parse data rows (skip header rows 0-2, data starts at row 3 = index 3)
const collateralItems = [];
const guarantorsByLoan = new Map(); // loan_id -> Map<name, cap>
const combinedCapByLoan = new Map(); // loan_id -> amount
let currentLoanId = null;

for (let i = 3; i < rows.length; i++) {
  const row = rows[i];
  if (!row || row.length < 5) continue;

  // Check if this row has a loan ID
  const rawLoanId = row[1];
  if (rawLoanId && String(rawLoanId).trim()) {
    currentLoanId = String(rawLoanId).trim();
  }

  if (!currentLoanId) continue;

  // Skip empty rows (no gemeente and no sectie and no nummer)
  const gemeente = String(row[3] || '').trim();
  const sectie = String(row[4] || '').trim();
  const nummer = String(row[5] || '').trim();
  if (!gemeente && !sectie && !nummer) continue;
  // Skip rows that only have a sectie letter and nothing else (empty template rows)
  if (!gemeente && sectie && !nummer && !row[6] && !row[8] && !row[9]) continue;

  const grootte = getCellFormatted(ws, i, 6);
  const ownershipRaw = String(row[8] || '').trim();
  const registrationAmountRaw = row[9];
  const city = String(row[10] || '').trim();
  const address = String(row[11] || '').trim();
  const securityProvider = String(row[18] || '').trim();
  const notes = String(row[28] || '').trim();
  const registrationDate = parseDate(row[2]);
  const registrationAmount = parseAmount(registrationAmountRaw);

  collateralItems.push({
    loan_id: currentLoanId,
    gemeente: gemeente || null,
    sectie: sectie || null,
    perceelnummer: nummer || null,
    kadastrale_grootte: grootte || null,
    ownership_type: normalizeOwnership(ownershipRaw),
    registration_date: registrationDate,
    registration_amount: registrationAmount,
    city: city || null,
    address: address || null,
    security_provider: securityProvider || null,
    notes: notes || null,
  });

  // Collect guarantors (deduplicate per loan)
  if (!guarantorsByLoan.has(currentLoanId)) {
    guarantorsByLoan.set(currentLoanId, new Map());
  }
  const gMap = guarantorsByLoan.get(currentLoanId);

  for (let g = 0; g < 4; g++) {
    const nameCol = 19 + g * 2;
    const capCol = 20 + g * 2;
    const gName = String(row[nameCol] || '').trim();
    if (gName && gName !== 'nvt' && gName !== '-') {
      if (!gMap.has(gName)) {
        gMap.set(gName, parseCapAmount(row[capCol]));
      }
    }
  }

  // Combined guarantee cap
  const combinedCap = parseCapAmount(row[27]);
  if (combinedCap) {
    combinedCapByLoan.set(currentLoanId, combinedCap);
  }
}

console.log(`Parsed ${collateralItems.length} collateral items across ${new Set(collateralItems.map(i => i.loan_id)).size} loans`);
console.log(`Parsed ${[...guarantorsByLoan.values()].reduce((sum, m) => sum + m.size, 0)} unique guarantors`);

// Generate SQL
const lines = [];
lines.push('-- Auto-generated from Zekerhedenlijst RED IV.xlsx');
lines.push('-- Run: node scripts/parse-collateral-xlsx.mjs');
lines.push('');
lines.push('DO $$');
lines.push('DECLARE');
lines.push('  v_loan_uuid uuid;');
lines.push('  v_admin_id uuid;');
lines.push('BEGIN');
lines.push('  -- Use the first admin user as created_by');
lines.push("  SELECT ur.user_id INTO v_admin_id FROM public.user_roles ur WHERE ur.role = 'admin' LIMIT 1;");
lines.push("  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'No admin user found'; END IF;");
lines.push('');

// Group items by loan
const loanIds = [...new Set(collateralItems.map(i => i.loan_id))];

for (const loanId of loanIds) {
  const items = collateralItems.filter(i => i.loan_id === loanId);
  lines.push(`  -- Loan ${loanId} (${items.length} parcels)`);
  lines.push(`  SELECT id INTO v_loan_uuid FROM public.loans WHERE loan_id = '${loanId}';`);
  lines.push(`  IF v_loan_uuid IS NOT NULL THEN`);

  for (const item of items) {
    lines.push(`    INSERT INTO public.collateral_items (loan_id, gemeente, sectie, perceelnummer, kadastrale_grootte, ownership_type, registration_date, registration_amount, city, address, security_provider, notes, status, created_by)`);
    lines.push(`    VALUES (v_loan_uuid, ${escSql(item.gemeente)}, ${escSql(item.sectie)}, ${escSql(item.perceelnummer)}, ${escSql(item.kadastrale_grootte)}, ${escSql(item.ownership_type)}, ${item.registration_date ? escSql(item.registration_date) : 'NULL'}, ${item.registration_amount !== null ? item.registration_amount : 'NULL'}, ${escSql(item.city)}, ${escSql(item.address)}, ${escSql(item.security_provider)}, ${escSql(item.notes)}, 'active', v_admin_id);`);
  }

  // Guarantors for this loan
  const gMap = guarantorsByLoan.get(loanId);
  if (gMap && gMap.size > 0) {
    for (const [name, cap] of gMap) {
      lines.push(`    INSERT INTO public.loan_guarantors (loan_id, guarantor_name, guarantee_cap, status, created_by)`);
      lines.push(`    VALUES (v_loan_uuid, ${escSql(name)}, ${cap !== null ? cap : 'NULL'}, 'active', v_admin_id);`);
    }
  }

  // Combined guarantee cap
  const combinedCap = combinedCapByLoan.get(loanId);
  if (combinedCap) {
    lines.push(`    UPDATE public.loans SET combined_guarantee_cap = ${combinedCap} WHERE id = v_loan_uuid;`);
  }

  lines.push(`  END IF;`);
  lines.push('');
}

lines.push('END $$;');

fs.writeFileSync(OUTPUT_SQL, lines.join('\n'), 'utf8');
console.log(`\nSQL written to: ${OUTPUT_SQL}`);

// Generate verification CSV
const csvLines = ['loan_id,gemeente,sectie,perceelnummer,kadastrale_grootte,ownership_type,registration_date,registration_amount,city,address,security_provider,notes'];
for (const item of collateralItems) {
  csvLines.push([
    item.loan_id,
    item.gemeente || '',
    item.sectie || '',
    item.perceelnummer || '',
    item.kadastrale_grootte || '',
    item.ownership_type,
    item.registration_date || '',
    item.registration_amount !== null ? item.registration_amount : '',
    item.city || '',
    item.address || '',
    item.security_provider || '',
    item.notes || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
}
fs.writeFileSync(OUTPUT_VERIFY, csvLines.join('\n'), 'utf8');
console.log(`Verification CSV written to: ${OUTPUT_VERIFY}`);

// Print summary per loan for quick review
console.log('\n=== IMPORT SUMMARY ===');
for (const loanId of loanIds) {
  const items = collateralItems.filter(i => i.loan_id === loanId);
  const gMap = guarantorsByLoan.get(loanId);
  const guarantorCount = gMap ? gMap.size : 0;
  const regAmounts = [...new Set(items.filter(i => i.registration_amount).map(i => i.registration_amount))];
  console.log(`  Loan ${loanId}: ${items.length} parcels, ${guarantorCount} guarantors, registration: ${regAmounts.map(a => '€' + a?.toLocaleString('nl-NL')).join(' + ')}`);
}
