import { readFileSync } from 'fs';
const filePath = new URL('./afas_1100.json', import.meta.url);
const data = JSON.parse(readFileSync(filePath, 'utf8'));

if (!data.success) {
  console.log('ERROR:', JSON.stringify(data, null, 2));
  process.exit(1);
}

const rows = data.allData?.rows || [];
console.log('Total rows returned:', rows.length);
console.log();

// Known debtor account to loan mapping
const acctToLoan = {
  '10431': '484', '10432': '415', '10434': '423', '10435': '515',
  '10437': '431', '10438': '435', '10439': 'REDIII', '10440': 'SDK',
  '10441': 'Leusden', '10442': '510', '10443': '449', '10444': 'ByTheRiver',
  '10445': '466', '10446': '455', '10447': '456', '10449': '460',
  '10450': 'vdWiel', '10452': '472', '10454': 'Lekkerkerker', '10455': 'Drechsel',
  '10456': '479/527', '10457': '482', '10460': '488-39', '10461': '488-19',
  '10462': '490', '10463': '491', '10464': '492', '10465': '493',
  '10466': 'ShareGarages', '10469': '500', '10470': '501', '10471': '504',
  '10472': '505', '10473': '507', '10474': '509', '10475': '511',
  '10476': '512', '10477': '514'
};

// Separate credits (payments received) and debits (refunds/corrections)
const credits = rows.filter(r => r.AmtCredit > 0);
const debits = rows.filter(r => r.AmtDebit > 0);

console.log('=== CASH INTEREST PAYMENTS RECEIVED (Credits on 104xx) ===');
console.log('Count:', credits.length);
console.log();
console.log('Date        | Acct  | Loan Ref | Amount       | Borrower / Description');
console.log('------------|-------|----------|--------------|-----------------------------------------------');
for (const r of credits) {
  const date = (r.EntryDate || '').substring(0, 10);
  const desc = (r.Description || '').substring(0, 55);
  const loan = acctToLoan[r.AccountNo] || '?';
  const amt = r.AmtCredit.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(12);
  console.log(date + '  | ' + r.AccountNo + ' | ' + loan.padEnd(8) + ' | ' + amt + ' | ' + desc);
}

if (debits.length > 0) {
  console.log();
  console.log('=== DEBITS ON 104xx (Refunds / Corrections) ===');
  console.log('Count:', debits.length);
  console.log();
  for (const r of debits) {
    const date = (r.EntryDate || '').substring(0, 10);
    const desc = (r.Description || '').substring(0, 55);
    const loan = acctToLoan[r.AccountNo] || '?';
    const amt = r.AmtDebit.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(12);
    console.log(date + '  | ' + r.AccountNo + ' | ' + loan.padEnd(8) + ' | ' + amt + ' | ' + desc);
  }
}

// Summary by account
console.log();
console.log('=== SUMMARY BY DEBTOR ACCOUNT ===');
const byAcct = {};
for (const r of credits) {
  if (!byAcct[r.AccountNo]) byAcct[r.AccountNo] = { count: 0, total: 0 };
  byAcct[r.AccountNo].count++;
  byAcct[r.AccountNo].total += r.AmtCredit;
}
const sorted = Object.entries(byAcct).sort((a, b) => b[1].total - a[1].total);
for (const [acct, info] of sorted) {
  const loan = acctToLoan[acct] || '?';
  console.log(acct + ' (RAX' + loan + '): ' + info.count + ' payments, total ' + info.total.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}
