import React, { useState, useMemo } from 'react';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';
import { getCurrentDate } from '@/lib/simulatedDate';
import { VEHICLES } from '@/lib/constants';
import { Link } from 'react-router-dom';
import {
  useMonthlyApprovalAccruals,
  useConfirmPaymentFromApproval,
  EnrichedPeriod,
} from '@/hooks/useMonthlyApprovalAccruals';
import {
  useMonthlyApprovalDraws,
  useConfirmDrawFromApproval,
} from '@/hooks/useMonthlyApprovalDraws';
import { useApproveMonth } from '@/hooks/useMonthlyApproval';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/lib/format';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AfasDrawTransaction } from '@/types/loan';

export default function MonthlyApproval() {
  const [currentMonth, setCurrentMonth] = useState(() =>
    format(subMonths(startOfMonth(getCurrentDate()), 1), 'yyyy-MM')
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
  const [expandedDrawAfas, setExpandedDrawAfas] = useState<Set<string>>(new Set());

  const toggleAfas = (id: string) => {
    setExpandedAfas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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
    confirmPayment.mutate({
      periodId: period.id,
      paymentDate: period.afasPayment.date,
      paymentAmount: period.afasPayment.amount,
      paymentAfasRef: period.afasPayment.ref,
    });
  };

  const handleConfirmDraw = (tx: AfasDrawTransaction) => {
    if (!tx.loanUuid) return;
    confirmDraw.mutate({
      loanUuid: tx.loanUuid,
      eventType: tx.type === 'draw' ? 'principal_draw' : 'principal_repayment',
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

  // Group draws by vehicle
  const drawsByVehicle = useMemo(() => {
    if (!drawsData?.transactions) return [];
    const groups = new Map<string, AfasDrawTransaction[]>();
    for (const tx of drawsData.transactions) {
      const v = tx.vehicle || 'Other';
      const existing = groups.get(v);
      if (existing) existing.push(tx);
      else groups.set(v, [tx]);
    }
    const order = VEHICLES.map(v => v.value);
    return [...groups.entries()].sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [drawsData?.transactions]);

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
          <h1 className="text-2xl font-semibold">Monthly Approval</h1>
          <p className="text-muted-foreground">
            Reconcile calculated interest with AFAS payments
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold min-w-[170px] text-center">
              {displayMonth}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isApproved ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5">
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
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded p-3 border border-amber-200">
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
        </TabsList>

        {/* ── Cash Payments Tab ── */}
        <TabsContent value="payments" className="space-y-6 mt-6">
          {/* Summary */}
          {data && data.periods.length > 0 && (
            <div className="grid grid-cols-4 gap-6 py-3 px-4 bg-background border-l-4 border-l-primary border rounded-sm shadow-sm">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Due</div>
                <div className="text-lg font-semibold font-mono text-primary">{formatCurrency(data.totalDue)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Confirmed</div>
                <div className="text-lg font-semibold font-mono text-emerald-600">{data.confirmedCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Matched</div>
                <div className="text-lg font-semibold font-mono text-amber-600">{data.matchedCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">No Payment</div>
                <div className={cn('text-lg font-semibold font-mono', data.unmatchedCount > 0 ? 'text-red-500' : 'text-muted-foreground')}>
                  {data.unmatchedCount}
                </div>
              </div>
            </div>
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
                        <th className="text-left">Borrower</th>
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
                                period.has_economic_events && 'border-l-2 border-l-amber-400 bg-amber-50/30'
                              )}
                            >
                              <td className="font-mono font-medium">{period.loanNumericId || '—'}</td>
                              <td className="text-muted-foreground max-w-[200px] truncate">
                                {period.borrowerName}
                              </td>
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
                              </td>
                              <td className="text-center">
                                {period.isConfirmed ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Paid
                                  </span>
                                ) : period.afasPayment && period.delta != null && Math.abs(period.delta) <= 0.01 ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                    <Banknote className="h-3.5 w-3.5" />
                                    Match
                                  </span>
                                ) : period.afasPayment ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-600">
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
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                  {!period.isConfirmed && period.afasPayment && isController && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleConfirm(period)}
                                      disabled={confirmPayment.isPending}
                                      className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
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
                                              period.afasPayment?.ref === p.ref && 'bg-emerald-50'
                                            )}>
                                              <td className="py-1.5 font-mono">{formatDate(p.date)}</td>
                                              <td className="text-right font-mono font-medium">{formatCurrency(p.amount)}</td>
                                              <td className="text-muted-foreground max-w-[300px] truncate">{p.description || '—'}</td>
                                              <td className="font-mono text-muted-foreground">
                                                {p.ref}
                                                {period.afasPayment?.ref === p.ref && (
                                                  <Badge variant="outline" className="ml-2 text-[10px] h-4 border-emerald-300 text-emerald-700">matched</Badge>
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
              <div className="grid grid-cols-4 gap-6 py-3 px-4 bg-background border-l-4 border-l-orange-400 border rounded-sm shadow-sm">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Draws</div>
                  <div className="text-lg font-semibold font-mono text-orange-600">{formatCurrency(drawsData.summary.totalDrawAmount)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Repayments</div>
                  <div className="text-lg font-semibold font-mono text-blue-600">{formatCurrency(drawsData.summary.totalRepaymentAmount)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Confirmed</div>
                  <div className="text-lg font-semibold font-mono text-emerald-600">{drawsData.summary.confirmedCount}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pending</div>
                  <div className={cn('text-lg font-semibold font-mono', drawsData.summary.pendingCount > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                    {drawsData.summary.pendingCount}
                  </div>
                </div>
              </div>

              {/* Tables grouped by vehicle */}
              {drawsByVehicle.map(([vehicle, transactions]) => {
                const vehicleDrawTotal = transactions.filter(t => t.type === 'draw').reduce((s, t) => s + t.amount, 0);
                const vehicleRepayTotal = transactions.filter(t => t.type === 'repayment').reduce((s, t) => s + t.amount, 0);

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
                            <th className="text-left">Borrower</th>
                            <th className="text-left">Date</th>
                            <th className="text-center">Type</th>
                            <th className="text-right">Amount</th>
                            <th className="text-center">Status</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map(tx => {
                            const isAfasExpanded = expandedDrawAfas.has(tx.afasRef);
                            return (
                              <React.Fragment key={tx.afasRef}>
                                <tr>
                                  <td className="font-mono font-medium">#{tx.loanId}</td>
                                  <td className="text-muted-foreground max-w-[200px] truncate">
                                    {tx.borrowerName}
                                  </td>
                                  <td className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                    {formatDate(tx.entryDate)}
                                  </td>
                                  <td className="text-center">
                                    {tx.type === 'draw' ? (
                                      <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs">Draw</Badge>
                                    ) : (
                                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">Repayment</Badge>
                                    )}
                                  </td>
                                  <td className="numeric font-medium">{formatCurrency(tx.amount)}</td>
                                  <td className="text-center">
                                    {tx.isConfirmed && tx.eventStatus === 'approved' ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Approved
                                      </span>
                                    ) : tx.isConfirmed ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
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
                                          className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
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
                                      {tx.loanUuid && (
                                        <Link to={`/loans/${tx.loanUuid}`}>
                                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                                            View <ChevronRight className="h-3 w-3" />
                                          </Button>
                                        </Link>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                {isAfasExpanded && (
                                  <tr>
                                    <td colSpan={7} className="p-0">
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
                          {/* Totals */}
                          <tr className="bg-muted/30 font-medium border-t-2">
                            <td colSpan={4} className="text-right text-xs text-muted-foreground uppercase tracking-wide">
                              {vehicle} Total
                            </td>
                            <td className="numeric">
                              {vehicleDrawTotal > 0 && (
                                <span className="text-orange-600">+{formatCurrency(vehicleDrawTotal)}</span>
                              )}
                              {vehicleDrawTotal > 0 && vehicleRepayTotal > 0 && ' / '}
                              {vehicleRepayTotal > 0 && (
                                <span className="text-blue-600">-{formatCurrency(vehicleRepayTotal)}</span>
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
      </Tabs>
    </div>
  );
}
