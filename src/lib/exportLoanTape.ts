import ExcelJS from 'exceljs';
import { Loan, LoanEvent } from '@/types/loan';
import { getLoanStateAtDate } from './loanCalculations';
import { differenceInDays, parseISO } from 'date-fns';
import { getPipelineStage } from './constants';

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
  facility: string;
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
  pipelineStage: string | null;
  walt: number | null;
  waltComment: string | null;
  // Extra fields for detailed / full exports
  occupancy: number | null;
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
      facility: loan.facility || '',
      initialFacility: loan.initial_facility || '',
      commitment: effectiveCommitment > 0 ? effectiveCommitment : null,
      outstanding,
      undrawn,
      interestRate: state.currentRate || loan.interest_rate || 0,
      redIVStartDate: loan.red_iv_start_date || null,
      originalStartDate: loan.loan_start_date || null,
      maturityDate: loan.maturity_date || null,
      rentalIncome: loan.rental_income,
      valuation: loan.valuation,
      valuationDate: loan.valuation_date || null,
      ltv: loan.valuation ? Math.max(effectiveCommitment, outstanding) / loan.valuation : null,
      duration: computeDuration(loan.maturity_date, asOfDate),
      pipelineStage: loan.pipeline_stage || null,
      walt: loan.walt,
      waltComment: loan.walt_comment || '',
      occupancy: loan.occupancy,
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

const DEFAULT_FONT: Partial<ExcelJS.Font> = {
  name: 'Barlow',
  size: 10,
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  ...DEFAULT_FONT,
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

const GROUP_FONT: Partial<ExcelJS.Font> = {
  ...DEFAULT_FONT,
  bold: true,
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
  { header: 'WALT', key: 'walt', width: 10, numFmt: NUMBER_FMT },
  { header: 'WALT Comment', key: 'waltComment', width: 30 },
  { header: 'Occupancy', key: 'occupancy', width: 12, numFmt: PERCENT_FMT, isPercent: true },
];

// Detailed: current 20 + 4 extra
const DETAILED_COLUMNS: ColDef[] = [
  ...COLUMNS,
  { header: 'Occupancy', key: 'occupancy', width: 12, numFmt: PERCENT_FMT, isPercent: true },
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
    cell.font = DEFAULT_FONT;
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
  const byStartDate = (a: LoanTapeData, b: LoanTapeData) =>
    (a.originalStartDate || '').localeCompare(b.originalStartDate || '');
  const incomeProducing = data.filter(d => d.earmarked).sort(byStartDate);
  const nonIncomeProducing = data.filter(d => !d.earmarked).sort(byStartDate);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'RAX Finance Loan Tool';
  wb.created = new Date();

  const ws = wb.addWorksheet('Loan Tape', {
    views: [{ state: 'frozen', ySplit: 2, showGridLines: false }],
  });

  const cols = SUMMARY_COLUMNS;

  // Set column widths (col A is pipeline indicator, data starts at B)
  ws.getColumn(1).width = 14;
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
    const isPipeline = item.currentFacility === 'Pipeline';
    const stage = isPipeline ? getPipelineStage(item.pipelineStage) : null;
    const pipelineLabel = stage ? `${stage.label} Pipeline` : isPipeline ? 'Pipeline' : null;
    const values: unknown[] = [pipelineLabel]; // col A: pipeline indicator
    for (const col of cols) {
      const v = (item as any)[col.key];
      if (col.isDate) values.push(toExcelDate(v));
      else if (col.key === 'earmarked') values.push(v ? 'TRUE' : 'FALSE');
      else values.push(v ?? '');
    }
    const row = ws.addRow(values);
    if (pipelineLabel) {
      const cellA = row.getCell(1);
      cellA.font = { ...DEFAULT_FONT, italic: true, color: { argb: 'FF888888' } };
    }
    cols.forEach((col, i) => {
      const cell = row.getCell(i + 2);
      cell.font = DEFAULT_FONT;
      if (col.key === 'loanId') cell.alignment = { horizontal: 'center' };
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
    const rateCol = colLetterOf('interestRate');
    const ltvCol = colLetterOf('ltv');
    const durCol = colLetterOf('duration');
    const waltCol = colLetterOf('walt');
    const occCol = colLetterOf('occupancy');

    cols.forEach((col, i) => {
      const cell = row.getCell(i + 2);
      const letter = colLetter(i);
      const range = `${letter}${firstDataRow}:${letter}${lastDataRow}`;

      if (col.key === 'loanId') {
        // COUNTA for number of loans
        cell.value = { formula: `COUNTA(${range})` } as any;
        cell.alignment = { horizontal: 'center' };
      } else if (col.key === 'commitment' || col.key === 'outstanding' || col.key === 'undrawn' || col.key === 'rentalIncome' || col.key === 'valuation') {
        cell.value = { formula: `SUM(${range})` } as any;
      } else if (col.key === 'ltv') {
        // Weighted average LTV by commitment
        const ltvRange = `${ltvCol}${firstDataRow}:${ltvCol}${lastDataRow}`;
        const commitRange = `${commitCol}${firstDataRow}:${commitCol}${lastDataRow}`;
        cell.value = { formula: `IFERROR(SUMPRODUCT(${ltvRange},${commitRange})/SUM(${commitRange}),"")` } as any;
      } else if (col.key === 'interestRate') {
        // Weighted average Interest Rate by commitment
        const rateRange = `${rateCol}${firstDataRow}:${rateCol}${lastDataRow}`;
        const commitRange = `${commitCol}${firstDataRow}:${commitCol}${lastDataRow}`;
        cell.value = { formula: `IFERROR(SUMPRODUCT(${rateRange},${commitRange})/SUM(${commitRange}),"")` } as any;
      } else if (col.key === 'duration') {
        // Weighted average Duration by commitment
        const durRange = `${durCol}${firstDataRow}:${durCol}${lastDataRow}`;
        const commitRange = `${commitCol}${firstDataRow}:${commitCol}${lastDataRow}`;
        cell.value = { formula: `IFERROR(SUMPRODUCT(${durRange},${commitRange})/SUM(${commitRange}),"")` } as any;
      } else if (col.key === 'walt') {
        // Weighted average WALT by commitment
        const waltRange = `${waltCol}${firstDataRow}:${waltCol}${lastDataRow}`;
        const commitRange = `${commitCol}${firstDataRow}:${commitCol}${lastDataRow}`;
        cell.value = { formula: `IFERROR(SUMPRODUCT(${waltRange},${commitRange})/SUM(${commitRange}),"")` } as any;
      } else if (col.key === 'occupancy') {
        // Weighted average Occupancy by commitment
        const occRange = `${occCol}${firstDataRow}:${occCol}${lastDataRow}`;
        const commitRange = `${commitCol}${firstDataRow}:${commitCol}${lastDataRow}`;
        cell.value = { formula: `IFERROR(SUMPRODUCT(${occRange},${commitRange})/SUM(${commitRange}),"")` } as any;
      } else {
        cell.value = '';
      }

      if (col.numFmt && col.key !== 'loanId') cell.numFmt = col.numFmt;
    });

    row.eachCell((cell, colNumber) => {
      if (colNumber >= 2) {
        cell.font = GROUP_FONT;
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
    const rateCol = colLetterOf('interestRate');
    const ltvCol = colLetterOf('ltv');
    const durCol = colLetterOf('duration');
    const waltCol = colLetterOf('walt');
    const occCol = colLetterOf('occupancy');

    // Helper to build weighted average formula across IP + NIP ranges
    const weightedAvgFormula = (valCol: string) => {
      const groups: { first: number; last: number }[] = [];
      if (incomeProducing.length > 0) groups.push({ first: ipFirstRow, last: ipLastRow });
      if (nonIncomeProducing.length > 0) groups.push({ first: nipFirstRow, last: nipLastRow });
      const commitParts = groups.map(src => ({
        val: `${valCol}${src.first}:${valCol}${src.last}`,
        commit: `${commitCol}${src.first}:${commitCol}${src.last}`,
      }));
      const sumProd = commitParts.map(p => `SUMPRODUCT(${p.val},${p.commit})`).join('+');
      const sumCommit = commitParts.map(p => `SUM(${p.commit})`).join('+');
      return `IFERROR((${sumProd})/(${sumCommit}),"")`;
    };

    cols.forEach((col, i) => {
      const cell = row.getCell(i + 2);
      const letter = colLetter(i);
      const rangeIP = incomeProducing.length > 0 ? `${letter}${ipFirstRow}:${letter}${ipLastRow}` : '';
      const rangeNIP = nonIncomeProducing.length > 0 ? `${letter}${nipFirstRow}:${letter}${nipLastRow}` : '';

      // Build combined range parts
      const parts = [rangeIP, rangeNIP].filter(Boolean);

      if (col.key === 'loanId') {
        cell.value = { formula: parts.map(r => `COUNTA(${r})`).join('+') || '0' } as any;
        cell.alignment = { horizontal: 'center' };
      } else if (col.key === 'commitment' || col.key === 'outstanding' || col.key === 'undrawn' || col.key === 'rentalIncome' || col.key === 'valuation') {
        cell.value = { formula: parts.map(r => `SUM(${r})`).join('+') || '0' } as any;
      } else if (col.key === 'interestRate') {
        cell.value = { formula: weightedAvgFormula(rateCol) } as any;
      } else if (col.key === 'ltv') {
        cell.value = { formula: weightedAvgFormula(ltvCol) } as any;
      } else if (col.key === 'duration') {
        cell.value = { formula: weightedAvgFormula(durCol) } as any;
      } else if (col.key === 'walt') {
        cell.value = { formula: weightedAvgFormula(waltCol) } as any;
      } else if (col.key === 'occupancy') {
        cell.value = { formula: weightedAvgFormula(occCol) } as any;
      } else {
        cell.value = '';
      }

      if (col.numFmt && col.key !== 'loanId') cell.numFmt = col.numFmt;
    });

    row.eachCell((cell, colNumber) => {
      if (colNumber >= 2) {
        cell.font = GROUP_FONT;
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
  const data = buildLoanTapeData(loansWithEvents, asOfDate)
    .filter(d => d.currentFacility !== 'Pipeline')
    .sort((a, b) => (a.originalStartDate || '').localeCompare(b.originalStartDate || ''));
  const cols = DETAILED_COLUMNS;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'RAX Finance Loan Tool';
  wb.created = new Date();

  const ws = wb.addWorksheet('Loan Tape', {
    views: [{ state: 'frozen', ySplit: 2, showGridLines: false }],
  });

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

  // Column-letter lookup (col B = index 0 in cols)
  const colLetter = (colIdx: number) => {
    const n = colIdx + 2;
    return String.fromCharCode(64 + n);
  };
  const colLetterOf = (key: string) => {
    const idx = cols.findIndex(c => c.key === key);
    return idx >= 0 ? colLetter(idx) : '';
  };

  const firstDataRow = ws.rowCount + 1;
  for (const item of data) {
    const values: unknown[] = [''];
    for (const col of cols) {
      const v = (item as any)[col.key];
      if (col.isDate) values.push(toExcelDate(v));
      else if (col.key === 'earmarked') values.push(v ? 'TRUE' : 'FALSE');
      else values.push(v ?? '');
    }
    const row = ws.addRow(values);
    cols.forEach((col, i) => {
      const cell = row.getCell(i + 2);
      cell.font = DEFAULT_FONT;
      if (col.key === 'loanId') cell.alignment = { horizontal: 'center' };
      if (col.numFmt && cell.value !== '' && cell.value != null) cell.numFmt = col.numFmt;
      if (col.isDate && cell.value instanceof Date) cell.numFmt = DATE_FMT;
    });
  }
  const lastDataRow = ws.rowCount;

  // Summary row
  if (data.length > 0) {
    const commitCol = colLetterOf('commitment');

    const sumRow = ws.addRow([]);
    cols.forEach((col, i) => {
      const cell = sumRow.getCell(i + 2);
      const letter = colLetter(i);
      const range = `${letter}${firstDataRow}:${letter}${lastDataRow}`;

      if (col.key === 'loanId') {
        cell.value = { formula: `COUNTA(${range})` } as any;
        cell.alignment = { horizontal: 'center' };
      } else if (col.key === 'commitment' || col.key === 'outstanding' || col.key === 'undrawn' || col.key === 'rentalIncome' || col.key === 'valuation') {
        cell.value = { formula: `SUM(${range})` } as any;
      } else if (col.key === 'interestRate' || col.key === 'ltv' || col.key === 'duration') {
        const valRange = `${letter}${firstDataRow}:${letter}${lastDataRow}`;
        const commitRange = `${commitCol}${firstDataRow}:${commitCol}${lastDataRow}`;
        cell.value = { formula: `IFERROR(SUMPRODUCT(${valRange},${commitRange})/SUM(${commitRange}),"")` } as any;
      } else {
        cell.value = '';
      }

      if (col.numFmt && col.key !== 'loanId') cell.numFmt = col.numFmt;
    });

    sumRow.eachCell((cell, colNumber) => {
      if (colNumber >= 2) {
        cell.font = GROUP_FONT;
        cell.fill = SUBTOTAL_FILL;
      }
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const [yyyy, mm, dd] = asOfDate.split('-');
  // Always label as "RED IV" — TLF loans originate in the RED IV vehicle first,
  // so the detailed tape represents the full RED IV origination portfolio.
  triggerDownload(buffer, `Loan tape RED IV ${dd}-${mm}-${yyyy.slice(2)}.xlsx`);
}

// ── Export 2b: CSV for investor portal ──────────────────────────
// Matches the "Loan Tape RED IV" Supabase table schema used by the
// investor portal. All values are text. EU number format (comma decimal,
// no thousand separator). Semicolon-delimited.

function fmtEuNumber(v: number | null | undefined, decimals = 2): string {
  if (v == null || v === 0) return '';
  return v.toFixed(decimals).replace('.', ',');
}

function fmtEuPercent(v: number | null | undefined): string {
  if (v == null || v === 0) return '';
  return (v * 100).toFixed(2).replace('.', ',') + '%';
}

function fmtDateDDMMYYYY(dateStr: string | null): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

const CSV_COLUMNS = [
  'Loan ID',
  'Outstanding Loan Amount',
  'Total Commitment',
  'Undrawn Amount',
  'Remarks',
  'Facility',
  'City',
  'Status',
  'Duration',
  'LTV',
  'Valuation (as-is)',
  'Rental Income',
  'Maturity',
  'Start Date',
  'Interest Rate',
  'Category',
  'Earmarked',
  'google_maps',
  'kadastralekaart',
  'Photo',
  'Additional Information',
] as const;

export function downloadInvestorPortalCsv(
  loansWithEvents: LoanWithEvents[],
  asOfDate: string,
) {
  const data = buildLoanTapeData(loansWithEvents, asOfDate)
    .filter(d => d.currentFacility !== 'Pipeline')
    .sort((a, b) => (a.originalStartDate || '').localeCompare(b.originalStartDate || ''));

  const escCsv = (v: string) => {
    if (v.includes(';') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const rows = data.map(d => [
    d.loanId,
    fmtEuNumber(d.outstanding),
    fmtEuNumber(d.commitment),
    fmtEuNumber(d.undrawn),
    d.remarks,
    d.facility || d.currentFacility,
    d.city,
    d.status,
    fmtEuNumber(d.duration),
    fmtEuPercent(d.ltv),
    fmtEuNumber(d.valuation),
    fmtEuNumber(d.rentalIncome),
    fmtDateDDMMYYYY(d.maturityDate),
    fmtDateDDMMYYYY(d.originalStartDate),
    fmtEuPercent(d.interestRate),
    d.category,
    d.earmarked ? 'TRUE' : 'FALSE',
    d.googleMapsUrl || '',
    d.kadastraleKaartUrl || '',
    d.photoUrl || '',
    d.additionalInfo || '',
  ].map(v => escCsv(String(v ?? ''))));

  const header = CSV_COLUMNS.map(h => escCsv(h)).join(';');
  const body = rows.map(r => r.join(';')).join('\n');
  const csv = header + '\n' + body;

  // BOM for Excel to detect UTF-8
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const [yyyy, mm, dd] = asOfDate.split('-');
  link.download = `Loan tape RED IV ${dd}-${mm}-${yyyy.slice(2)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
    views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
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
      interestRate: state.currentRate || loan.interest_rate || 0,
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
      ltv: loan.valuation ? Math.max(commitment > 0 ? commitment : outstanding, outstanding) / loan.valuation : '',
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
    views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
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
