import ExcelJS from 'exceljs';
import type { CalcSheetData, CalcSheetRow } from '@/hooks/useCalculationSheet';
import { format, parseISO } from 'date-fns';

// ── Styling ──────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF003B5C' }, // RAX teal-navy
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'IBM Plex Sans',
  size: 10,
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

const DEFAULT_FONT: Partial<ExcelJS.Font> = {
  name: 'IBM Plex Sans',
  size: 10,
};

const MONO_FONT: Partial<ExcelJS.Font> = {
  name: 'IBM Plex Mono',
  size: 10,
};

const SUBTOTAL_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFEEF2F0' },
};

const VEHICLE_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9E2DE' },
};

const GRAND_TOTAL_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF003B5C' },
};

const CURRENCY_FMT = '€#,##0.00';
const PERCENT_FMT = '0.0000%';
const DATE_FMT = 'DD/MM/YYYY';
const DAYS_FMT = '0';

// ── Column definitions ──────────────────────────────────────

const COLUMNS = [
  { header: 'Loan', key: 'loan', width: 8 },
  { header: 'Borrower', key: 'borrower', width: 22 },
  { header: 'Vehicle', key: 'vehicle', width: 10 },
  { header: 'Type', key: 'type', width: 14 },
  { header: 'Seg', key: 'seg', width: 5 },
  { header: 'From', key: 'from', width: 12 },
  { header: 'To', key: 'to', width: 12 },
  { header: 'Days (30/360)', key: 'days', width: 13 },
  { header: 'Base Amount', key: 'base', width: 16 },
  { header: 'Rate', key: 'rate', width: 10 },
  { header: 'Calculation', key: 'formula', width: 38 },
  { header: 'Amount', key: 'amount', width: 16 },
  { header: 'Interest Total', key: 'intTotal', width: 16 },
  { header: 'Commit. Fee Total', key: 'feeTotal', width: 16 },
  { header: 'Period Total', key: 'periodTotal', width: 16 },
  { header: 'Event / Note', key: 'event', width: 28 },
];

function fmtDate(d: string): string {
  if (!d) return '';
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
}

// ── Export ────────────────────────────────────────────────────

export async function exportCalculationSheet(data: CalcSheetData): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RAX Finance Loan Tool';
  wb.created = new Date();

  const displayMonth = format(new Date(parseInt(data.month.split('-')[0]), parseInt(data.month.split('-')[1]) - 1), 'MMMM yyyy');
  const ws = wb.addWorksheet(`Calc Sheet ${displayMonth}`);

  // Set columns
  ws.columns = COLUMNS.map(c => ({ header: c.header, key: c.key, width: c.width }));

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF003B5C' } },
    };
  });
  headerRow.height = 28;

  // Freeze header + first 3 columns
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }];

  // Add data rows
  for (const row of data.rows) {
    if (row.rowType === 'interest' || row.rowType === 'commitment_fee') {
      addSegmentRow(ws, row);
    } else if (row.rowType === 'loan_subtotal') {
      addSubtotalRow(ws, row);
    } else if (row.rowType === 'vehicle_subtotal') {
      addVehicleSubtotalRow(ws, row);
    } else if (row.rowType === 'grand_total') {
      addGrandTotalRow(ws, row);
    }
  }

  // Auto-filter
  ws.autoFilter = { from: 'A1', to: `P${ws.rowCount}` };

  // Generate and download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RAX_Calculation_Sheet_${data.month}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

function addSegmentRow(ws: ExcelJS.Worksheet, row: CalcSheetRow) {
  const isFirst = row.segmentIndex === 1;
  const excelRow = ws.addRow({
    loan: isFirst ? `#${row.loanId}` : '',
    borrower: isFirst ? row.borrowerName : '',
    vehicle: isFirst ? row.vehicle : '',
    type: row.rowType === 'interest'
      ? (row.interestType === 'pik' ? 'Interest (PIK)' : 'Interest')
      : 'Commitment Fee',
    seg: row.segmentCount! > 1 ? `${row.segmentIndex}/${row.segmentCount}` : '',
    from: fmtDate(row.segStartDate ?? ''),
    to: fmtDate(row.segEndDate ?? ''),
    days: row.days,
    base: row.baseAmount,
    rate: row.rate,
    formula: row.formula,
    amount: row.amount,
    intTotal: '',
    feeTotal: '',
    periodTotal: '',
    event: row.boundaryEvent ?? '',
  });

  excelRow.eachCell((cell, colNumber) => {
    cell.font = [9, 10, 12].includes(colNumber)  // base, rate, amount columns
      ? { ...MONO_FONT }
      : { ...DEFAULT_FONT };
    cell.alignment = { vertical: 'middle' };
  });

  // Number formats
  const baseCell = excelRow.getCell('base');
  baseCell.numFmt = CURRENCY_FMT;
  excelRow.getCell('rate').numFmt = PERCENT_FMT;
  excelRow.getCell('amount').numFmt = CURRENCY_FMT;
  excelRow.getCell('days').numFmt = DAYS_FMT;

  // Right-align numbers
  for (const key of ['days', 'base', 'rate', 'amount']) {
    excelRow.getCell(key).alignment = { horizontal: 'right', vertical: 'middle' };
  }
}

function addSubtotalRow(ws: ExcelJS.Worksheet, row: CalcSheetRow) {
  const excelRow = ws.addRow({
    loan: `#${row.loanId}`,
    borrower: row.borrowerName,
    vehicle: '',
    type: '',
    seg: '',
    from: fmtDate(row.periodStart),
    to: fmtDate(row.periodEnd),
    days: '',
    base: '',
    rate: '',
    formula: `Opening: €${row.openingPrincipal?.toLocaleString('nl-NL') ?? 0} @ ${((row.openingRate ?? 0) * 100).toFixed(4)}%`,
    amount: '',
    intTotal: row.totalInterest,
    feeTotal: row.totalCommitmentFee,
    periodTotal: row.totalDue,
    event: row.periodStatus,
  });

  excelRow.eachCell((cell, colNumber) => {
    cell.fill = SUBTOTAL_FILL;
    cell.font = { ...DEFAULT_FONT, bold: true };
    if ([13, 14, 15].includes(colNumber)) {
      cell.font = { ...MONO_FONT, bold: true };
      cell.numFmt = CURRENCY_FMT;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  });
}

function addVehicleSubtotalRow(ws: ExcelJS.Worksheet, row: CalcSheetRow) {
  const excelRow = ws.addRow({
    loan: '',
    borrower: `${row.vehicle} Total`,
    vehicle: '',
    type: '',
    seg: '',
    from: '',
    to: '',
    days: '',
    base: '',
    rate: '',
    formula: '',
    amount: '',
    intTotal: row.totalInterest,
    feeTotal: row.totalCommitmentFee,
    periodTotal: row.totalDue,
    event: '',
  });

  excelRow.eachCell((cell, colNumber) => {
    cell.fill = VEHICLE_FILL;
    cell.font = { ...DEFAULT_FONT, bold: true };
    if ([13, 14, 15].includes(colNumber)) {
      cell.font = { ...MONO_FONT, bold: true };
      cell.numFmt = CURRENCY_FMT;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  });
}

function addGrandTotalRow(ws: ExcelJS.Worksheet, row: CalcSheetRow) {
  const excelRow = ws.addRow({
    loan: '',
    borrower: 'GRAND TOTAL',
    vehicle: '',
    type: '',
    seg: '',
    from: '',
    to: '',
    days: '',
    base: '',
    rate: '',
    formula: '',
    amount: '',
    intTotal: row.totalInterest,
    feeTotal: row.totalCommitmentFee,
    periodTotal: row.totalDue,
    event: '',
  });

  excelRow.eachCell((cell, colNumber) => {
    cell.fill = GRAND_TOTAL_FILL;
    cell.font = { ...HEADER_FONT };
    if ([13, 14, 15].includes(colNumber)) {
      cell.font = { ...HEADER_FONT, name: 'IBM Plex Mono' };
      cell.numFmt = CURRENCY_FMT;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  });
}
