import { useMemo } from 'react';
import { useRentRollEntries } from '@/hooks/useCovenants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FinancialStrip } from '@/components/loans/FinancialStrip';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCurrentDate } from '@/lib/simulatedDate';
import { differenceInDays } from 'date-fns';
import type { RentRollEntry } from '@/types/loan';

interface RentRollTabProps {
  loanId: string;
  occupancy?: number | null;
}

/** Calculate remaining years from today to lease_end. Returns null if no end date. */
function remainingYears(leaseEnd: string | null): number | null {
  if (!leaseEnd) return null;
  const now = getCurrentDate();
  const end = new Date(leaseEnd);
  if (end <= now) return 0;
  return differenceInDays(end, now) / 365.25;
}

/**
 * WALT = Σ(rent_i × remaining_years_i) / Σ(rent_i)
 * Only includes tenants with positive rent and a lease_end date.
 */
function calculateWalt(entries: RentRollEntry[]): { walt: number | null; coverage: number } {
  let weightedSum = 0;
  let rentSum = 0;
  let coveredRent = 0;

  for (const e of entries) {
    const rent = e.annual_rent ?? 0;
    if (rent <= 0) continue;
    const yrs = remainingYears(e.lease_end);
    if (yrs !== null) {
      weightedSum += rent * yrs;
      coveredRent += rent;
    }
    rentSum += rent;
  }

  return {
    walt: coveredRent > 0 ? weightedSum / coveredRent : null,
    coverage: rentSum > 0 ? coveredRent / rentSum : 0,
  };
}


export function RentRollTab({ loanId, occupancy: loanOccupancy }: RentRollTabProps) {
  const { data, isLoading } = useRentRollEntries(loanId);
  const isMobile = useIsMobile();

  const metrics = useMemo(() => {
    if (!data) return null;
    const occupied = data.entries.filter(e => (e.annual_rent ?? 0) > 0);
    const vacantEntries = data.entries.filter(e => (e.annual_rent ?? 0) === 0 && e.tenant_name?.toLowerCase().includes('leegstand'));
    const vacantSqm = vacantEntries.reduce((s, e) => s + (e.sqm || 0), 0);
    const { walt, coverage } = calculateWalt(data.entries);

    return { occupied, vacantCount: vacantEntries.length, vacantSqm, walt, coverage };
  }, [data]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!data || data.entries.length === 0 || !metrics) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No rent roll data available for this loan.
        </CardContent>
      </Card>
    );
  }

  const { occupied, vacantCount, vacantSqm, walt, coverage } = metrics;
  const totalSqm = data.totalSqm;
  const occupancyRate = loanOccupancy != null ? loanOccupancy : null;
  const source = data.metadata?.source as string | undefined;

  // Separate occupied entries from leegstand; leegstand gets grouped into one row
  const occupiedEntries = data.entries.filter(e => !((e.annual_rent ?? 0) === 0 && e.tenant_name?.toLowerCase().includes('leegstand')));

  return (
    <div className="space-y-4">
      {/* Primary strip */}
      <FinancialStrip items={[
        { label: 'Period', value: data.periodLabel },
        { label: 'Total Rent', value: formatCurrency(data.totalRent), mono: true },
        { label: 'Tenants', value: `${occupied.length}` },
        ...(walt !== null ? [{
          label: `WALT${coverage < 1 ? ` (${(coverage * 100).toFixed(0)}%)` : ''}`,
          value: `${walt.toFixed(2)} yr`,
          accent: walt < 2 ? 'destructive' as const : walt < 4 ? 'amber' as const : 'sage' as const,
        }] : []),
        ...(totalSqm > 0 ? [{ label: 'Total m²', value: totalSqm.toLocaleString('nl-NL') }] : []),
        ...(occupancyRate !== null ? [{ label: 'Occupancy', value: `${(occupancyRate * 100).toFixed(1)}%`, accent: occupancyRate >= 0.95 ? 'sage' as const : 'amber' as const }] : []),
        ...(vacantCount > 0 ? [{ label: 'Vacant', value: `${vacantCount} units`, accent: 'amber' as const }] : []),
      ]} />


      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tenant Breakdown</CardTitle>
          <CardDescription>
            Received {data.receivedAt ? formatDate(data.receivedAt) : '—'}
            {source ? ` · ${source}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isMobile ? (
            <div className="divide-y">
              {occupiedEntries.map((entry) => {
                const yrs = remainingYears(entry.lease_end);
                return (
                  <div key={entry.id} className="px-4 py-3 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm">{entry.tenant_name || '—'}</span>
                      <span className="font-mono text-sm tabular-nums">
                        {entry.annual_rent ? formatCurrency(entry.annual_rent) : '—'}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {entry.sqm && <span>{entry.sqm.toLocaleString('nl-NL')} m²</span>}
                      {entry.lease_end && <span>→ {formatDate(entry.lease_end)}</span>}
                      {yrs !== null && <span className="font-mono">{yrs.toFixed(1)}yr</span>}
                    </div>
                  </div>
                );
              })}
              {vacantCount > 0 && (
                <div className="px-4 py-3 space-y-1 text-muted-foreground">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm">Leegstand ({vacantCount} units)</span>
                    <span className="font-mono text-sm tabular-nums">—</span>
                  </div>
                  {vacantSqm > 0 && (
                    <div className="flex gap-3 text-xs">
                      <span>{vacantSqm.toLocaleString('nl-NL')} m²</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="text-left">Tenant</th>
                    <th className="text-right">m²</th>
                    <th className="text-right">Annual Rent</th>
                    <th className="text-right">% of Total</th>
                    <th className="text-left">Lease End</th>
                    <th className="text-right">Remaining</th>
                    <th className="text-left">Notice</th>
                    <th className="text-left">Renewal</th>
                  </tr>
                </thead>
                <tbody>
                  {occupiedEntries.map((entry) => {
                    const pct = data.totalRent > 0 && entry.annual_rent
                      ? ((entry.annual_rent / data.totalRent) * 100).toFixed(1)
                      : null;
                    const yrs = remainingYears(entry.lease_end);
                    const expired = yrs !== null && yrs <= 0;

                    return (
                      <tr key={entry.id}>
                        <td className="font-medium max-w-[240px]">
                          <div className="truncate" title={entry.notes || undefined}>
                            {entry.tenant_name || '—'}
                          </div>
                        </td>
                        <td className="text-right font-mono tabular-nums">
                          {entry.sqm ? entry.sqm.toLocaleString('nl-NL') : '—'}
                        </td>
                        <td className="text-right font-mono tabular-nums">
                          {entry.annual_rent ? formatCurrency(entry.annual_rent) : '—'}
                        </td>
                        <td className="text-right font-mono tabular-nums text-muted-foreground">
                          {pct ? `${pct}%` : '—'}
                        </td>
                        <td>{entry.lease_end ? formatDate(entry.lease_end) : '—'}</td>
                        <td className={`text-right font-mono tabular-nums ${expired ? 'text-destructive' : yrs !== null && yrs < 2 ? 'text-accent-amber' : ''}`}>
                          {expired ? 'Expired' : yrs !== null ? `${yrs.toFixed(1)} yr` : '—'}
                        </td>
                        <td className="text-xs">{entry.notice_period || '—'}</td>
                        <td className="text-xs">{entry.renewal_period || '—'}</td>
                      </tr>
                    );
                  })}
                  {vacantCount > 0 && (
                    <tr className="text-muted-foreground">
                      <td className="font-medium">Leegstand ({vacantCount} units)</td>
                      <td className="text-right font-mono tabular-nums">
                        {vacantSqm > 0 ? vacantSqm.toLocaleString('nl-NL') : '—'}
                      </td>
                      <td className="text-right font-mono tabular-nums">—</td>
                      <td className="text-right">—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="font-semibold border-t-2">
                    <td>Total / WALT</td>
                    <td className="text-right font-mono tabular-nums">
                      {totalSqm > 0 ? totalSqm.toLocaleString('nl-NL') : '—'}
                    </td>
                    <td className="text-right font-mono tabular-nums">
                      {formatCurrency(data.totalRent)}
                    </td>
                    <td className="text-right font-mono tabular-nums">100%</td>
                    <td></td>
                    <td className="text-right font-mono tabular-nums">
                      {walt !== null ? `${walt.toFixed(2)} yr` : '—'}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
