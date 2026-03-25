import ExcelJS from 'exceljs';
import type { RentRollEntry } from '@/types/loan';
import { getCurrentDate } from './simulatedDate';
import { differenceInDays } from 'date-fns';

interface LoanRentRoll {
  loanId: string;
  borrowerName: string;
  city: string;
  occupancy?: number | null;
  periodLabel: string;
  entries: RentRollEntry[];
  totalRent: number;
  totalSqm: number;
}

function remainingYears(leaseEnd: string | null): number | null {
  if (!leaseEnd) return null;
  const now = getCurrentDate();
  const end = new Date(leaseEnd);
  if (end <= now) return 0;
  return differenceInDays(end, now) / 365.25;
}

function calculateWalt(entries: RentRollEntry[]): number | null {
  let weightedSum = 0;
  let rentSum = 0;
  for (const e of entries) {
    const rent = e.annual_rent ?? 0;
    if (rent <= 0 || !e.lease_end) continue;
    const yrs = remainingYears(e.lease_end);
    if (yrs !== null && yrs > 0) {
      weightedSum += rent * yrs;
      rentSum += rent;
    }
  }
  return rentSum > 0 ? weightedSum / rentSum : null;
}

export async function downloadRentRollXlsx(loans: LoanRentRoll[]) {
  const wb = new ExcelJS.Workbook();

  // ── Summary sheet ──
  const summary = wb.addWorksheet('Summary');
  const summaryHeaders = ['Loan ID', 'Borrower', 'City', 'Period', 'Tenants', 'Annual Rent', 'Total m²', 'WALT (yr)', 'Occupancy'];
  const headerRow = summary.addRow(summaryHeaders);
  headerRow.font = { bold: true, size: 10 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003B5C' } };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };

  let grandTotalRent = 0;
  let grandTotalSqm = 0;

  for (const loan of loans) {
    const occupied = loan.entries.filter(e => (e.annual_rent ?? 0) > 0);
    const walt = calculateWalt(loan.entries);
    const occ = loan.occupancy != null ? loan.occupancy : null;
    grandTotalRent += loan.totalRent;
    grandTotalSqm += loan.totalSqm;

    summary.addRow([
      loan.loanId,
      loan.borrowerName,
      loan.city,
      loan.periodLabel,
      occupied.length,
      loan.totalRent,
      loan.totalSqm || null,
      walt !== null ? Math.round(walt * 100) / 100 : null,
      occ !== null ? occ : null,
    ]);
  }

  // Grand total
  const totalRow = summary.addRow(['', '', '', 'TOTAL', loans.reduce((s, l) => s + l.entries.filter(e => (e.annual_rent ?? 0) > 0).length, 0), grandTotalRent, grandTotalSqm || null, null, null]);
  totalRow.font = { bold: true, size: 10 };

  // Format columns
  summary.getColumn(6).numFmt = '#,##0';
  summary.getColumn(7).numFmt = '#,##0';
  summary.getColumn(8).numFmt = '0.00';
  summary.getColumn(9).numFmt = '0.0%';
  summary.columns.forEach(col => { col.width = 16; });
  summary.getColumn(1).width = 10;
  summary.getColumn(2).width = 28;
  summary.getColumn(3).width = 20;

  // ── Per-loan sheets ──
  for (const loan of loans) {
    if (loan.entries.length === 0) continue;
    const name = `RAX${loan.loanId}`.slice(0, 31);
    const ws = wb.addWorksheet(name);

    const headers = ['Tenant', 'm²', 'Annual Rent', '% of Total', 'Lease Start', 'Lease End', 'Remaining (yr)', 'Notice', 'Renewal', 'Notes'];
    const hRow = ws.addRow(headers);
    hRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003B5C' } };

    for (const entry of loan.entries) {
      const pct = loan.totalRent > 0 && entry.annual_rent ? entry.annual_rent / loan.totalRent : null;
      const yrs = remainingYears(entry.lease_end);

      ws.addRow([
        entry.tenant_name || '—',
        entry.sqm || null,
        entry.annual_rent || null,
        pct,
        entry.lease_start || null,
        entry.lease_end || null,
        yrs !== null ? Math.round(yrs * 100) / 100 : null,
        entry.notice_period || null,
        entry.renewal_period || null,
        entry.notes || null,
      ]);
    }

    // Totals
    const walt = calculateWalt(loan.entries);
    const tRow = ws.addRow([
      'Total / WALT',
      loan.totalSqm || null,
      loan.totalRent,
      1,
      null,
      null,
      walt !== null ? Math.round(walt * 100) / 100 : null,
      null,
      null,
      null,
    ]);
    tRow.font = { bold: true };

    ws.getColumn(3).numFmt = '#,##0';
    ws.getColumn(4).numFmt = '0.0%';
    ws.getColumn(7).numFmt = '0.00';
    ws.getColumn(2).numFmt = '#,##0';
    ws.columns.forEach(col => { col.width = 14; });
    ws.getColumn(1).width = 35;
    ws.getColumn(10).width = 50;
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Huurlijst_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
