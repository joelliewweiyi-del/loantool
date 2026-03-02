const ExcelJS = require('exceljs');
const wb = new ExcelJS.Workbook();
wb.xlsx.readFile('docs/Loan tape RED IV 01-02-26.xlsx').then(() => {
  const ws = wb.getWorksheet('Loan Tape');

  const results = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum <= 2) return;
    const loanId = row.getCell(2).value;
    if (loanId == null || loanId === '') return;
    if (typeof loanId === 'string' && isNaN(Number(loanId))) return;

    function extract(cell) {
      const v = cell.value;
      if (v == null || v === '') return null;
      if (typeof v === 'object') {
        if (v.hyperlink) return v.hyperlink;
        if (v.text) return v.text;
        if (v.richText) return v.richText.map(r => r.text).join('');
        if (v.result !== undefined) return String(v.result);
        return JSON.stringify(v);
      }
      return String(v);
    }

    const gm = extract(row.getCell(22));
    const kk = extract(row.getCell(23));
    const ph = extract(row.getCell(24));
    const ai = extract(row.getCell(25));

    // Skip rows where all 4 are empty or "0"
    if ([gm, kk, ph, ai].every(v => v == null || v === '0')) return;

    results.push({ loanId: String(loanId), gm, kk, ph, ai });
  });

  // Output as JSON for easy consumption
  console.log(JSON.stringify(results, null, 2));
});
