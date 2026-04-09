import React, { useState, useMemo } from 'react';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';
import { getCurrentDate } from '@/lib/simulatedDate';
import { VEHICLES } from '@/lib/constants';
import { Link } from 'react-router-dom';
import {
  useMonthlyApprovalAccruals,
  useConfirmPaymentFromApproval,
  EnrichedPeriod,
  PikPeriodStatus,
} from '@/hooks/useMonthlyApprovalAccruals';
import {
  useMonthlyApprovalDraws,
  useConfirmDrawFromApproval,
  type GroupedLoanDraws,
} from '@/hooks/useMonthlyApprovalDraws';
import { useApproveMonth } from '@/hooks/useMonthlyApproval';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/format';
import { FinancialStrip } from '@/components/loans/FinancialStrip';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
  Banknote,
  ArrowUpRight,
  Clock,
  ChevronDown,
  Database,
  Landmark,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AfasDrawTransaction } from '@/types/loan';

export default function MonthlyApproval() {
  const [currentMonth, setCurrentMonth] = useState(() =>
    format(startOfMonth(getCurrentDate()), 'yyyy-MM')
  );
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading } = useMonthlyApprovalAccruals(currentMonth);
  const { data: drawsData, isLoading: drawsLoading } = useMonthlyApprovalDraws(currentMonth);
  const approveMonth = useApproveMonth();
  const confirmPayment = useConfirmPaymentFromApproval(currentMonth);
  const confirmDraw = useConfirmDrawFromApproval(currentMonth);
  const { isController } = useAuth();
  const [expandedAfas, setExpandedAfas] = useState<Set<string>>(new Set());
  const [expandedDrawLoans, setExpandedDrawLoans] = useState<Set<string>>(new Set());
  const [expandedDrawAfas, setExpandedDrawAfas] = useState<Set<string>>(new Set());
  const [typeOverrides, setTypeOverrides] = useState<Map<string, 'draw' | 'repayment'>>(new Map());

  const toggleAfas = (id: string) => {
    setExpandedAfas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleDrawLoan = (loanId: string) => {
    setExpandedDrawLoans(prev => {
      const next = new Set(prev);
      if (next.has(loanId)) next.delete(loanId); else next.add(loanId);
      return next;
    });
  };
  const toggleDrawAfas = (ref: string) => {
    setExpandedDrawAfas(prev => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref); else next.add(ref);
      return next;
    });
  };
  const toggleTypeOverride = (afasRef: string, currentType: 'draw' | 'repayment') => {
    setTypeOverrides(prev => {
      const next = new Map(prev);
      const newType = (next.get(afasRef) ?? currentType) === 'draw' ? 'repayment' : 'draw';
      next.set(afasRef, newType);
      return next;
    });
  };

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

  const handleApprove = async () => {
    await approveMonth.mutateAsync({
      yearMonth: currentMonth,
      notes: approvalNotes || undefined,
    });
    setApprovalNotes('');
    setIsDialogOpen(false);
  };

  const handleConfirm = (period: EnrichedPeriod) => {
    if (!period.afasPayment) return;
    // afasPayment.amount is already the net cash amount
    // (1751 depot debits subtracted in useMonthlyApprovalAccruals)
    confirmPayment.mutate({
      periodId: period.id,
      paymentDate: period.afasPayment.date,
      paymentAmount: period.afasPayment.amount,
      paymentAfasRef: period.afasPayment.ref,
    });
  };

  const handleConfirmDraw = (tx: AfasDrawTransaction) => {
    if (!tx.loanUuid) return;
    const effectiveType = typeOverrides.get(tx.afasRef) ?? tx.type;
    confirmDraw.mutate({
      loanUuid: tx.loanUuid,
      eventType: effectiveType === 'draw' ? 'principal_draw' : 'principal_repayment',
      effectiveDate: tx.entryDate,
      amount: tx.amount,
      afasRef: tx.afasRef,
      afasDescription: tx.description,
    });
  };

  const isApproved = data?.status === 'approved';
  const canApprove = isController && !isApproved && data?.periods && data.periods.length > 0;

  // Group by vehicle
  const groupedByVehicle = useMemo(() => {
    if (!data?.periods) return [];
    const groups = new Map<string, EnrichedPeriod[]>();
    for (const p of data.periods) {
      const v = p.vehicle || 'Other';
      const existing = groups.get(v);
      if (existing) existing.push(p);
      else groups.set(v, [p]);
    }
    const order = VEHICLES.map(v => v.value);
    return [...groups.entries()].sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [data?.periods]);

  // Group draws by vehicle (using loan-grouped data)
  const drawsByVehicle = useMemo(() => {
    if (!drawsData?.groupedByLoan) return [];
    const groups = new Map<string, GroupedLoanDraws[]>();
    for (const group of drawsData.groupedByLoan) {
      const v = group.vehicle || 'Other';
      const existing = groups.get(v);
      if (existing) existing.push(group);
      else groups.set(v, [group]);
    }
    const order = VEHICLES.map(v => v.value);
    return [...groups.entries()].sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [drawsData?.groupedByLoan]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Monthly Approval</h1>
          <p className="text-sm text-foreground-secondary">
            Reconcile calculated interest with AFAS payments
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold min-w-[170px] text-center">
              {displayMonth}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isApproved ? (
            <div className="flex items-center gap-2 text-sm text-accent-sage bg-accent-sage/10 border border-accent-sage/30 rounded px-3 py-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Approved {data?.approved_at && `on ${formatDate(data.approved_at)}`}
            </div>
          ) : canApprove ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve {displayMonth}</DialogTitle>
                  <DialogDescription>
                    This will approve all {data?.totalAllPeriods} periods for this month (including PIK).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4">
                  <div className="bg-muted/50 rounded p-4 text-center">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Total Cash Interest Due
                    </div>
                    <div className="text-2xl font-semibold font-mono">
                      {formatCurrency(data?.totalDue ?? 0)}
                    </div>
                  </div>
                  {(data?.unmatchedCount ?? 0) > 0 && (
                    <div className="flex items-center gap-2 text-sm text-accent-amber bg-accent-amber/10 rounded p-3 border border-accent-amber/30">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {data!.unmatchedCount} period(s) have no matching AFAS payment yet.
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Notes (optional)</label>
                    <Textarea
                      placeholder="Add any notes about this approval..."
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleApprove} disabled={approveMonth.isPending}>
                    {approveMonth.isPending ? 'Approving...' : 'Confirm Approval'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      {/* Tabs: Cash Payments / Draws & Repayments */}
      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments" className="gap-1.5">
            <Banknote className="h-4 w-4" />
            Cash Payments
            {data && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{data.periods.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="draws" className="gap-1.5">
            <ArrowUpRight className="h-4 w-4" />
            Draws & Repayments
            {drawsData && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{drawsData.summary.totalTransactions}</Badge>}
          </TabsTrigger>
          {data && data.pikPeriods.length > 0 && (
            <TabsTrigger value="pik" className="gap-1.5">
              <RefreshCcw className="h-4 w-4" />
              PIK Roll-Up
              {data.pikNeedsAction > 0 ? (
                <Badge className="ml-1 h-5 px-1.5 text-xs bg-accent-amber/15 text-accent-amber border border-accent-amber/30">
                  {data.pikNeedsAction}
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{data.pikPeriods.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Cash Payments Tab ── */}
        <TabsContent value="payments" className="space-y-6 mt-6">
          {/* Summary */}
          {data && data.periods.length > 0 && (
            <FinancialStrip items={[
              { label: 'Total Due', value: formatCurrency(data.totalDue), accent: 'primary' },
              { label: 'Confirmed', value: String(data.confirmedCount), accent: 'sage', mono: false },
              { label: 'Matched', value: String(data.matchedCount), accent: 'amber', mono: false },
              { label: 'No Payment', value: String(data.unmatchedCount), accent: data.unmatchedCount > 0 ? 'destructive' : undefined, mono: false },
            ]} />
          )}

          {/* Empty state */}
          {data && data.periods.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No cash interest periods for {displayMonth}.
              </CardContent>
            </Card>
          )}

          {/* Tables grouped by vehicle */}
          {groupedByVehicle.map(([vehicle, periods]) => {
            const vehicleDue = periods.reduce((s, p) => s + p.totalDue, 0);

            return (
              <Card key={vehicle}>
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h2 className="text-sm font-semibold uppercase tracking-wide">{vehicle}</h2>
                </div>
                <CardContent className="p-0">
                  <table className="data-table w-full">
                    <thead>
                      <tr>
                        <th className="text-left">Loan</th>
                        <th className="text-left">Period</th>
                        <th className="text-right">Calculated</th>
                        <th className="text-right">AFAS Received</th>
                        <th className="text-center">Match</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map(period => {
                        const isAfasExpanded = expandedAfas.has(period.id);
                        return (
                          <React.Fragment key={period.id}>
                            <tr
                              className={cn(
                                period.has_economic_events && 'border-l-2 border-l-accent-amber bg-accent-amber/5'
                              )}
                            >
                              <td className="font-mono font-medium">{period.loanNumericId || '—'}</td>
                              <td className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(period.period_start)} – {formatDate(period.period_end)}
                              </td>
                              <td className="numeric font-medium">
                                {formatCurrency(period.expectedCashDue)}
                                {period.expectedCashDue < period.totalDue - 0.01 && (
                                  <div className="text-[10px] text-muted-foreground font-normal">
                                    of {formatCurrency(period.totalDue)} total
                                  </div>
                                )}
                              </td>
                              <td className="numeric">
                                {period.afasPayment ? (
                                  <span className="font-medium">{formatCurrency(period.afasPayment.amount)}</span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                                {period.cashPct < 1 && period.afasDepot && (
                                  <div className="flex items-center justify-end gap-1 text-[10px] text-blue-600 font-normal">
                                    <Landmark className="h-2.5 w-2.5" />
                                    {formatCurrency(period.afasDepot.amount)} depot
                                  </div>
                                )}
                                {period.cashPct < 1 && !period.afasDepot && !period.isConfirmed && (
                                  <div className="text-[10px] text-muted-foreground font-normal">
                                    no depot match
                                  </div>
                                )}
                              </td>
                              <td className="text-center">
                                {period.isConfirmed ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-accent-sage">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Paid
                                  </span>
                                ) : period.afasPayment && period.delta != null && Math.abs(period.delta) <= 0.01 ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-accent-sage">
                                    <Banknote className="h-3.5 w-3.5" />
                                    Match
                                  </span>
                                ) : period.afasPayment ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-accent-amber">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    {formatCurrency(period.delta!)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <CircleDashed className="h-3.5 w-3.5" />
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {period.has_economic_events && (
                                    <AlertTriangle className="h-3.5 w-3.5 text-accent-amber" />
                                  )}
                                  {!period.isConfirmed && period.afasPayment && isController && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleConfirm(period)}
                                      disabled={confirmPayment.isPending}
                                      className="h-7 text-xs border-accent-sage/40 text-accent-sage hover:bg-accent-sage/10"
                                    >
                                      Confirm
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant={isAfasExpanded ? 'secondary' : 'ghost'}
                                    onClick={() => toggleAfas(period.id)}
                                    className="h-7 text-xs gap-1"
                                  >
                                    <Database className="h-3 w-3" />
                                    AFAS
                                    {isAfasExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  </Button>
                                  <Link to={`/loans/${period.loan_id}`}>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                                      View <ChevronRight className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                </div>
                              </td>
                            </tr>
                            {isAfasExpanded && (
                              <tr>
                                <td colSpan={7} className="p-0">
                                  <div className="bg-muted/30 border-b px-6 py-3">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                                      AFAS Transactions — Loan #{period.loanNumericId} (Account 400–599)
                                    </div>
                                    {period.allAfasPayments.length === 0 ? (
                                      <div className="text-xs text-muted-foreground py-2">No AFAS transactions found for this loan.</div>
                                    ) : (
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-muted-foreground border-b">
                                            <th className="text-left py-1.5 font-medium">Date</th>
                                            <th className="text-right font-medium">Amount</th>
                                            <th className="text-left font-medium">Description</th>
                                            <th className="text-left font-medium">Ref</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {period.allAfasPayments.map(p => (
                                            <tr key={p.ref} className={cn(
                                              'border-b border-border/30',
                                              period.afasPayment?.ref === p.ref && 'bg-accent-sage/10'
                                            )}>
                                              <td className="py-1.5 font-mono">{formatDate(p.date)}</td>
                                              <td className="text-right font-mono font-medium">{formatCurrency(p.amount)}</td>
                                              <td className="text-muted-foreground max-w-[300px] truncate">{p.description || '—'}</td>
                                              <td className="font-mono text-muted-foreground">
                                                {p.ref}
                                                {period.afasPayment?.ref === p.ref && (
                                                  <Badge variant="outline" className="ml-2 text-[10px] h-4 border-accent-sage/40 text-accent-sage">matched</Badge>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {/* Totals */}
                      <tr className="bg-muted/30 font-medium border-t-2">
                        <td colSpan={3} className="text-right text-xs text-muted-foreground uppercase tracking-wide">
                          {vehicle} Total
                        </td>
                        <td className="numeric">{formatCurrency(vehicleDue)}</td>
                        <td colSpan={3}></td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Draws & Repayments Tab ── */}
        <TabsContent value="draws" className="space-y-6 mt-6">
          {drawsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : drawsData && drawsData.summary.totalTransactions > 0 ? (
            <>
              {/* Summary */}
              <FinancialStrip items={[
                { label: 'Total Draws', value: formatCurrency(drawsData.summary.totalDrawAmount), accent: 'amber' },
                { label: 'Total Repayments', value: formatCurrency(drawsData.summary.totalRepaymentAmount), accent: 'primary' },
                { label: 'Confirmed', value: String(drawsData.summary.confirmedCount), accent: 'sage', mono: false },
                { label: 'Pending', value: String(drawsData.summary.pendingCount), accent: drawsData.summary.pendingCount > 0 ? 'amber' : undefined, mono: false },
              ]} />

              {/* Tables grouped by vehicle → loan */}
              {drawsByVehicle.map(([vehicle, loanGroups]) => {
                const vehicleDrawTotal = loanGroups.reduce((s, g) => s + g.totalDrawAmount, 0);
                const vehicleRepayTotal = loanGroups.reduce((s, g) => s + g.totalRepaymentAmount, 0);

                return (
                  <Card key={vehicle}>
                    <div className="px-4 py-3 border-b bg-muted/30">
                      <h2 className="text-sm font-semibold uppercase tracking-wide">{vehicle}</h2>
                    </div>
                    <CardContent className="p-0">
                      <table className="data-table w-full">
                        <thead>
                          <tr>
                            <th className="text-left">Loan</th>
                            <th className="text-center">Type</th>
                            <th className="text-right">Amount</th>
                            <th className="text-center">Status</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {loanGroups.map(group => {
                            const isExpanded = expandedDrawLoans.has(group.loanId);
                            const txCount = group.transactions.length;
                            const totalAmount = group.totalDrawAmount + group.totalRepaymentAmount;

                            return (
                              <React.Fragment key={group.loanId}>
                                {/* Loan group summary row */}
                                <tr
                                  className="cursor-pointer hover:bg-muted/20"
                                  onClick={() => toggleDrawLoan(group.loanId)}
                                >
                                  <td className="font-mono font-medium">
                                    <div className="flex items-center gap-1.5">
                                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                      #{group.loanId}
                                      <span className="text-xs text-foreground-secondary font-normal ml-1">{group.borrowerName}</span>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    {group.dominantType === 'draw' ? (
                                      <Badge className="bg-accent-amber/10 text-accent-amber border-accent-amber/30 text-xs">
                                        {txCount === 1 ? 'Draw' : `${txCount} Draws`}
                                      </Badge>
                                    ) : group.dominantType === 'repayment' ? (
                                      <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">
                                        {txCount === 1 ? 'Repayment' : `${txCount} Repayments`}
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-muted text-foreground-secondary border-border text-xs">
                                        {txCount} Mixed
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="numeric font-medium">{formatCurrency(totalAmount)}</td>
                                  <td className="text-center">
                                    {group.pendingCount === 0 ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-accent-sage">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        {group.confirmedCount}/{txCount}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs text-accent-amber">
                                        <CircleDashed className="h-3.5 w-3.5" />
                                        {group.confirmedCount}/{txCount}
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-right">
                                    {group.loanUuid && (
                                      <Link to={`/loans/${group.loanUuid}`} onClick={e => e.stopPropagation()}>
                                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                                          View <ChevronRight className="h-3 w-3" />
                                        </Button>
                                      </Link>
                                    )}
                                  </td>
                                </tr>
                                {/* Expanded: individual transaction rows */}
                                {isExpanded && group.transactions.map(tx => {
                                  const isAfasExpanded = expandedDrawAfas.has(tx.afasRef);
                                  const effectiveType = typeOverrides.get(tx.afasRef) ?? tx.type;
                                  const isOverridden = typeOverrides.has(tx.afasRef) && typeOverrides.get(tx.afasRef) !== tx.type;
                                  return (
                                    <React.Fragment key={tx.afasRef}>
                                      <tr className="bg-muted/10">
                                        <td className="pl-10 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                          {formatDate(tx.entryDate)}
                                        </td>
                                        <td className="text-center">
                                          {!tx.isConfirmed ? (
                                            <button
                                              onClick={() => toggleTypeOverride(tx.afasRef, tx.type)}
                                              className="cursor-pointer"
                                              title="Click to toggle Draw/Repayment"
                                            >
                                              {effectiveType === 'draw' ? (
                                                <Badge className={cn('text-xs', isOverridden ? 'bg-accent-amber/20 text-accent-amber border-accent-amber/50 ring-1 ring-accent-amber/30' : 'bg-accent-amber/10 text-accent-amber border-accent-amber/30')}>
                                                  Draw {isOverridden && '(edited)'}
                                                </Badge>
                                              ) : (
                                                <Badge className={cn('text-xs', isOverridden ? 'bg-primary/20 text-primary border-primary/50 ring-1 ring-primary/30' : 'bg-primary/10 text-primary border-primary/30')}>
                                                  Repayment {isOverridden && '(edited)'}
                                                </Badge>
                                              )}
                                            </button>
                                          ) : (
                                            effectiveType === 'draw' ? (
                                              <Badge className="bg-accent-amber/10 text-accent-amber border-accent-amber/30 text-xs">Draw</Badge>
                                            ) : (
                                              <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">Repayment</Badge>
                                            )
                                          )}
                                        </td>
                                        <td className="numeric text-sm">{formatCurrency(tx.amount)}</td>
                                        <td className="text-center">
                                          {tx.isConfirmed && tx.eventStatus === 'approved' ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-accent-sage">
                                              <CheckCircle2 className="h-3.5 w-3.5" />
                                              Approved
                                            </span>
                                          ) : tx.isConfirmed ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-accent-amber">
                                              <Clock className="h-3.5 w-3.5" />
                                              Draft
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                              <CircleDashed className="h-3.5 w-3.5" />
                                              Pending
                                            </span>
                                          )}
                                        </td>
                                        <td className="text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            {!tx.isConfirmed && tx.loanUuid && isController && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleConfirmDraw(tx)}
                                                disabled={confirmDraw.isPending}
                                                className="h-7 text-xs border-accent-sage/40 text-accent-sage hover:bg-accent-sage/10"
                                              >
                                                Confirm
                                              </Button>
                                            )}
                                            <Button
                                              size="sm"
                                              variant={isAfasExpanded ? 'secondary' : 'ghost'}
                                              onClick={() => toggleDrawAfas(tx.afasRef)}
                                              className="h-7 text-xs gap-1"
                                            >
                                              <Database className="h-3 w-3" />
                                              AFAS
                                              {isAfasExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                      {isAfasExpanded && (
                                        <tr>
                                          <td colSpan={6} className="p-0">
                                            <div className="bg-muted/30 border-b px-6 py-3">
                                              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                                                AFAS Transaction Detail — Ref {tx.afasRef}
                                              </div>
                                              <div className="grid grid-cols-4 gap-4 text-xs">
                                                <div>
                                                  <div className="text-muted-foreground mb-0.5">Date</div>
                                                  <div className="font-mono">{formatDate(tx.entryDate)}</div>
                                                </div>
                                                <div>
                                                  <div className="text-muted-foreground mb-0.5">Amount</div>
                                                  <div className="font-mono font-medium">{formatCurrency(tx.amount)}</div>
                                                </div>
                                                <div>
                                                  <div className="text-muted-foreground mb-0.5">Type</div>
                                                  <div>{tx.type === 'draw' ? 'Draw (Debit)' : 'Repayment (Credit)'}</div>
                                                </div>
                                                <div>
                                                  <div className="text-muted-foreground mb-0.5">AFAS Ref</div>
                                                  <div className="font-mono">{tx.afasRef}</div>
                                                </div>
                                              </div>
                                              {tx.description && (
                                                <div className="mt-2 text-xs">
                                                  <span className="text-muted-foreground">Description: </span>
                                                  <span>{tx.description}</span>
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                          {/* Totals */}
                          <tr className="bg-muted/30 font-medium border-t-2">
                            <td colSpan={3} className="text-right text-xs text-muted-foreground uppercase tracking-wide">
                              {vehicle} Total
                            </td>
                            <td className="numeric">
                              {vehicleDrawTotal > 0 && (
                                <span className="text-accent-amber">+{formatCurrency(vehicleDrawTotal)}</span>
                              )}
                              {vehicleDrawTotal > 0 && vehicleRepayTotal > 0 && ' / '}
                              {vehicleRepayTotal > 0 && (
                                <span className="text-primary">-{formatCurrency(vehicleRepayTotal)}</span>
                              )}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No draws or repayments for {displayMonth}.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── PIK Roll-Up Tab ── */}
        <TabsContent value="pik" className="space-y-6 mt-6">
          {data && data.pikPeriods.length > 0 ? (
            <Card>
              <div className="px-4 py-3 border-b bg-muted/30">
                <h2 className="text-sm font-semibold uppercase tracking-wide">PIK Interest — Roll Up Required</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  PIK loans need interest capitalized each month. Go to the loan's Accruals tab and click "Roll Up".
                </p>
              </div>
              <CardContent className="p-0">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Loan</th>
                      <th className="text-left">Borrower</th>
                      <th className="text-left">Period</th>
                      <th className="text-right">Interest</th>
                      <th className="text-center">Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pikPeriods.map(pik => (
                      <tr
                        key={pik.periodId}
                        className={cn(
                          pik.rollUpStatus === 'needs_rollup' && 'border-l-2 border-l-accent-amber bg-accent-amber/5'
                        )}
                      >
                        <td className="font-mono font-medium">#{pik.loanNumericId}</td>
                        <td className="text-muted-foreground">{pik.borrowerName}</td>
                        <td className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(pik.periodStart)} – {formatDate(pik.periodEnd)}
                        </td>
                        <td className="numeric font-medium">{formatCurrency(pik.interestAccrued)}</td>
                        <td className="text-center">
                          {pik.rollUpStatus === 'approved' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-accent-sage">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Rolled up
                            </span>
                          ) : pik.rollUpStatus === 'draft' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-accent-amber">
                              <Clock className="h-3.5 w-3.5" />
                              Needs approval
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-accent-amber">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Needs roll-up
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <Link to={`/loans/${pik.loanUuid}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                              {pik.rollUpStatus === 'needs_rollup' ? 'Roll Up' : 'View'} <ChevronRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No PIK loans with periods in {displayMonth}.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
