/**
 * Generate SQL UPDATE statements from Excel loan tape files.
 *
 * This reads both Excel files and outputs a SQL script that can be
 * run as a Supabase migration or directly in the SQL editor.
 *
 * Usage:
 *   node scripts/generate-loan-tape-sql.mjs > scripts/loan-tape-updates.sql
 */

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ── Parse Excel files using xlsx-cli ──

function parseExcelCSV(filePath) {
  const csv = execSync(`npx xlsx-cli "${filePath}"`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return csv;
}

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
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(headerRow)) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = parseCSVLine(lines[headerIdx]).map(h => h.trim().replace(/^\uFEFF/, ''));
  const rows = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const loanId = fields[0]?.trim();
    if (!loanId || !/^\d{3}$/.test(loanId)) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = fields[idx]?.trim() || '';
    });
    if (row['Loan ID']) rows.push(row);
  }
  return rows;
}

// ── Value parsers ──

function parseCurrency(val) {
  if (!val || val === '-' || val === ' -   ') return null;
  val = val.replace(/[€$\s]/g, '').replace(/,/g, '');
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function parsePercent(val) {
  if (!val || val === '-' || val === ' -   ') return null;
  val = val.replace('%', '').trim();
  const num = parseFloat(val);
  return isNaN(num) ? null : Math.round(num / 100 * 10000) / 10000; // 4 decimal places
}

function parseExcelDate(val) {
  if (!val || val === '-' || val === '0' || val === '0.00') return null;
  val = val.trim();
  const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    let [, month, day, year] = match;
    if (year.length === 2) year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return null;
}

function parseBool(val) {
  if (!val) return false;
  return val.trim().toUpperCase() === 'TRUE';
}

function sqlStr(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlNum(val) {
  if (val === null || val === undefined) return 'NULL';
  return String(val);
}

function sqlBool(val) {
  return val ? 'TRUE' : 'FALSE';
}

// ── Main ──

const csv1 = parseExcelCSV(resolve(PROJECT_ROOT, 'docs/Loan tape RED IV 01-02-26.xlsx'));
const v1Rows = parseCSVToRows(csv1, 'Loan ID,City,Status');

const csv2 = parseExcelCSV(resolve(PROJECT_ROOT, 'docs/Loan tape RED IV 23-02-26 v2.xlsx'));
const v2Rows = parseCSVToRows(csv2, 'Loan ID,City,Status');

const v1Map = {};
for (const row of v1Rows) v1Map[row['Loan ID']] = row;
const v2Map = {};
for (const row of v2Rows) v2Map[row['Loan ID']] = row;

const allLoanIds = [...new Set([...Object.keys(v1Map), ...Object.keys(v2Map)])].sort((a, b) => +a - +b);

let sql = `-- Loan tape data import from Excel files
-- Generated: ${new Date().toISOString().split('T')[0]}
-- Source: docs/Loan tape RED IV 01-02-26.xlsx + docs/Loan tape RED IV 23-02-26 v2.xlsx
-- Updates metadata fields for ${allLoanIds.length} loans matching on loan_id
--
-- Fields updated: city, property_status, remarks, category, earmarked,
--   initial_facility, red_iv_start_date, rental_income, valuation,
--   valuation_date, ltv, maturity_date, loan_start_date

BEGIN;

`;

for (const loanId of allLoanIds) {
  const v1 = v1Map[loanId] || {};
  const v2 = v2Map[loanId] || {};

  const city = (v2['City'] || v1['City'] || '').trim() || null;
  const propertyStatus = (v2['Status'] || v1['Status'] || '').trim() || null;
  const remarks = (v2['Remarks'] || v1['Remarks'] || '').trim() || null;
  const category = (v2['Category'] || v1['Category'] || '').trim() || null;
  const earmarked = parseBool(v2['Earmarked'] || v1['Earmarked']);
  const initialFacility = (v1['Initial Facility'] || '').trim() || null;
  const redIVStartDate = parseExcelDate(v1['RED IV Start Date'] || '');
  const rentalIncome = parseCurrency(v2['Rental Income'] || v1['Rental Income']);
  const valuation = parseCurrency(v2['Valuation (as-is)'] || v1['Valuation (as-is)']);
  const valuationDate = parseExcelDate(v2['Valuation date'] || v1['Valuation date']);
  const ltv = parsePercent(v2['LTV'] || v1['LTV']);
  const maturityDate = parseExcelDate(v2['Maturity Date'] || v1['Maturity Date']);
  const originalStartDate = parseExcelDate(v2['Original Start Date'] || v1['Original Start Date']);

  sql += `-- Loan ${loanId}: ${city || 'unknown city'}
UPDATE loans SET
  city = ${sqlStr(city)},
  property_status = ${sqlStr(propertyStatus)},
  remarks = ${sqlStr(remarks)},
  category = ${sqlStr(category)},
  earmarked = ${sqlBool(earmarked)},
  initial_facility = ${sqlStr(initialFacility)},
  red_iv_start_date = ${redIVStartDate ? sqlStr(redIVStartDate) : 'NULL'},
  rental_income = ${sqlNum(rentalIncome)},
  valuation = ${sqlNum(valuation)},
  valuation_date = ${valuationDate ? sqlStr(valuationDate) : 'NULL'},
  ltv = ${sqlNum(ltv)},
  maturity_date = ${maturityDate ? sqlStr(maturityDate) : 'NULL'},
  loan_start_date = ${originalStartDate ? sqlStr(originalStartDate) : 'NULL'}
WHERE loan_id = '${loanId}';

`;
}

sql += `COMMIT;

-- Verify
SELECT loan_id, city, property_status, category, earmarked, initial_facility, red_iv_start_date,
       rental_income, valuation, valuation_date, ltv
FROM loans
WHERE loan_id IN (${allLoanIds.map(id => `'${id}'`).join(', ')})
ORDER BY loan_id::int;
`;

const outputPath = resolve(PROJECT_ROOT, 'supabase/migrations/20260302_import_loan_tape_data.sql');
writeFileSync(outputPath, sql);
console.log(`Generated SQL migration: ${outputPath}`);
console.log(`${allLoanIds.length} UPDATE statements for loan IDs: ${allLoanIds.join(', ')}`);
