import ExcelJS from 'exceljs';
import { Loan, LoanEvent } from '@/types/loan';
import { getLoanStateAtDate } from './loanCalculations';
import { differenceInDays, parseISO } from 'date-fns';

export interface LoanWithEvents {
  loan: Loan;
  events: LoanEvent[];
}

interface LoanTapeData {
  loanId: string;
  city: string;
  status: string;
  remarks: string;
  category: string;
  earmarked: boolean;
  currentFacility: string;
  initialFacility: string;
  commitment: number | null;
  outstanding: number;
  undrawn: number | null;
  interestRate: number;
  redIVStartDate: string | null;
  originalStartDate: string | null;
  maturityDate: string | null;
  rentalIncome: number | null;
  valuation: number | null;
  valuationDate: string | null;
  ltv: number | null;
  duration: number | null;
  // Extra fields for detailed / full exports
  googleMapsUrl?: string;
  kadastraleKaartUrl?: string;
  photoUrl?: string;
  additionalInfo?: string;
}

function computeDuration(maturityDate: string | null, asOfDate: string): number | null {
  if (!maturityDate) return null;
  const days = differenceInDays(parseISO(maturityDate), parseISO(asOfDate));
  if (days <= 0) return 0;
  return Math.round((days / 365) * 100) / 100;
}

export function buildLoanTapeData(
  loansWithEvents: LoanWithEvents[],
  asOfDate: string
): LoanTapeData[] {
  return loansWithEvents.map(({ loan, events }) => {
    const state = getLoanStateAtDate(events, asOfDate, loan.total_commitment ?? 0, loan.interest_type ?? 'cash_pay');
    const outstanding = state.outstandingPrincipal;
    const rawCommitment = state.totalCommitment || loan.total_commitment || 0;
    const effectiveCommitment = rawCommitment > 0 ? rawCommitment : outstanding;
    const undrawn = effectiveCommitment > outstanding ? effectiveCommitment - outstanding : null;

    return {
      loanId: loan.loan_id,
      city: loan.city || '',
      status: loan.property_status || '',
      remarks: loan.remarks || '',
      category: loan.category || '',
      earmarked: loan.earmarked ?? false,
      currentFacility: loan.vehicle || '',
      initialFacility: loan.initial_facility || '',
      commitment: effectiveCommitment > 0 ? effectiveCommitment : null,
      outstanding,
      undrawn,
      interestRate: state.currentRate,
      redIVStartDate: loan.red_iv_start_date || null,
      originalStartDate: loan.loan_start_date || null,
      maturityDate: loan.maturity_date || null,
      rentalIncome: loan.rental_income,
      valuation: loan.valuation,
      valuationDate: loan.valuation_date || null,
      ltv: loan.ltv,
      duration: computeDuration(loan.maturity_date, asOfDate),
      googleMapsUrl: loan.google_maps_url || '',
      kadastraleKaartUrl: loan.kadastrale_kaart_url || '',
      photoUrl: loan.photo_url || '',
      additionalInfo: loan.additional_info || '',
    };
  });
}

// ── Styling constants ──────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F3864' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 10,
};

const GROUP_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 10,
};

const SUBTOTAL_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2F2F2' },
};

const CURRENCY_FMT = '#,##0';
const PERCENT_FMT = '0.00%';
const DATE_FMT = 'D/M/YY';
const NUMBER_FMT = '0.00';

interface ColDef {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
  isCurrency?: boolean;
  isPercent?: boolean;
  isDate?: boolean;
}

// ── Column definitions ──────────────────────────────────────────

const COLUMNS: ColDef[] = [
  { header: 'Loan ID', key: 'loanId', width: 10 },
  { header: 'City', key: 'city', width: 18 },
  { header: 'Status', key: 'status', width: 16 },
  { header: 'Remarks', key: 'remarks', width: 40 },
  { header: 'Category', key: 'category', width: 16 },
  { header: 'Earmarked', key: 'earmarked', width: 12 },
  { header: 'Current Facility', key: 'currentFacility', width: 16 },
  { header: 'Initial Facility', key: 'initialFacility', width: 16 },
  { header: 'Commitment', key: 'commitment', width: 18, numFmt: CURRENCY_FMT, isCurrency: true },
  { header: 'Outstanding', key: 'outstanding', width: 18, numFmt: CURRENCY_FMT, isCurrency: true },
  { header: 'Undrawn', key: 'undrawn', width: 18, numFmt: CURRENCY_FMT, isCurrency: true },
  { header: 'Interest Rate', key: 'interestRate', width: 14, numFmt: PERCENT_FMT, isPercent: true },
  { header: 'RED IV Start Date', key: 'redIVStartDate', width: 18, isDate: true },
  { header: 'Original Start Date', key: 'originalStartDate', width: 18, isDate: true },
  { header: 'Maturity Date', key: 'maturityDate', width: 16, isDate: true },
  { header: 'Rental Income', key: 'rentalIncome', width: 16, numFmt: CURRENCY_FMT, isCurrency: true },
  { header: 'Valuation (as-is)', key: 'valuation', width: 18, numFmt: CURRENCY_FMT, isCurrency: true },
  { header: 'Valuation date', key: 'valuationDate', width: 16, isDate: true },
  { header: 'LTV', key: 'ltv', width: 10, numFmt: PERCENT_FMT, isPercent: true },
  { header: 'Duration', key: 'duration', width: 10, numFmt: NUMBER_FMT },
];

// Summary format: 16 columns (no Current/Initial Facility, no RED IV Start Date, no Valuation date)
const SUMMARY_COLUMNS: ColDef[] = [
  { header: 'Loan ID', key: 'loanId', width: 10 },
  { header: 'City', key: 'city', width: 18 },
  { header: 'Status', key: 'status', width: 16 },
  { header: 'Remarks', key: 'remarks', width: 40 },
  { header: 'Category', key: 'category', width: 16 },
  { header: 'Earmarked', key: 'earmarked', width: 12 },
  { header: 'Commitment', key: 'commitment', width: 18, numFmt: CURRENCY_FMT, isCurrency: true },
  { header: 'Outstanding', key: 'outstanding', width: 18, numFmt: CURRENCY_FMT, isCurrency: true },
  { header: 'Undrawn', key: 'undrawn', width: 18, numFmt: CURRENCY_FMT, isCurrency: true },
  { header: 'Interest Rate', key: 'interestRate', width: 14, numFmt: PERCENT_FMT, isPercent: true },
  { header: 'Original Start Date', key: 'originalStartDate', width: 18, isDate: true },
  { header: 'Maturity Date', key: 'maturityDate', width: 16, isDate: true },
  { header: 'Rental Income', key: 'rentalIncome', width: 16, numFmt: CURRENCY_FMT, isCurrency: true },
  { header: 'Valuation (as-is)', key: 'valuation', width: 18, numFmt: CURRENCY_FMT, isCurrency: true },
  { header: 'LTV', key: 'ltv', width: 10, numFmt: PERCENT_FMT, isPercent: true },
  { header: 'Duration', key: 'duration', width: 10, numFmt: NUMBER_FMT },
];

// Detailed: current 20 + 4 extra
const DETAILED_COLUMNS: ColDef[] = [
  ...COLUMNS,
  { header: 'Google Maps', key: 'googleMapsUrl', width: 30 },
  { header: 'kadastralekaart', key: 'kadastraleKaartUrl', width: 30 },
  { header: 'Photo', key: 'photoUrl', width: 30 },
  { header: 'Additional Information', key: 'additionalInfo', width: 60 },
];

// ── Helpers ──────────────────────────────────────────────────────

function toExcelDate(dateStr: string | null): Date | string {
  if (!dateStr) return '';
  return parseISO(dateStr);
}

function styleHeaderRow(ws: ExcelJS.Worksheet, rowNum: number) {
  const row = ws.getRow(rowNum);
  row.eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  row.height = 24;
}

function applyFormats(row: ExcelJS.Row, columns: ColDef[]) {
  columns.forEach((col, i) => {
    const cell = row.getCell(i + 1);
    if (col.numFmt && cell.value !== '' && cell.value != null) {
      cell.numFmt = col.numFmt;
    }
    if (col.isDate && cell.value instanceof Date) {
      cell.numFmt = DATE_FMT;
    }
  });
}

function buildRowValues(row: LoanTapeData, columns: ColDef[]): Record<string, unknown> {
  const vals: Record<string, unknown> = {};
  for (const col of columns) {
    const v = (row as any)[col.key];
    if (col.isDate) vals[col.key] = toExcelDate(v);
    else if (col.key === 'earmarked') vals[col.key] = v ? 'TRUE' : 'FALSE';
    else vals[col.key] = v ?? '';
  }
  return vals;
}

function triggerDownload(buffer: ExcelJS.Buffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Export 1: Summary (v2) with earmarked split ─────────────────

export async function downloadSummaryLoanTapeXlsx(
  loansWithEvents: LoanWithEvents[],
  asOfDate: string,
  vehicle: string
) {
  const data = buildLoanTapeData(loansWithEvents, asOfDate);
  const incomeProducing = data.filter(d => d.earmarked);
  const nonIncomeProducing = data.filter(d => !d.earmarked);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'RAX Finance Loan Tool';
  wb.created = new Date();

  const ws = wb.addWorksheet('Loan Tape', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  const cols = SUMMARY_COLUMNS;

  // Set column widths (col A is spacer, data starts at B)
  ws.getColumn(1).width = 3;
  cols.forEach((col, i) => { ws.getColumn(i + 2).width = col.width; });

  // Row 1: empty
  ws.addRow([]);

  // Row 2: header row (offset by 1 col for spacer)
  const headerValues = ['', ...cols.map(c => c.header)];
  const headerRow = ws.addRow(headerValues);
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber >= 2) {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });
  headerRow.height = 24;

  // Helper: add data row with offset
  function addDataRow(item: LoanTapeData) {
    const values: unknown[] = [null]; // spacer col A
    for (const col of cols) {
      const v = (item as any)[col.key];
      if (col.isDate) values.push(toExcelDate(v));
      else if (col.key === 'earmarked') values.push(v ? 'TRUE' : 'FALSE');
      else values.push(v ?? '');
    }
    const row = ws.addRow(values);
    cols.forEach((col, i) => {
      const cell = row.getCell(i + 2);
      if (col.numFmt && cell.value !== '' && cell.value != null) cell.numFmt = col.numFmt;
      if (col.isDate && cell.value instanceof Date) cell.numFmt = DATE_FMT;
    });
    return row;
  }

  // Build column-letter lookup (col B = index 0 in cols)
  const colLetter = (colIdx: number) => {
    const n = colIdx + 2; // +2 because col A is spacer
    return String.fromCharCode(64 + n); // 2→B, 3→C, etc.
  };
  const colLetterOf = (key: string) => {
    const idx = cols.findIndex(c => c.key === key);
    return idx >= 0 ? colLetter(idx) : '';
  };

  // Helper: add subtotal row with Excel formulas
  function addSubtotalRow(firstDataRow: number, lastDataRow: number) {
    const row = ws.addRow([]);
    const rowNum = row.number;

    const commitCol = colLetterOf('commitment');
    const outCol = colLetterOf('outstanding');
    const undrawnCol = colLetterOf('undrawn');
    const ltvCol = colLetterOf('ltv');
    const durCol = colLetterOf('duration');

    cols.forEach((col, i) => {
      const cell = row.getCell(i + 2);
      const letter = colLetter(i);
      const range = `${letter}${firstDataRow}:${letter}${lastDataRow}`;

      if (col.key === 'loanId') {
        // COUNTA for number of loans
        cell.value = { formula: `COUNTA(${range})` } as any;
      } else if (col.key === 'commitment' || col.key === 'outstanding' || col.key === 'undrawn' || col.key === 'rentalIncome') {
        cell.value = { formula: `SUM(${range})` } as any;
      } else if (col.key === 'ltv') {
        // Weighted average LTV by commitment
        const ltvRange = `${ltvCol}${firstDataRow}:${ltvCol}${lastDataRow}`;
        const commitRange = `${commitCol}${firstDataRow}:${commitCol}${lastDataRow}`;
        cell.value = { formula: `IFERROR(SUMPRODUCT(${ltvRange},${commitRange})/SUM(${commitRange}),"")` } as any;
      } else if (col.key === 'duration') {
        // Weighted average Duration by commitment
        const durRange = `${durCol}${firstDataRow}:${durCol}${lastDataRow}`;
        const commitRange = `${commitCol}${firstDataRow}:${commitCol}${lastDataRow}`;
        cell.value = { formula: `IFERROR(SUMPRODUCT(${durRange},${commitRange})/SUM(${commitRange}),"")` } as any;
      } else {
        cell.value = '';
      }

      if (col.numFmt && col.key !== 'loanId') cell.numFmt = col.numFmt;
    });

    row.eachCell((cell, colNumber) => {
      if (colNumber >= 2) {
        cell.font = { bold: true, size: 10 };
        cell.fill = SUBTOTAL_FILL;
      }
    });
  }

  // "Income Producing" group
  const ipLabelRow = ws.addRow([null, 'Income Producing']);
  ipLabelRow.getCell(2).font = GROUP_FONT;
  const ipFirstRow = ws.rowCount + 1;
  for (const item of incomeProducing) addDataRow(item);
  const ipLastRow = ws.rowCount;
  if (incomeProducing.length > 0) addSubtotalRow(ipFirstRow, ipLastRow);

  // Empty row
  ws.addRow([]);

  // "Non-Income Producing" group
  const nipLabelRow = ws.addRow([null, 'Non-Income Producing']);
  nipLabelRow.getCell(2).font = GROUP_FONT;
  const nipFirstRow = ws.rowCount + 1;
  for (const item of nonIncomeProducing) addDataRow(item);
  const nipLastRow = ws.rowCount;
  if (nonIncomeProducing.length > 0) addSubtotalRow(nipFirstRow, nipLastRow);

  // Empty row + Grand total (reference all data rows)
  ws.addRow([]);
  const allFirstRow = ipFirstRow;
  // Grand total: we need both subtotal rows referenced, but simpler to just
  // reference all data rows. We'll build two-range formulas.
  {
    const row = ws.addRow([]);
    const commitCol = colLetterOf('commitment');
    const ltvCol = colLetterOf('ltv');
    const durCol = colLetterOf('duration');

    cols.forEach((col, i) => {
      const cell = row.getCell(i + 2);
      const letter = colLetter(i);
      const rangeIP = incomeProducing.length > 0 ? `${letter}${ipFirstRow}:${letter}${ipLastRow}` : '';
      const rangeNIP = nonIncomeProducing.length > 0 ? `${letter}${nipFirstRow}:${letter}${nipLastRow}` : '';

      // Build combined range parts
      const parts = [rangeIP, rangeNIP].filter(Boolean);

      if (col.key === 'loanId') {
        cell.value = { formula: parts.map(r => `COUNTA(${r})`).join('+') || '0' } as any;
      } else if (col.key === 'commitment' || col.key === 'outstanding' || col.key === 'undrawn' || col.key === 'rentalIncome') {
        cell.value = { formula: parts.map(r => `SUM(${r})`).join('+') || '0' } as any;
      } else if (col.key === 'ltv') {
        const commitParts = parts.map((_, pi) => {
          const src = pi === 0 && incomeProducing.length > 0
            ? { first: ipFirstRow, last: ipLastRow }
            : { first: nipFirstRow, last: nipLastRow };
          return { ltv: `${ltvCol}${src.first}:${ltvCol}${src.last}`, commit: `${commitCol}${src.first}:${commitCol}${src.last}` };
        });
        const sumProd = commitParts.map(p => `SUMPRODUCT(${p.ltv},${p.commit})`).join('+');
        const sumCommit = commitParts.map(p => `SUM(${p.commit})`).join('+');
        cell.value = { formula: `IFERROR((${sumProd})/(${sumCommit}),"")` } as any;
      } else if (col.key === 'duration') {
        const commitParts = parts.map((_, pi) => {
          const src = pi === 0 && incomeProducing.length > 0
            ? { first: ipFirstRow, last: ipLastRow }
            : { first: nipFirstRow, last: nipLastRow };
          return { dur: `${durCol}${src.first}:${durCol}${src.last}`, commit: `${commitCol}${src.first}:${commitCol}${src.last}` };
        });
        const sumProd = commitParts.map(p => `SUMPRODUCT(${p.dur},${p.commit})`).join('+');
        const sumCommit = commitParts.map(p => `SUM(${p.commit})`).join('+');
        cell.value = { formula: `IFERROR((${sumProd})/(${sumCommit}),"")` } as any;
      } else {
        cell.value = '';
      }

      if (col.numFmt && col.key !== 'loanId') cell.numFmt = col.numFmt;
    });

    row.eachCell((cell, colNumber) => {
      if (colNumber >= 2) {
        cell.font = { bold: true, size: 10 };
        cell.fill = SUBTOTAL_FILL;
      }
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const dateStr = asOfDate.replace(/-/g, '');
  triggerDownload(buffer, `Loan_Tape_${vehicle.replace(/\s+/g, '_')}_${dateStr}_summary.xlsx`);
}

// ── Export 2: Detailed (24 columns, flat) ───────────────────────

export async function downloadDetailedLoanTapeXlsx(
  loansWithEvents: LoanWithEvents[],
  asOfDate: string,
  vehicle: string
) {
  const data = buildLoanTapeData(loansWithEvents, asOfDate);
  const cols = DETAILED_COLUMNS;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'RAX Finance Loan Tool';
  wb.created = new Date();

  const ws = wb.addWorksheet('Loan Tape', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = cols.map(col => ({ header: col.header, key: col.key, width: col.width }));
  styleHeaderRow(ws, 1);

  for (const row of data) {
    const excelRow = ws.addRow(buildRowValues(row, cols));
    applyFormats(excelRow, cols);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const dateStr = asOfDate.replace(/-/g, '');
  triggerDownload(buffer, `Loan_Tape_${vehicle.replace(/\s+/g, '_')}_${dateStr}_detailed.xlsx`);
}

// ── Export 3: Full database export ──────────────────────────────

export async function downloadFullExportXlsx(
  loansWithEvents: LoanWithEvents[],
  asOfDate: string,
  vehicle: string
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'RAX Finance Loan Tool';
  wb.created = new Date();

  const ws = wb.addWorksheet('Full Export', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const FULL_COLUMNS: ColDef[] = [
    { header: 'Loan ID', key: 'loanId', width: 10 },
    { header: 'Borrower', key: 'borrowerName', width: 25 },
    { header: 'Vehicle', key: 'vehicle', width: 12 },
    { header: 'Facility', key: 'facility', width: 16 },
    { header: 'City', key: 'city', width: 18 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Property Status', key: 'propertyStatus', width: 16 },
    { header: 'Earmarked', key: 'earmarked', width: 12 },
    { header: 'Commitment', key: 'commitment', width: 18, numFmt: CURRENCY_FMT, isCurrency: true },
    { header: 'Outstanding', key: 'outstanding', width: 18, numFmt: CURRENCY_FMT, isCurrency: true },
    { header: 'Undrawn', key: 'undrawn', width: 18, numFmt: CURRENCY_FMT, isCurrency: true },
    { header: 'Interest Rate', key: 'interestRate', width: 14, numFmt: PERCENT_FMT, isPercent: true },
    { header: 'Interest Type', key: 'interestType', width: 14 },
    { header: 'Fee Payment Type', key: 'feePaymentType', width: 14 },
    { header: 'Cash Interest %', key: 'cashInterestPct', width: 14 },
    { header: 'Commitment Fee Rate', key: 'commitmentFeeRate', width: 16, numFmt: PERCENT_FMT, isPercent: true },
    { header: 'Commitment Fee Basis', key: 'commitmentFeeBasis', width: 18 },
    { header: 'Initial Facility', key: 'initialFacility', width: 16 },
    { header: 'RED IV Start Date', key: 'redIVStartDate', width: 18, isDate: true },
    { header: 'Start Date', key: 'startDate', width: 16, isDate: true },
    { header: 'Maturity Date', key: 'maturityDate', width: 16, isDate: true },
    { header: 'Duration (yrs)', key: 'duration', width: 12, numFmt: NUMBER_FMT },
    { header: 'Rental Income', key: 'rentalIncome', width: 16, numFmt: CURRENCY_FMT, isCurrency: true },
    { header: 'Valuation', key: 'valuation', width: 18, numFmt: CURRENCY_FMT, isCurrency: true },
    { header: 'Valuation Date', key: 'valuationDate', width: 16, isDate: true },
    { header: 'LTV', key: 'ltv', width: 10, numFmt: PERCENT_FMT, isPercent: true },
    { header: 'Remarks', key: 'remarks', width: 40 },
    { header: 'AFAS Debtor', key: 'afasDebtor', width: 14 },
    { header: 'Borrower Email', key: 'borrowerEmail', width: 30 },
    { header: 'Borrower Address', key: 'borrowerAddress', width: 30 },
    { header: 'Property Address', key: 'propertyAddress', width: 30 },
    { header: 'Google Maps', key: 'googleMapsUrl', width: 30 },
    { header: 'Kadastrale Kaart', key: 'kadastraleKaartUrl', width: 30 },
    { header: 'Photo', key: 'photoUrl', width: 30 },
    { header: 'Additional Info', key: 'additionalInfo', width: 60 },
    { header: 'Notice Frequency', key: 'noticeFrequency', width: 16 },
    { header: 'Payment Due Rule', key: 'paymentDueRule', width: 20 },
    { header: 'Loan Status', key: 'loanStatus', width: 12 },
    { header: 'Created', key: 'createdAt', width: 16, isDate: true },
  ];

  ws.columns = FULL_COLUMNS.map(col => ({ header: col.header, key: col.key, width: col.width }));
  styleHeaderRow(ws, 1);

  for (const { loan, events } of loansWithEvents) {
    const state = getLoanStateAtDate(events, asOfDate, loan.total_commitment ?? 0, loan.interest_type ?? 'cash_pay');
    const outstanding = state.outstandingPrincipal;
    const commitment = state.totalCommitment || loan.total_commitment || 0;
    const hasCommitment = commitment > 0 && commitment !== outstanding;

    const excelRow = ws.addRow({
      loanId: loan.loan_id,
      borrowerName: loan.borrower_name || '',
      vehicle: loan.vehicle || '',
      facility: loan.facility || '',
      city: loan.city || '',
      category: loan.category || '',
      propertyStatus: loan.property_status || '',
      earmarked: loan.earmarked ? 'TRUE' : 'FALSE',
      commitment: hasCommitment ? commitment : '',
      outstanding,
      undrawn: hasCommitment ? commitment - outstanding : '',
      interestRate: state.currentRate,
      interestType: loan.interest_type || '',
      feePaymentType: loan.fee_payment_type || '',
      cashInterestPct: loan.cash_interest_percentage ?? '',
      commitmentFeeRate: loan.commitment_fee_rate ?? '',
      commitmentFeeBasis: loan.commitment_fee_basis || '',
      initialFacility: loan.initial_facility || '',
      redIVStartDate: toExcelDate(loan.red_iv_start_date || null),
      startDate: toExcelDate(loan.loan_start_date || null),
      maturityDate: toExcelDate(loan.maturity_date || null),
      duration: computeDuration(loan.maturity_date, asOfDate) ?? '',
      rentalIncome: loan.rental_income ?? '',
      valuation: loan.valuation ?? '',
      valuationDate: toExcelDate(loan.valuation_date || null),
      ltv: loan.ltv ?? '',
      remarks: loan.remarks || '',
      afasDebtor: loan.afas_debtor_account || '',
      borrowerEmail: loan.borrower_email || '',
      borrowerAddress: loan.borrower_address || '',
      propertyAddress: loan.property_address || '',
      googleMapsUrl: loan.google_maps_url || '',
      kadastraleKaartUrl: loan.kadastrale_kaart_url || '',
      photoUrl: loan.photo_url || '',
      additionalInfo: loan.additional_info || '',
      noticeFrequency: loan.notice_frequency || '',
      paymentDueRule: loan.payment_due_rule || '',
      loanStatus: loan.status || '',
      createdAt: toExcelDate(loan.created_at || null),
    });

    applyFormats(excelRow, FULL_COLUMNS);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const dateStr = asOfDate.replace(/-/g, '');
  triggerDownload(buffer, `Loan_Export_${vehicle.replace(/\s+/g, '_')}_${dateStr}_full.xlsx`);
}

// ── Legacy export (kept for Loans page button) ──────────────────

export async function downloadLoanTapeXlsx(
  loansWithEvents: LoanWithEvents[],
  asOfDate: string,
  vehicle: string
) {
  const data = buildLoanTapeData(loansWithEvents, asOfDate);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'RAX Finance Loan Tool';
  wb.created = new Date();

  const ws = wb.addWorksheet(vehicle, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = COLUMNS.map(col => ({ header: col.header, key: col.key, width: col.width }));
  styleHeaderRow(ws, 1);

  for (const row of data) {
    const excelRow = ws.addRow(buildRowValues(row, COLUMNS));
    applyFormats(excelRow, COLUMNS);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split('T')[0];
  triggerDownload(buffer, `Loan_Tape_${vehicle.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}
