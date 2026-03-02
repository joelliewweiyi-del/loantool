/**
 * Import borrower/property addresses from legacy LMS export into Supabase.
 *
 * Reads the legacy Excel export, extracts address columns, and generates
 * a SQL migration with UPDATE statements.
 *
 * Legacy columns used:
 *   AE "Street"          → borrower street
 *   AF "City"            → borrower city (already in DB, used for address composition)
 *   AH "Zip Code"        → borrower zip
 *   AR "Property Street"  → property street
 *   AS "Property City"    → property city
 *
 * Output format:
 *   borrower_address = "Street, Zip City"      e.g. "Keizersgracht 127, 1015CJ Amsterdam"
 *   property_address = "Property Street, City"  e.g. "Nieuwendammerdijk 532-536, Amsterdam"
 *
 * Usage:
 *   node scripts/import-legacy-addresses.mjs
 */

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// ── Parse Excel ──

function parseExcelCSV(filePath) {
  return execSync(`npx xlsx-cli "${filePath}"`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
}

// Multi-line aware CSV parser: joins lines that are inside quoted fields
function splitCSVLogicalLines(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      current += (ch === '"' && text[i] !== '"') ? '' : '';
      current += ch === '"' ? '"' : '';
      // Already appended above via the ""
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.trim()) rows.push(current);
      current = '';
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      current += ch;
    }
  }
  if (current.trim()) rows.push(current);
  return rows;
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

function parseCSVToRows(csvText) {
  const lines = splitCSVLogicalLines(csvText);

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Account') && lines[i].includes('Borrower Name')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    console.error('Could not find header row containing "Account" and "Borrower Name"');
    return [];
  }

  const headers = parseCSVLine(lines[headerIdx]).map(h => h.trim().replace(/^\uFEFF/, ''));
  console.log(`Headers found: ${headers.length} columns`);
  console.log('Key columns:');
  headers.forEach((h, i) => {
    if (['Account', 'Street', 'City', 'Zip Code', 'Property Street', 'Property City'].includes(h)) {
      console.log(`  [${i}] ${h}`);
    }
  });

  const rows = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const account = fields[headers.indexOf('Account')]?.trim();

    // Only accept rows where Account starts with RAX followed by digits
    if (!account || !/^RAX\d+$/.test(account)) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = fields[idx]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

// ── SQL helpers ──

function sqlStr(val) {
  if (val === null || val === undefined || val === '') return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

// ── Main ──

console.log('Parsing legacy export...\n');

const csv = parseExcelCSV(resolve(PROJECT_ROOT, 'docs/Export - 2026-03-02T124545.463.xlsx'));
const rows = parseCSVToRows(csv);
console.log(`\nFound ${rows.length} loan rows\n`);

let sql = `-- Legacy address import from docs/Export - 2026-03-02T124545.463.xlsx
-- Generated: ${new Date().toISOString().split('T')[0]}
-- Updates borrower_address and property_address for ${rows.length} loans

BEGIN;

`;

for (const row of rows) {
  const account = row['Account']; // e.g., RAX484
  const loanId = account.replace('RAX', ''); // e.g., 484

  // Borrower address: Street + Zip + City
  const street = row['Street'] || '';
  const zip = row['Zip Code'] || '';
  const city = row['City'] || '';

  let borrowerAddress = null;
  if (street) {
    const parts = [street];
    if (zip || city) {
      parts.push([zip, city].filter(Boolean).join(' '));
    }
    borrowerAddress = parts.join(', ');
  }

  // Property address: Property Street + Property City
  const propStreet = row['Property Street'] || '';
  const propCity = row['Property City'] || '';

  let propertyAddress = null;
  if (propStreet) {
    propertyAddress = propCity ? `${propStreet}, ${propCity}` : propStreet;
  }

  console.log(`${account} (loan_id=${loanId}):`);
  console.log(`  Borrower: ${borrowerAddress || '(none)'}`);
  console.log(`  Property: ${propertyAddress || '(none)'}`);
  console.log();

  if (!borrowerAddress && !propertyAddress) {
    console.log('  SKIP: no address data');
    continue;
  }

  const setClauses = [];
  if (borrowerAddress) setClauses.push(`borrower_address = ${sqlStr(borrowerAddress)}`);
  if (propertyAddress) setClauses.push(`property_address = ${sqlStr(propertyAddress)}`);

  const borrowerLabel = (row['Borrower Name'] || 'unknown').replace(/[\r\n]+/g, ' | ').substring(0, 60);
  sql += `-- ${account}: ${borrowerLabel}
UPDATE loans SET
  ${setClauses.join(',\n  ')}
WHERE loan_id = '${loanId}';

`;
}

sql += `COMMIT;

-- Verify
SELECT loan_id, borrower_address, property_address
FROM loans
WHERE loan_id IN (${rows.map(r => `'${r['Account'].replace('RAX', '')}'`).join(', ')})
ORDER BY loan_id::int;
`;

const outputPath = resolve(PROJECT_ROOT, 'supabase/migrations/20260308_import_legacy_addresses_fix.sql');
writeFileSync(outputPath, sql);
console.log(`Generated SQL migration: ${outputPath}`);
console.log(`${rows.length} UPDATE statements`);
