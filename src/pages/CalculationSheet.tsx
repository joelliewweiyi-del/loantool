import { useState, useMemo } from 'react';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';
import { getCurrentDate } from '@/lib/simulatedDate';
import { useCalculationSheet, CalcSheetRow } from '@/hooks/useCalculationSheet';
import { exportCalculationSheet } from '@/lib/exportCalculationSheet';
import { formatCurrency, formatPercent, formatDate } from '@/lib/format';
import { FinancialStrip } from '@/components/loans/FinancialStrip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function CalculationSheet() {
  const [currentMonth, setCurrentMonth] = useState(() =>
    format(startOfMonth(getCurrentDate()), 'yyyy-MM')
  );

  const displayMonth = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    return format(new Date(year, month - 1), 'MMMM yyyy');
  }, [currentMonth]);

  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    setCurrentMonth(format(subMonths(new Date(year, month - 1), 1), 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    setCurrentMonth(format(addMonths(new Date(year, month - 1), 1), 'yyyy-MM'));
  };

  const { data, isLoading } = useCalculationSheet(currentMonth);

  const handleExport = () => {
    if (data) exportCalculationSheet(data);
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Calculation Sheet</h1>
          <p className="text-sm text-foreground-secondary">
            Full interest and commitment fee breakdown with formulas — verify every number
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-[130px] text-center">{displayMonth}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!data || data.rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      {data && (
        <FinancialStrip
          items={[
            { label: 'Loans', value: String(data.loanCount), mono: true },
            { label: 'Total Interest', value: formatCurrency(data.totalInterest), mono: true },
            { label: 'Total Commit. Fees', value: formatCurrency(data.totalCommitmentFee), mono: true },
            { label: 'Total Due', value: formatCurrency(data.totalDue), mono: true, accent: true },
          ]}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10" />)}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="text-center py-16 text-foreground-muted">
          No periods found for {displayMonth}.
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-260px)]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-primary text-primary-foreground text-xs uppercase tracking-wide">
                <th className="px-3 py-2.5 text-left font-semibold">Loan</th>
                <th className="px-3 py-2.5 text-left font-semibold">Borrower</th>
                <th className="px-3 py-2.5 text-left font-semibold">Type</th>
                <th className="px-3 py-2.5 text-center font-semibold">Seg</th>
                <th className="px-3 py-2.5 text-left font-semibold">From</th>
                <th className="px-3 py-2.5 text-left font-semibold">To</th>
                <th className="px-3 py-2.5 text-right font-semibold">Days</th>
                <th className="px-3 py-2.5 text-right font-semibold">Base Amount</th>
                <th className="px-3 py-2.5 text-right font-semibold">Rate</th>
                <th className="px-3 py-2.5 text-left font-semibold">Calculation</th>
                <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                <th className="px-3 py-2.5 text-right font-semibold">Int. Total</th>
                <th className="px-3 py-2.5 text-right font-semibold">Fee Total</th>
                <th className="px-3 py-2.5 text-right font-semibold">Period Total</th>
                <th className="px-3 py-2.5 text-left font-semibold">Event / Note</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <CalcRow key={i} row={row} />
              ))}
            </tbody>
          </table>
        </ScrollArea>
      )}
    </div>
  );
}

function CalcRow({ row }: { row: CalcSheetRow }) {
  if (row.rowType === 'interest' || row.rowType === 'commitment_fee') {
    return <SegmentRow row={row} />;
  }
  if (row.rowType === 'loan_subtotal') {
    return <SubtotalRow row={row} />;
  }
  if (row.rowType === 'vehicle_subtotal') {
    return <VehicleSubtotalRow row={row} />;
  }
  if (row.rowType === 'grand_total') {
    return <GrandTotalRow row={row} />;
  }
  return null;
}

function SegmentRow({ row }: { row: CalcSheetRow }) {
  const isFirst = row.segmentIndex === 1;
  return (
    <tr className={cn(
      'border-b border-border/40 hover:bg-muted/30',
      row.rowType === 'commitment_fee' && 'bg-primary/[0.02]'
    )}>
      <td className="px-3 py-1.5 font-mono font-semibold text-sm">
        {isFirst && (
          <Link to={`/loans/${row.loanUuid}`} className="text-primary hover:underline">
            #{row.loanId}
          </Link>
        )}
      </td>
      <td className="px-3 py-1.5 text-foreground-secondary truncate max-w-[180px]">
        {isFirst ? row.borrowerName : ''}
      </td>
      <td className="px-3 py-1.5">
        <span className={cn(
          'text-xs font-medium px-1.5 py-0.5 rounded',
          row.rowType === 'interest'
            ? row.interestType === 'pik'
              ? 'bg-accent-amber/10 text-accent-amber'
              : 'bg-primary/10 text-primary'
            : 'bg-foreground-muted/10 text-foreground-secondary'
        )}>
          {row.rowType === 'interest'
            ? (row.interestType === 'pik' ? 'Interest (PIK)' : 'Interest')
            : 'Commit. Fee'}
        </span>
      </td>
      <td className="px-3 py-1.5 text-center text-foreground-tertiary font-mono text-xs">
        {row.segmentCount! > 1 ? `${row.segmentIndex}/${row.segmentCount}` : ''}
      </td>
      <td className="px-3 py-1.5 font-mono text-xs">{formatDate(row.segStartDate ?? '')}</td>
      <td className="px-3 py-1.5 font-mono text-xs">{formatDate(row.segEndDate ?? '')}</td>
      <td className="px-3 py-1.5 text-right font-mono">{row.days}</td>
      <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(row.baseAmount ?? 0)}</td>
      <td className="px-3 py-1.5 text-right font-mono">{formatPercent(row.rate ?? 0)}</td>
      <td className="px-3 py-1.5 text-foreground-secondary font-mono text-xs whitespace-nowrap">{row.formula}</td>
      <td className="px-3 py-1.5 text-right font-mono font-semibold">{formatCurrency(row.amount ?? 0)}</td>
      <td className="px-3 py-1.5" />
      <td className="px-3 py-1.5" />
      <td className="px-3 py-1.5" />
      <td className="px-3 py-1.5 text-xs text-foreground-tertiary truncate max-w-[200px]">
        {row.boundaryEvent && (
          <span className="bg-accent-amber/10 text-accent-amber px-1.5 py-0.5 rounded">
            {row.boundaryEvent}
          </span>
        )}
      </td>
    </tr>
  );
}

function SubtotalRow({ row }: { row: CalcSheetRow }) {
  return (
    <tr className="bg-muted/50 border-b-2 border-border/60 font-semibold">
      <td className="px-3 py-2 font-mono">
        <Link to={`/loans/${row.loanUuid}`} className="text-primary hover:underline">
          #{row.loanId}
        </Link>
      </td>
      <td className="px-3 py-2 truncate max-w-[180px]">{row.borrowerName}</td>
      <td className="px-3 py-2 text-xs text-foreground-tertiary" colSpan={2}>
        {row.interestType === 'pik' ? 'PIK' : 'Cash'}
      </td>
      <td className="px-3 py-2 font-mono text-xs">{formatDate(row.periodStart)}</td>
      <td className="px-3 py-2 font-mono text-xs">{formatDate(row.periodEnd)}</td>
      <td className="px-3 py-2" />
      <td className="px-3 py-2 text-right font-mono text-xs text-foreground-secondary">
        {formatCurrency(row.openingPrincipal ?? 0)}
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs text-foreground-secondary">
        {formatPercent(row.openingRate ?? 0)}
      </td>
      <td className="px-3 py-2 text-xs text-foreground-tertiary">
        {row.closingPrincipal !== row.openingPrincipal &&
          `Closing: ${formatCurrency(row.closingPrincipal ?? 0)}`}
      </td>
      <td className="px-3 py-2" />
      <td className="px-3 py-2 text-right font-mono">{formatCurrency(row.totalInterest ?? 0)}</td>
      <td className="px-3 py-2 text-right font-mono">{formatCurrency(row.totalCommitmentFee ?? 0)}</td>
      <td className="px-3 py-2 text-right font-mono text-primary">{formatCurrency(row.totalDue ?? 0)}</td>
      <td className="px-3 py-2">
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded',
          row.periodStatus === 'approved' || row.periodStatus === 'sent' || row.periodStatus === 'paid'
            ? 'bg-accent-sage/10 text-accent-sage'
            : row.periodStatus === 'open' || row.periodStatus === 'draft'
              ? 'bg-accent-amber/10 text-accent-amber'
              : 'bg-muted text-foreground-muted'
        )}>
          {row.periodStatus}
        </span>
      </td>
    </tr>
  );
}

function VehicleSubtotalRow({ row }: { row: CalcSheetRow }) {
  return (
    <tr className="bg-primary/5 border-b-2 border-primary/20 font-semibold">
      <td className="px-3 py-2.5" colSpan={11}>
        <span className="text-primary">{row.vehicle} Total</span>
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-primary">{formatCurrency(row.totalInterest ?? 0)}</td>
      <td className="px-3 py-2.5 text-right font-mono text-primary">{formatCurrency(row.totalCommitmentFee ?? 0)}</td>
      <td className="px-3 py-2.5 text-right font-mono text-primary font-bold">{formatCurrency(row.totalDue ?? 0)}</td>
      <td className="px-3 py-2.5" />
    </tr>
  );
}

function GrandTotalRow({ row }: { row: CalcSheetRow }) {
  return (
    <tr className="bg-primary text-primary-foreground font-bold">
      <td className="px-3 py-3" colSpan={11}>
        GRAND TOTAL
      </td>
      <td className="px-3 py-3 text-right font-mono">{formatCurrency(row.totalInterest ?? 0)}</td>
      <td className="px-3 py-3 text-right font-mono">{formatCurrency(row.totalCommitmentFee ?? 0)}</td>
      <td className="px-3 py-3 text-right font-mono">{formatCurrency(row.totalDue ?? 0)}</td>
      <td className="px-3 py-3" />
    </tr>
  );
}
