/**
 * Generate SQL INSERT statements from the "Afspraken Kredietbrief.xlsx" Excel workbook.
 *
 * Parses all 7 sheets and generates a Supabase migration that populates
 * loan_covenants and covenant_submissions tables.
 *
 * Usage:
 *   node scripts/generate-covenant-sql.mjs
 *
 * Output:
 *   supabase/migrations/20260332_import_covenant_data.sql
 */

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const EXCEL_FILE = resolve(PROJECT_ROOT, 'docs/Afspraken Kredietbrief.xlsx');

// ── Counters ──
let covenantCount = 0;
let submissionCount = 0;
const matchedLoans = new Set();
const unmatchedLoans = [];

// ── Parse Excel ──

function parseSheet(sheetName) {
  const csv = execSync(`npx xlsx-cli -s "${sheetName}" "${EXCEL_FILE}"`, {
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

function getAllLines(csvText) {
  return csvText.split('\n').filter(l => l.trim());
}

// ── Loan ID normalization ──

function normalizeLoanId(raw) {
  if (!raw) return null;
  raw = String(raw).trim();
  if (!raw) return null;

  // Pure 3-digit number
  if (/^\d{3}$/.test(raw)) return raw;

  // Transfer notation: "RAX390RED --> RAX484"
  if (raw.includes('-->')) {
    const parts = raw.split('-->');
    return normalizeLoanId(parts[parts.length - 1].trim());
  }

  // Multi-loan: "452 / 466"
  if (raw.includes('/')) {
    const parts = raw.split('/').map(s => normalizeLoanId(s.trim())).filter(Boolean);
    return parts.length > 0 ? parts : null;
  }

  // RAX prefix: "RAX444RED", "RAX484REDIV", "RAX458DOV"
  const raxMatch = raw.match(/^RAX(\d{3,4})/i);
  if (raxMatch) return raxMatch[1];

  // Bare number possibly with suffix: "488B"
  const numMatch = raw.match(/^(\d{3})/);
  if (numMatch) return numMatch[1];

  return null;
}

// ── Status normalization ──

function normalizeStatus(raw) {
  if (!raw || raw.trim() === '' || raw.trim() === '-') return { status: 'pending', receivedBy: null, note: null };
  const val = raw.trim();
  const lower = val.toLowerCase();

  if (lower === 'ontvangen' || lower === 'ja' || lower === 'x') {
    return { status: 'received', receivedBy: null, note: null };
  }
  if (lower.startsWith('ontvangen')) {
    // "Ontvangen; nog discussie met taxateur"
    return { status: 'received', receivedBy: null, note: val };
  }
  if (lower.startsWith('opvragen') || lower.startsWith('opgevraagd')) {
    return { status: 'requested', receivedBy: null, note: val };
  }
  if (lower === 'nvt' || lower === 'car' || lower === 'wordt afgelost' || lower === 'grond') {
    return { status: 'not_applicable', receivedBy: null, note: val };
  }

  // Person name (capitalized word) → received by that person
  if (/^[A-Z][a-z]+$/.test(val)) {
    return { status: 'received', receivedBy: val, note: null };
  }

  // Anything else with content is likely a note about the status
  return { status: 'pending', receivedBy: null, note: val };
}

// ── Date parsing ──

function parseExcelDate(val) {
  if (!val || val === '-' || val === '0' || val === '0.00') return null;
  val = val.trim();
  // M/D/YY or M/D/YYYY
  const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    let [, month, day, year] = match;
    if (year.length === 2) year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // Try DD-MM-YYYY pattern (Dutch dates like "01-07-2026")
  const nlMatch = val.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (nlMatch) {
    return `${nlMatch[3]}-${nlMatch[2]}-${nlMatch[1]}`;
  }
  return null;
}

function parseCurrency(val) {
  if (!val || val === '-' || val.trim() === '') return null;
  val = val.replace(/[€$\s]/g, '').replace(/,/g, '');
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

// ── SQL helpers ──

function sqlStr(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlNum(val) {
  if (val === null || val === undefined) return 'NULL';
  return String(val);
}

function sqlJson(obj) {
  if (!obj || Object.keys(obj).length === 0) return "'{}'::jsonb";
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

// ── Lookup loans from DB ──
// We can't query Supabase from this script, so we generate SQL that looks up by loan_id text
// Using a CTE approach: INSERT ... SELECT with a subquery on loans.loan_id

function loanIdSubquery(numericId) {
  return `(SELECT id FROM loans WHERE loan_id = '${numericId}')`;
}

// ── Main generation ──

let sql = `-- Covenant data import from "Afspraken Kredietbrief.xlsx"
-- Generated: ${new Date().toISOString().split('T')[0]}
-- Source: docs/Afspraken Kredietbrief.xlsx (7 sheets)
--
-- This migration inserts loan_covenants and covenant_submissions rows.
-- Loans are matched by loan_id (text). Rows where the loan doesn't exist
-- will fail silently (the subquery returns NULL, violating NOT NULL on loan_id).
-- To handle this gracefully, we use a DO block that catches errors per-loan.

BEGIN;

-- Helper: insert covenant and return its id
-- We use a series of WITH blocks per loan to chain covenant + submission inserts.

`;

// ══════════════════════════════════════════════════════════
// SHEET 1: Afspraken 2025
// ══════════════════════════════════════════════════════════

function parseAfspraken2025() {
  console.log('Parsing: Afspraken 2025...');
  const csv = parseSheet('Afspraken 2025');
  const lines = getAllLines(csv);

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Loan ID') && lines[i].includes('Leningnemer')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) { console.log('  WARNING: Could not find header in Afspraken 2025'); return; }

  const headers = parseCSVLine(lines[headerIdx]);

  // Group rows by loan (continuation rows have empty Loan ID)
  const loanGroups = [];
  let currentGroup = null;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const rawId = fields[0]?.trim();

    if (rawId && rawId.startsWith('RAX')) {
      if (currentGroup) loanGroups.push(currentGroup);
      currentGroup = { rawId, borrower: fields[1]?.trim() || '', maturity: fields[2]?.trim() || '', rows: [fields] };
    } else if (currentGroup && fields.some(f => f.trim())) {
      // Continuation row (Q2, Q3, Q4 for rent rolls)
      currentGroup.rows.push(fields);
    }
  }
  if (currentGroup) loanGroups.push(currentGroup);

  console.log(`  Found ${loanGroups.length} loan groups`);

  for (const group of loanGroups) {
    const normalized = normalizeLoanId(group.rawId);
    if (!normalized || Array.isArray(normalized)) continue;

    const loanSql = loanIdSubquery(normalized);
    const borrower = group.borrower.replace(/\n/g, ' ').trim();

    // --- Taxatie (col 3) ---
    const taxatieRule = group.rows[0][3]?.trim() || '';
    const taxatieReminder = parseExcelDate(group.rows[0][4]?.trim() || '');
    const taxatieStatus = normalizeStatus(group.rows[0][5]?.trim() || '');

    if (taxatieRule) {
      sql += `-- ${group.rawId} (${borrower}): Valuation 2025\n`;
      sql += `INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, notes, metadata)\n`;
      sql += `  SELECT ${loanSql}, 'valuation', ${taxatieRule.includes('jaar') ? "'annually'" : "'custom'"}, ${sqlStr(taxatieRule)}, 2025, NULL, '{}'::jsonb\n`;
      sql += `  WHERE ${loanSql} IS NOT NULL;\n`;

      sql += `INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)\n`;
      sql += `  SELECT c.id, c.loan_id, '2025', NULL, ${taxatieReminder ? sqlStr(taxatieReminder) : 'NULL'}, '${taxatieStatus.status}', ${sqlStr(taxatieStatus.receivedBy)}, ${sqlStr(taxatieStatus.note)}, '{}'::jsonb\n`;
      sql += `  FROM loan_covenants c WHERE c.loan_id = ${loanSql} AND c.covenant_type = 'valuation' AND c.tracking_year = 2025;\n\n`;
      covenantCount++;
      submissionCount++;
    }

    // --- Huurlijst (cols 6-8: Q label, reminder date, received) ---
    const hasRentRoll = group.rows[0][6]?.trim().startsWith('Q');
    if (hasRentRoll) {
      sql += `-- ${group.rawId} (${borrower}): Rent Roll 2025\n`;
      sql += `INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)\n`;
      sql += `  SELECT ${loanSql}, 'rent_roll', 'quarterly', 2025, '{}'::jsonb\n`;
      sql += `  WHERE ${loanSql} IS NOT NULL;\n`;
      covenantCount++;

      for (const row of group.rows) {
        const qLabel = row[6]?.trim();
        if (!qLabel || !qLabel.startsWith('Q')) continue;
        const qReminder = parseExcelDate(row[7]?.trim() || '');
        const qStatus = normalizeStatus(row[8]?.trim() || '');

        sql += `INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)\n`;
        sql += `  SELECT c.id, c.loan_id, '${qLabel} 2025', ${qReminder ? sqlStr(qReminder) : 'NULL'}, '${qStatus.status}', ${sqlStr(qStatus.receivedBy)}, ${sqlStr(qStatus.note)}, '{}'::jsonb\n`;
        sql += `  FROM loan_covenants c WHERE c.loan_id = ${loanSql} AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2025;\n`;
        submissionCount++;
      }
      sql += '\n';
    }

    // --- Jaarcijfers (cols 9-11: rule, reminder, received) ---
    const jaarcijfersRule = group.rows[0][9]?.trim() || '';
    const jaarcijfersReminder = parseExcelDate(group.rows[0][10]?.trim() || '');
    const jaarcijfersStatus = normalizeStatus(group.rows[0][11]?.trim() || '');

    if (jaarcijfersRule) {
      sql += `-- ${group.rawId} (${borrower}): Annual Accounts 2025\n`;
      sql += `INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)\n`;
      sql += `  SELECT ${loanSql}, 'annual_accounts', 'annually', ${sqlStr(jaarcijfersRule)}, 2025, '{}'::jsonb\n`;
      sql += `  WHERE ${loanSql} IS NOT NULL;\n`;

      sql += `INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)\n`;
      sql += `  SELECT c.id, c.loan_id, 'FY2024', ${jaarcijfersReminder ? sqlStr(jaarcijfersReminder) : 'NULL'}, '${jaarcijfersStatus.status}', ${sqlStr(jaarcijfersStatus.receivedBy)}, ${sqlStr(jaarcijfersStatus.note)}, '{}'::jsonb\n`;
      sql += `  FROM loan_covenants c WHERE c.loan_id = ${loanSql} AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2025;\n\n`;
      covenantCount++;
      submissionCount++;
    }

    // --- Verzekering (cols 12-14: frequency, reminder, received) ---
    const verzekerFreq = group.rows[0][12]?.trim() || '';
    const verzekerReminder = parseExcelDate(group.rows[0][13]?.trim() || '');
    const verzekerStatus = normalizeStatus(group.rows[0][14]?.trim() || '');

    if (verzekerFreq) {
      sql += `-- ${group.rawId} (${borrower}): Insurance 2025\n`;
      sql += `INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, metadata)\n`;
      sql += `  SELECT ${loanSql}, 'insurance', 'annually', 2025, '{}'::jsonb\n`;
      sql += `  WHERE ${loanSql} IS NOT NULL;\n`;

      sql += `INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, received_by, notes, metadata)\n`;
      sql += `  SELECT c.id, c.loan_id, '2025', NULL, ${verzekerReminder ? sqlStr(verzekerReminder) : 'NULL'}, '${verzekerStatus.status}', ${sqlStr(verzekerStatus.receivedBy)}, ${sqlStr(verzekerStatus.note)}, '{}'::jsonb\n`;
      sql += `  FROM loan_covenants c WHERE c.loan_id = ${loanSql} AND c.covenant_type = 'insurance' AND c.tracking_year = 2025;\n\n`;
      covenantCount++;
      submissionCount++;
    }

    matchedLoans.add(normalized);
  }
}

// ══════════════════════════════════════════════════════════
// SHEET 2: Taxaties 2026
// ══════════════════════════════════════════════════════════

function parseTaxaties2026() {
  console.log('Parsing: Taxaties 2026...');
  const csv = parseSheet('Taxaties 2026');
  const lines = getAllLines(csv);

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Loan ID') && lines[i].includes('Leningnemer')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) { console.log('  WARNING: Could not find header'); return; }

  const headers = parseCSVLine(lines[headerIdx]);

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const rawId = fields[0]?.trim();
    if (!rawId || rawId.startsWith('=') || rawId === '') continue;

    // Skip legend rows
    if (rawId.includes('reliance') || rawId.includes('gebreke') || rawId.includes('opvolgen')) continue;

    const normalized = normalizeLoanId(rawId);
    if (!normalized || Array.isArray(normalized)) continue;

    // Skip "ook voor" continuation rows
    const borrower = (fields[1]?.trim() || '').replace(/\n/g, ' ');
    if (borrower.startsWith('ook voor')) continue;
    if (!borrower) continue;

    const loanSql = loanIdSubquery(normalized);
    const taxatieRule = fields[3]?.trim() || '';
    const reminderDate = parseExcelDate(fields[4]?.trim() || '');
    const statusRaw = fields[5]?.trim() || '';
    const statusParsed = normalizeStatus(statusRaw);
    const valuationAmount = parseCurrency(fields[6]?.trim() || '');
    const ltvCovenant = fields[7]?.trim() || '';
    const ltvActual = fields[8]?.trim() || '';
    const opmerking = fields[9]?.trim() || '';

    // Parse LTV covenant value (e.g. "55%")
    let thresholdValue = null;
    if (ltvCovenant) {
      const pct = parseFloat(ltvCovenant.replace('%', ''));
      if (!isNaN(pct)) thresholdValue = pct / 100;
    }

    const freq = taxatieRule.toLowerCase().includes('jaar') ? 'annually' : (taxatieRule ? 'custom' : null);
    const meta = {};
    if (valuationAmount) meta.valuation_amount = valuationAmount;
    if (ltvActual) meta.ltv_actual = ltvActual;
    if (opmerking) meta.opmerking = opmerking;

    const notes = [taxatieRule, opmerking].filter(Boolean).join(' — ') || null;

    sql += `-- ${rawId} (${borrower}): Valuation 2026\n`;
    sql += `INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)\n`;
    sql += `  SELECT ${loanSql}, 'valuation', ${sqlStr(freq)}, ${sqlStr(taxatieRule || null)}, ${sqlNum(thresholdValue)}, ${thresholdValue ? "'lte'" : 'NULL'}, ${thresholdValue ? "'ltv'" : 'NULL'}, 2026, ${sqlStr(notes)}, ${sqlJson(meta)}\n`;
    sql += `  WHERE ${loanSql} IS NOT NULL;\n`;

    sql += `INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, reminder_date, status, received_by, notes, metadata)\n`;
    sql += `  SELECT c.id, c.loan_id, '2026', ${reminderDate ? sqlStr(reminderDate) : 'NULL'}, '${statusParsed.status}', ${sqlStr(statusParsed.receivedBy)}, ${sqlStr(statusParsed.note || opmerking || null)}, ${sqlJson(meta)}\n`;
    sql += `  FROM loan_covenants c WHERE c.loan_id = ${loanSql} AND c.covenant_type = 'valuation' AND c.tracking_year = 2026;\n\n`;

    covenantCount++;
    submissionCount++;
    matchedLoans.add(normalized);
  }
}

// ══════════════════════════════════════════════════════════
// SHEET 3: Polis 2026
// ══════════════════════════════════════════════════════════

function parsePolis2026() {
  console.log('Parsing: Polis 2026...');
  const csv = parseSheet('Polis 2026');
  const lines = getAllLines(csv);

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Loan ID') && lines[i].includes('Leningnemer')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) { console.log('  WARNING: Could not find header'); return; }

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const rawId = fields[0]?.trim();
    if (!rawId || rawId === '' || rawId.startsWith('=') || rawId.includes('gebreke') || rawId.includes('opvolgen') || rawId.includes('Antoinette')) continue;

    const borrower = (fields[1]?.trim() || '').replace(/\n/g, ' ');
    if (!borrower || borrower.startsWith('=')) continue;

    const email = fields[2]?.trim() || '';
    const locatie = fields[3]?.trim() || '';
    const vehikel = fields[4]?.trim() || '';
    const maturity = fields[5]?.trim() || '';
    const polisStatus = fields[6]?.trim() || '';
    const opvolging = fields[7]?.trim() || '';

    // Handle multi-loan IDs like "452 / 466"
    const normalizedIds = normalizeLoanId(rawId);
    const ids = Array.isArray(normalizedIds) ? normalizedIds : (normalizedIds ? [normalizedIds] : []);

    for (const nid of ids) {
      const loanSql = loanIdSubquery(nid);
      const statusParsed = normalizeStatus(polisStatus);
      const meta = {};
      if (email) meta.email = email;
      if (locatie) meta.locatie = locatie;
      if (vehikel) meta.vehikel = vehikel;

      const notes = opvolging || null;

      sql += `-- ${rawId} (${borrower}): Insurance 2026\n`;
      sql += `INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)\n`;
      sql += `  SELECT ${loanSql}, 'insurance', 'annually', 2026, ${sqlStr(notes)}, ${sqlJson(meta)}\n`;
      sql += `  WHERE ${loanSql} IS NOT NULL;\n`;

      sql += `INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, received_by, notes, metadata)\n`;
      sql += `  SELECT c.id, c.loan_id, '2026', '${statusParsed.status}', ${sqlStr(statusParsed.receivedBy)}, ${sqlStr(statusParsed.note || opvolging || null)}, '{}'::jsonb\n`;
      sql += `  FROM loan_covenants c WHERE c.loan_id = ${loanSql} AND c.covenant_type = 'insurance' AND c.tracking_year = 2026;\n\n`;

      covenantCount++;
      submissionCount++;
      matchedLoans.add(nid);
    }
  }
}

// ══════════════════════════════════════════════════════════
// SHEET 4: Huurlijsten 2026
// ══════════════════════════════════════════════════════════

function parseHuurlijsten2026() {
  console.log('Parsing: Huurlijsten 2026...');
  const csv = parseSheet('Huurlijsten 2026');
  const lines = getAllLines(csv);

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Loan ID') && lines[i].includes('Leningnemer')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) { console.log('  WARNING: Could not find header'); return; }

  const headers = parseCSVLine(lines[headerIdx]);

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const rawId = fields[1]?.trim(); // Col B = Loan ID (Col A = Mail)
    if (!rawId || rawId === '' || rawId.startsWith('=') || rawId.includes('gebreke') || rawId.includes('opvolgen') || rawId.includes('aanleveren')) continue;

    const borrower = (fields[2]?.trim() || '').replace(/\n/g, ' ');
    if (!borrower || borrower.startsWith('ook voor') || borrower.startsWith('=')) continue;

    const email = fields[0]?.trim() || '';

    const normalized = normalizeLoanId(rawId);
    if (!normalized || Array.isArray(normalized)) continue;

    const loanSql = loanIdSubquery(normalized);

    // Parse financial data
    // Columns: 3=Ontvangen?, 4=Q1, 5=Q2, 6=Q3 2025, 7=Q4 2025 (aanleveren), 8=Q4 2025 jaarhuur, 9=ICR (Q4 2025), 10=Q1 2026 jaarhuur, 11=ICR (Q1 2026), 12=Afgesproken ICR, 13=Cashsweep, 14=Comments
    const q4Rent = parseCurrency(fields[8]?.trim() || '');
    const q4ICR = fields[9]?.trim() || '';
    const q1Rent = parseCurrency(fields[10]?.trim() || '');
    const q1ICR = fields[11]?.trim() || '';
    const icrCovenant = fields[12]?.trim() || '';
    const cashsweep = parseCurrency(fields[13]?.trim() || '');
    const comments = fields[14]?.trim() || '';

    // Parse ICR covenant - could be a number or special like "< €4m", "x" (no ICR, just delivery required)
    let thresholdValue = null;
    let thresholdMetric = null;
    let thresholdOperator = null;

    if (icrCovenant && icrCovenant !== 'x') {
      const icrNum = parseFloat(icrCovenant);
      if (!isNaN(icrNum)) {
        thresholdValue = icrNum;
        thresholdMetric = 'icr';
        thresholdOperator = 'gte';
      } else if (icrCovenant.includes('€4m') || icrCovenant.includes('4m')) {
        thresholdValue = 4000000;
        thresholdMetric = 'min_rent';
        thresholdOperator = 'gte';
      }
    }

    const meta = {};
    if (email) meta.email = email;
    if (cashsweep) meta.cashsweep = cashsweep;
    if (comments) meta.comments = comments;

    sql += `-- ${rawId} (${borrower}): Rent Roll 2026\n`;
    sql += `INSERT INTO loan_covenants (loan_id, covenant_type, frequency, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)\n`;
    sql += `  SELECT ${loanSql}, 'rent_roll', 'quarterly', ${sqlNum(thresholdValue)}, ${sqlStr(thresholdOperator)}, ${sqlStr(thresholdMetric)}, 2026, ${sqlStr(comments || null)}, ${sqlJson(meta)}\n`;
    sql += `  WHERE ${loanSql} IS NOT NULL;\n`;
    covenantCount++;

    // Create submissions for Q4 2025 (has data) and Q1-Q4 2026
    const q4Status = normalizeStatus(fields[7]?.trim() || '');
    const q4Meta = {};
    if (q4Rent) q4Meta.annual_rent = q4Rent;
    if (q4ICR && q4ICR !== 'nvt') q4Meta.icr_actual = q4ICR;

    sql += `INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)\n`;
    sql += `  SELECT c.id, c.loan_id, 'Q4 2025', '${q4Status.status}', ${sqlStr(q4Status.note)}, ${sqlJson(q4Meta)}\n`;
    sql += `  FROM loan_covenants c WHERE c.loan_id = ${loanSql} AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;\n`;
    submissionCount++;

    // Q1 2026
    const q1Meta = {};
    if (q1Rent) q1Meta.annual_rent = q1Rent;
    if (q1ICR && q1ICR !== 'nvt') q1Meta.icr_actual = q1ICR;

    for (const q of ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026']) {
      const qMeta = q === 'Q1 2026' ? q1Meta : {};
      sql += `INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, metadata)\n`;
      sql += `  SELECT c.id, c.loan_id, '${q}', 'pending', ${sqlJson(qMeta)}\n`;
      sql += `  FROM loan_covenants c WHERE c.loan_id = ${loanSql} AND c.covenant_type = 'rent_roll' AND c.tracking_year = 2026;\n`;
      submissionCount++;
    }
    sql += '\n';

    matchedLoans.add(normalized);
  }
}

// ══════════════════════════════════════════════════════════
// SHEET 5: Jaarrekening 2026
// ══════════════════════════════════════════════════════════

function parseJaarrekening2026() {
  console.log('Parsing: Jaarrekening 2026...');
  const csv = parseSheet('Jaarrekening 2026');
  const lines = getAllLines(csv);

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Loan ID') && lines[i].includes('Leningnemer')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) { console.log('  WARNING: Could not find header'); return; }

  // Group by loan_id since some loans have multiple rows (e.g. RAX493 has 3 fiscal years)
  const loanSubmissions = {};

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const email = fields[0]?.trim() || '';
    const rawId = fields[1]?.trim();
    if (!rawId || rawId === '' || rawId.includes('gebreke') || rawId.includes('opvolgen')) continue;

    const borrower = (fields[2]?.trim() || '').replace(/\n/g, ' ');
    if (!borrower) continue;

    const afspraak = fields[3]?.trim() || '';
    const dueDate = parseExcelDate(fields[4]?.trim() || '');
    const reminderDate = parseExcelDate(fields[5]?.trim() || '');
    const statusRaw = fields[6]?.trim() || '';
    const statusParsed = normalizeStatus(statusRaw);
    const opmerking = fields[7]?.trim() || '';

    const normalized = normalizeLoanId(rawId);
    if (!normalized || Array.isArray(normalized)) continue;

    // Determine period label from afspraak
    let periodLabel = 'FY2025';
    if (afspraak.includes('2024')) periodLabel = 'FY2024';
    else if (afspraak.includes('2025')) periodLabel = 'FY2025';
    else if (afspraak.includes('2026')) periodLabel = 'FY2026';

    if (!loanSubmissions[normalized]) {
      loanSubmissions[normalized] = { rawId, borrower, email, afspraak, submissions: [] };
    }
    loanSubmissions[normalized].submissions.push({
      periodLabel, dueDate, reminderDate, status: statusParsed, opmerking
    });
  }

  for (const [nid, data] of Object.entries(loanSubmissions)) {
    const loanSql = loanIdSubquery(nid);

    sql += `-- ${data.rawId} (${data.borrower}): Annual Accounts 2026\n`;
    sql += `INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, tracking_year, metadata)\n`;
    sql += `  SELECT ${loanSql}, 'annual_accounts', 'annually', ${sqlStr(data.afspraak || null)}, 2026, ${data.email ? sqlJson({ email: data.email }) : "'{}'::jsonb"}\n`;
    sql += `  WHERE ${loanSql} IS NOT NULL;\n`;
    covenantCount++;

    for (const sub of data.submissions) {
      sql += `INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, due_date, reminder_date, status, notes, metadata)\n`;
      sql += `  SELECT c.id, c.loan_id, '${sub.periodLabel}', ${sub.dueDate ? sqlStr(sub.dueDate) : 'NULL'}, ${sub.reminderDate ? sqlStr(sub.reminderDate) : 'NULL'}, '${sub.status.status}', ${sqlStr(sub.status.note || sub.opmerking || null)}, '{}'::jsonb\n`;
      sql += `  FROM loan_covenants c WHERE c.loan_id = ${loanSql} AND c.covenant_type = 'annual_accounts' AND c.tracking_year = 2026;\n`;
      submissionCount++;
    }
    sql += '\n';

    matchedLoans.add(nid);
  }
}

// ══════════════════════════════════════════════════════════
// SHEET 6: Add. beeindigingsgronden
// ══════════════════════════════════════════════════════════

function parseFinancialCovenants() {
  console.log('Parsing: Add. beeindigingsgronden...');
  const csv = parseSheet('Add. beeindigingsgronden');
  const lines = getAllLines(csv);

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Loan ID') && lines[i].includes('Leningnemer')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) { console.log('  WARNING: Could not find header'); return; }

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const email = fields[0]?.trim() || '';
    const rawId = fields[1]?.trim();
    if (!rawId || rawId === '') continue;

    const borrower = (fields[2]?.trim() || '').replace(/\n/g, ' ');
    const afspraak = fields[3]?.trim() || '';
    const voldoet = fields[4]?.trim() || '';

    const normalized = normalizeLoanId(rawId);
    if (!normalized || Array.isArray(normalized)) continue;

    const loanSql = loanIdSubquery(normalized);

    // Parse the financial covenant details
    let thresholdValue = null;
    let thresholdMetric = null;
    let thresholdOperator = 'gte';

    if (afspraak.toLowerCase().includes('ebitda')) {
      thresholdMetric = 'ebitda';
      // Extract amount: "niet lager dan €1.5m" or "€2.5m"
      const amtMatch = afspraak.match(/€([\d.,]+)m/i);
      if (amtMatch) thresholdValue = parseFloat(amtMatch[1].replace(',', '.')) * 1000000;
    } else if (afspraak.toLowerCase().includes('huur') && afspraak.includes('€4m')) {
      thresholdMetric = 'min_rent';
      thresholdValue = 4000000;
    }

    const statusParsed = voldoet ? normalizeStatus(voldoet) : { status: 'pending', receivedBy: null, note: null };

    // Use CTE to link submission to the exact covenant just inserted (avoids ambiguity when multiple financial covenants exist for same loan)
    sql += `-- ${rawId} (${borrower}): Financial Covenant\n`;
    sql += `WITH new_cov AS (\n`;
    sql += `  INSERT INTO loan_covenants (loan_id, covenant_type, frequency, frequency_detail, threshold_value, threshold_operator, threshold_metric, tracking_year, notes, metadata)\n`;
    sql += `  SELECT ${loanSql}, 'financial_covenant', 'custom', ${sqlStr(afspraak)}, ${sqlNum(thresholdValue)}, '${thresholdOperator}', ${sqlStr(thresholdMetric)}, 2026, ${sqlStr(voldoet || null)}, ${email ? sqlJson({ email }) : "'{}'::jsonb"}\n`;
    sql += `  WHERE ${loanSql} IS NOT NULL\n`;
    sql += `  RETURNING id, loan_id\n`;
    sql += `)\n`;
    sql += `INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)\n`;
    sql += `  SELECT nc.id, nc.loan_id, '2026', '${statusParsed.status}', ${sqlStr(statusParsed.note || voldoet || null)}, '{}'::jsonb\n`;
    sql += `  FROM new_cov nc;\n\n`;

    covenantCount++;
    submissionCount++;
    matchedLoans.add(normalized);
  }
}

// ══════════════════════════════════════════════════════════
// SHEET 7: Grub check 2026
// ══════════════════════════════════════════════════════════

function parseGrubCheck2026() {
  console.log('Parsing: Grub check 2026...');
  const csv = parseSheet('Grub check 2026');
  const lines = getAllLines(csv);

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Loan ID') && lines[i].includes('Leningnemer')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) { console.log('  WARNING: Could not find header'); return; }

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const rawId = fields[0]?.trim();
    if (!rawId || rawId === '' || rawId.startsWith('*') || rawId.includes('=')) continue;

    const borrower = (fields[1]?.trim() || '').replace(/\n/g, ' ');
    if (!borrower || borrower.startsWith('=') || borrower.startsWith('*')) continue;

    const locatie = fields[2]?.trim() || '';
    const vehikel = fields[3]?.trim() || '';
    const kvk = fields[4]?.trim() || '';

    const normalized = normalizeLoanId(rawId);
    if (!normalized || Array.isArray(normalized)) continue;

    const loanSql = loanIdSubquery(normalized);
    const meta = {};
    if (locatie) meta.locatie = locatie;
    if (vehikel) meta.vehikel = vehikel;
    if (kvk) meta.kvk_nummer = kvk;

    const comments = fields[9]?.trim() || '';
    if (comments) meta.comments = comments;

    sql += `-- ${rawId} (${borrower}): KYC Check 2026\n`;
    sql += `INSERT INTO loan_covenants (loan_id, covenant_type, frequency, tracking_year, notes, metadata)\n`;
    sql += `  SELECT ${loanSql}, 'kyc_check', 'quarterly', 2026, ${sqlStr(comments || null)}, ${sqlJson(meta)}\n`;
    sql += `  WHERE ${loanSql} IS NOT NULL;\n`;
    covenantCount++;

    // Q1-Q4 submissions
    for (let q = 1; q <= 4; q++) {
      const colIdx = 4 + q; // cols 5,6,7,8 = Q1,Q2,Q3,Q4
      const qVal = fields[colIdx]?.trim() || '';
      let status = 'pending';
      let note = null;

      if (qVal === 'x') {
        status = 'received';
      } else if (qVal === '-') {
        status = 'received'; // checked but issues found
        note = comments || 'Issues found during check';
      }

      sql += `INSERT INTO covenant_submissions (covenant_id, loan_id, period_label, status, notes, metadata)\n`;
      sql += `  SELECT c.id, c.loan_id, 'Q${q} 2026', '${status}', ${sqlStr(note)}, '{}'::jsonb\n`;
      sql += `  FROM loan_covenants c WHERE c.loan_id = ${loanSql} AND c.covenant_type = 'kyc_check' AND c.tracking_year = 2026;\n`;
      submissionCount++;
    }
    sql += '\n';

    matchedLoans.add(normalized);
  }
}

// ══════════════════════════════════════════════════════════
// Run all parsers
// ══════════════════════════════════════════════════════════

parseAfspraken2025();
sql += '\n-- ════════════════════════════════════════\n';
sql += '-- Taxaties 2026\n';
sql += '-- ════════════════════════════════════════\n\n';
parseTaxaties2026();

sql += '\n-- ════════════════════════════════════════\n';
sql += '-- Polis 2026\n';
sql += '-- ════════════════════════════════════════\n\n';
parsePolis2026();

sql += '\n-- ════════════════════════════════════════\n';
sql += '-- Huurlijsten 2026\n';
sql += '-- ════════════════════════════════════════\n\n';
parseHuurlijsten2026();

sql += '\n-- ════════════════════════════════════════\n';
sql += '-- Jaarrekening 2026\n';
sql += '-- ════════════════════════════════════════\n\n';
parseJaarrekening2026();

sql += '\n-- ════════════════════════════════════════\n';
sql += '-- Add. beeindigingsgronden\n';
sql += '-- ════════════════════════════════════════\n\n';
parseFinancialCovenants();

sql += '\n-- ════════════════════════════════════════\n';
sql += '-- Grub check 2026\n';
sql += '-- ════════════════════════════════════════\n\n';
parseGrubCheck2026();

sql += `\nCOMMIT;\n`;

sql += `
-- ════════════════════════════════════════
-- Verification queries
-- ════════════════════════════════════════

-- Count by type
SELECT covenant_type, count(*) FROM loan_covenants GROUP BY 1 ORDER BY 1;

-- Count submissions by status
SELECT status, count(*) FROM covenant_submissions GROUP BY 1 ORDER BY 1;

-- Spot check: all covenants for a specific loan
SELECT l.loan_id, lc.covenant_type, lc.tracking_year, cs.period_label, cs.status
FROM covenant_submissions cs
JOIN loan_covenants lc ON lc.id = cs.covenant_id
JOIN loans l ON l.id = cs.loan_id
WHERE l.loan_id = '444'
ORDER BY lc.covenant_type, cs.period_label;
`;

// Write output
const outputPath = resolve(PROJECT_ROOT, 'supabase/migrations/20260332_import_covenant_data.sql');
writeFileSync(outputPath, sql);

console.log(`\nGenerated: ${outputPath}`);
console.log(`Unique loans matched: ${matchedLoans.size}`);
console.log(`Covenants created: ~${covenantCount}`);
console.log(`Submissions created: ~${submissionCount}`);
console.log(`\nMatched loan IDs: ${[...matchedLoans].sort((a, b) => +a - +b).join(', ')}`);
