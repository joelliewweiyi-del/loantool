import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync(new URL('./afas_1100.json', import.meta.url), 'utf8'));
const page2 = JSON.parse(readFileSync(new URL('./afas_page2.json', import.meta.url), 'utf8'));

const rows = [...(data.allData?.rows || []), ...(page2.allData?.rows || [])];
console.log('Total rows:', rows.length);

const headers = ['EntryDate', 'JournalId', 'AccountNo', 'DimAx1', 'AmtDebit', 'AmtCredit', 'Description', 'EntryNo', 'SeqNo', 'Year', 'Period', 'VoucherNo', 'VoucherDate', 'InvoiceId'];

const csvLines = [headers.join(',')];
for (const r of rows) {
  const vals = headers.map(h => {
    let v = r[h];
    if (v === null || v === undefined) return '';
    if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
      return '"' + v.replace(/"/g, '""') + '"';
    }
    return String(v);
  });
  csvLines.push(vals.join(','));
}

const outPath = new URL('./afas_cash_payments_104xx.csv', import.meta.url);
writeFileSync(outPath, csvLines.join('\n'), 'utf8');
console.log('Exported to:', outPath.pathname);
