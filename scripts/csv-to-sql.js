import { readFileSync, writeFileSync } from 'fs';

const raw = readFileSync(new URL('./all_data.csv.csv', import.meta.url), 'utf8');
const lines = raw.split('\n').filter(l => l.trim());

// Skip header line
const header = lines[0]; // "_table;data"
const dataLines = lines.slice(1);

// Group by table
const byTable = {};
for (const line of dataLines) {
  const semiIdx = line.indexOf(';');
  if (semiIdx === -1) continue;
  const table = line.substring(0, semiIdx);
  let jsonStr = line.substring(semiIdx + 1);

  // Remove surrounding quotes if present (CSV quoting for JSON with commas)
  if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
    jsonStr = jsonStr.slice(1, -1).replace(/""/g, '"');
  }

  try {
    const data = JSON.parse(jsonStr);
    if (!byTable[table]) byTable[table] = [];
    byTable[table].push(data);
  } catch (e) {
    console.error('Failed to parse line for table', table, ':', e.message);
    console.error('JSON snippet:', jsonStr.substring(0, 200));
  }
}

console.log('Tables found:');
for (const [table, rows] of Object.entries(byTable)) {
  console.log('  ' + table + ': ' + rows.length + ' rows');
}

// Import order matters for foreign keys
const importOrder = [
  'loans',
  'loan_events',
  'periods',
  'accrual_entries',
  'monthly_approvals',
  'notice_snapshots',
  'user_roles',
  'processing_jobs',
  'loan_facilities',
];

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return "'" + JSON.stringify(val).replace(/'/g, "''") + "'::jsonb";
  // String value
  return "'" + String(val).replace(/'/g, "''") + "'";
}

let sql = '-- Data migration from old project\n';
sql += '-- Generated: ' + new Date().toISOString() + '\n\n';
sql += 'BEGIN;\n\n';

// Disable triggers temporarily to avoid issues with RLS/triggers during import
sql += '-- Disable triggers for clean import\n';
for (const table of importOrder) {
  if (byTable[table] && byTable[table].length > 0) {
    sql += 'ALTER TABLE ' + table + ' DISABLE TRIGGER ALL;\n';
  }
}
sql += '\n';

for (const table of importOrder) {
  const rows = byTable[table];
  if (!rows || rows.length === 0) {
    sql += '-- ' + table + ': no rows\n\n';
    continue;
  }

  sql += '-- ' + table + ': ' + rows.length + ' rows\n';

  // Get columns from first row
  const columns = Object.keys(rows[0]);

  for (const row of rows) {
    const values = columns.map(col => escapeValue(row[col]));
    sql += 'INSERT INTO ' + table + ' (' + columns.join(', ') + ') VALUES (' + values.join(', ') + ') ON CONFLICT DO NOTHING;\n';
  }
  sql += '\n';
}

// Re-enable triggers
sql += '-- Re-enable triggers\n';
for (const table of importOrder) {
  if (byTable[table] && byTable[table].length > 0) {
    sql += 'ALTER TABLE ' + table + ' ENABLE TRIGGER ALL;\n';
  }
}

sql += '\nCOMMIT;\n';

const outPath = new URL('./import.sql', import.meta.url);
writeFileSync(outPath, sql, 'utf8');
console.log('\nSQL written to:', outPath.pathname);
console.log('Size:', (sql.length / 1024).toFixed(1) + ' KB');
