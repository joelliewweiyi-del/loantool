import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllRentRollEntries } from '@/hooks/useCovenants';
import { downloadRentRollXlsx } from '@/lib/exportRentRoll';
import { formatCurrency, formatDate } from '@/lib/format';
import { getCurrentDate } from '@/lib/simulatedDate';
import { differenceInDays } from 'date-fns';
import { Building2, Download, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import type { RentRollEntry } from '@/types/loan';

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

function WaltBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const cls = value < 2 ? 'text-destructive' : value < 4 ? 'text-accent-amber' : 'text-accent-sage';
  return <span className={`font-mono tabular-nums font-medium ${cls}`}>{value.toFixed(2)} yr</span>;
}

function LoanRow({ loan }: { loan: ReturnType<typeof useAllRentRollEntries>['data'] extends (infer T)[] | undefined ? T : never }) {
  const [expanded, setExpanded] = useState(false);
  const occupied = loan.entries.filter(e => (e.annual_rent ?? 0) > 0);
  const vacant = loan.entries.filter(e => (e.annual_rent ?? 0) === 0 && e.tenant_name?.toLowerCase().includes('leegstand'));
  const walt = calculateWalt(loan.entries);
  const occ = loan.occupancy != null ? loan.occupancy : null;

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
      >
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">RAX{loan.loanId}</span>
            <span className="text-sm text-muted-foreground truncate">{loan.borrowerName}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{loan.city}</span>
            <span>{occupied.length} tenants</span>
            {vacant.length > 0 && <span className="text-accent-amber">{vacant.length} vacant</span>}
            {occ !== null && <span>Occ. {(occ * 100).toFixed(0)}%</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-sm tabular-nums font-medium">{formatCurrency(loan.totalRent)}</div>
          <div className="text-xs mt-0.5">WALT: <WaltBadge value={walt} /></div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="text-left py-1 font-medium">Tenant</th>
                <th className="text-right py-1 font-medium">Rent</th>
                <th className="text-right py-1 font-medium">%</th>
                <th className="text-right py-1 font-medium">End</th>
                <th className="text-right py-1 font-medium">Rem.</th>
              </tr>
            </thead>
            <tbody>
              {loan.entries.map(entry => {
                const pct = loan.totalRent > 0 && entry.annual_rent
                  ? ((entry.annual_rent / loan.totalRent) * 100).toFixed(1)
                  : null;
                const yrs = remainingYears(entry.lease_end);
                const isVacant = (entry.annual_rent ?? 0) === 0;
                const expired = yrs !== null && yrs <= 0;

                return (
                  <tr key={entry.id} className={isVacant ? 'text-muted-foreground' : ''}>
                    <td className="py-0.5 max-w-[180px] truncate" title={entry.notes || undefined}>
                      {entry.tenant_name || '—'}
                    </td>
                    <td className="text-right font-mono tabular-nums py-0.5">
                      {entry.annual_rent ? formatCurrency(entry.annual_rent) : '—'}
                    </td>
                    <td className="text-right font-mono tabular-nums text-muted-foreground py-0.5">
                      {pct ? `${pct}%` : ''}
                    </td>
                    <td className="text-right py-0.5">
                      {entry.lease_end ? formatDate(entry.lease_end) : '—'}
                    </td>
                    <td className={`text-right font-mono tabular-nums py-0.5 ${expired ? 'text-destructive' : yrs !== null && yrs < 2 ? 'text-accent-amber' : ''}`}>
                      {expired ? 'Exp.' : yrs !== null ? `${yrs.toFixed(1)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RentRollPanel() {
  const { data: loans, isLoading } = useAllRentRollEntries();
  const [exporting, setExporting] = useState(false);

  const totalRent = (loans ?? []).reduce((s, l) => s + l.totalRent, 0);
  const totalTenants = (loans ?? []).reduce((s, l) => s + l.entries.filter(e => (e.annual_rent ?? 0) > 0).length, 0);
  const loansWithData = (loans ?? []).filter(l => l.entries.length > 0);

  const handleExport = async () => {
    if (!loansWithData.length) return;
    setExporting(true);
    try {
      await downloadRentRollXlsx(loansWithData);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <Building2 className="h-4 w-4 mr-2" />
          Huurlijst
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[520px] sm:max-w-[520px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <SheetTitle className="text-base">Huurlijst Overview</SheetTitle>
          <div className="flex items-center justify-between mt-1">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{loansWithData.length} loans</span>
              <span>{totalTenants} tenants</span>
              <span className="font-mono font-medium text-foreground">{formatCurrency(totalRent)}</span>
            </div>
            <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting || !loansWithData.length}>
              {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
              {exporting ? 'Exporting…' : 'Export .xlsx'}
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : loansWithData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No rent roll data available.</div>
          ) : (
            loansWithData.map(loan => <LoanRow key={loan.loanUuid} loan={loan} />)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
