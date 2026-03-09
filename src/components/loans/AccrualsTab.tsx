import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format';
import { LoanEvent, PeriodStatus, InterestType } from '@/types/loan';
import { PeriodAccrual, AccrualsSummary, InterestSegment, DailyAccrual } from '@/lib/loanCalculations';
import { StatusBadge } from './LoanStatusBadge';
import { PeriodPipeline } from './PeriodPipeline';
import { useCreateInterestChargeEvent } from '@/hooks/useLoans';
import { useTriggerDailyAccruals } from '@/hooks/useMonthlyApproval';
import { useAfasCashPayments, useAfasDepotPayments, AfasCashPayment } from '@/hooks/useAfasCashPayments';
import { useConfirmPayment } from '@/hooks/useConfirmPayment';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  ArrowUpRight,
  Info,
  Clock,
  CheckCircle2,
  CircleDashed,
  RefreshCw,
  Banknote,
  Landmark,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AccrualsTabProps {
  periodAccruals: PeriodAccrual[];
  summary: AccrualsSummary;
  isLoading: boolean;
  loanId?: string;
  loanNumericId?: string;
  events?: LoanEvent[];
  interestType?: InterestType;
  cashInterestPct?: number | null;
  initialFacility?: string | null;
}

export function AccrualsTab({ periodAccruals, summary, isLoading, loanId, loanNumericId, events, interestType = 'cash_pay', cashInterestPct, initialFacility }: AccrualsTabProps) {
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [showDailyBreakdown, setShowDailyBreakdown] = useState<string | null>(null);
  const createInterestCharge = useCreateInterestChargeEvent();
  const triggerAccruals = useTriggerDailyAccruals();
  const { isController, isPM } = useAuth();

  const isPik = interestType === 'pik';
  const isCashPay = !isPik;
  const canCreateInterestCharge = isPik && (isPM || isController);

  // Fetch AFAS cash payments for this loan (only for cash-pay loans)
  const afasPayments = useAfasCashPayments(loanNumericId, isCashPay);
  const confirmPayment = useConfirmPayment(loanId);

  const cashPct = (cashInterestPct ?? 100) / 100;
  const hasDepotSplit = cashPct < 1;

  // Fetch AFAS depot payments (journal 90) — only for loans with a depot split
  const afasDepotPayments = useAfasDepotPayments(loanNumericId, isCashPay && hasDepotSplit);

  // Match AFAS payments to periods:
  // - Payment date within period_start to 14 days after period_end
  // - Each AFAS payment can only match one period (earliest period first)
  // - If multiple payments fall in the window, pick the closest amount match
  // - Controller verifies amount discrepancy before confirming
  function matchPaymentsToPeriods(
    payments: AfasCashPayment[] | undefined,
    expectedAmountFn: (period: PeriodAccrual) => number,
  ): Map<string, AfasCashPayment> {
    if (!payments) return new Map();
    const matches = new Map<string, AfasCashPayment>();
    const usedRefs = new Set<string>();

    const sortedPeriods = [...periodAccruals].sort(
      (a, b) => new Date(a.periodEnd).getTime() - new Date(b.periodEnd).getTime()
    );

    for (const period of sortedPeriods) {
      if (period.paymentDate) continue;
      const expected = expectedAmountFn(period);
      if (expected <= 0) continue;

      const windowStart = new Date(period.periodStart);
      const windowEnd = new Date(period.periodEnd);
      windowEnd.setDate(windowEnd.getDate() + 14);

      let bestMatch: AfasCashPayment | null = null;
      let bestDelta = Infinity;

      for (const payment of payments) {
        if (usedRefs.has(payment.ref)) continue;
        const payDate = new Date(payment.date);
        if (payDate >= windowStart && payDate <= windowEnd) {
          const delta = Math.abs(payment.amount - expected);
          if (!bestMatch || delta < bestDelta) {
            bestMatch = payment;
            bestDelta = delta;
          }
        }
      }

      if (bestMatch) {
        matches.set(period.periodId, bestMatch);
        usedRefs.add(bestMatch.ref);
      }
    }
    return matches;
  }

  // Match depot payments (journal 90) to periods
  const depotMatches = useMemo(
    () => matchPaymentsToPeriods(
      hasDepotSplit ? afasDepotPayments.data : undefined,
      (p) => p.interestAccrued * (1 - cashPct),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasDepotSplit, afasDepotPayments.data, periodAccruals, cashPct],
  );

  // Match cash payments (journal 50) to periods.
  // The AFAS amounts are already netted (1751 debits subtracted in the hook),
  // so they represent the true cash amount regardless of AFAS booking method.
  const paymentMatches = useMemo(
    () => matchPaymentsToPeriods(
      isCashPay ? afasPayments.data : undefined,
      (p) => p.interestAccrued * cashPct + p.commitmentFeeAccrued + p.feesInvoiced,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCashPay, afasPayments.data, periodAccruals, cashPct],
  );

  // Check if a period has an existing interest charge event (draft or approved)
  const getInterestChargeStatus = (periodId: string): 'none' | 'draft' | 'approved' => {
    if (!events) return 'none';
    const chargeEvent = events.find(e => 
      e.event_type === 'pik_capitalization_posted' &&
      (e.metadata as Record<string, unknown>)?.period_id === periodId
    );
    if (!chargeEvent) return 'none';
    return chargeEvent.status as 'draft' | 'approved';
  };

  const handleCreateInterestCharge = async (period: PeriodAccrual) => {
    if (!loanId) return;
    await createInterestCharge.mutateAsync({
      loan_id: loanId,
      period_id: period.periodId,
      period_start: period.periodStart,
      period_end: period.periodEnd,
      interest_accrued: period.interestAccrued,
      commitment_fee_accrued: period.commitmentFeeAccrued,
      opening_principal: period.openingPrincipal,
      closing_principal: period.closingPrincipal,
    });
  };

  const togglePeriod = (periodId: string) => {
    const newExpanded = new Set(expandedPeriods);
    if (newExpanded.has(periodId)) {
      newExpanded.delete(periodId);
    } else {
      newExpanded.add(periodId);
    }
    setExpandedPeriods(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Get the latest period (most recent by end date)
  const latestPeriod = periodAccruals.length > 0 
    ? [...periodAccruals].sort((a, b) => 
        new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
      )[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Latest Period Header */}
      {latestPeriod && (
        <div className="flex items-center justify-between py-3 px-4 border rounded-sm bg-card">
          <div className="flex items-center gap-4">
            <div>
              <div className="ledger-label mb-0.5">Current Period</div>
              <div className="font-mono font-semibold text-sm">
                {formatDate(latestPeriod.periodStart)} – {formatDate(latestPeriod.periodEnd)}
              </div>
            </div>
            <PeriodPipeline current={latestPeriod.status as PeriodStatus} />
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="ledger-label mb-0.5">Principal</div>
              <div className="font-mono font-semibold text-sm">{formatCurrency(latestPeriod.openingPrincipal)}</div>
            </div>
            <div className="text-right">
              <div className="ledger-label mb-0.5">Rate</div>
              <div className="font-mono font-semibold text-sm">{formatPercent(latestPeriod.openingRate, 2)}</div>
            </div>
            <div className="text-right border-l pl-6">
              <div className="ledger-label mb-0.5">
                {isPik ? 'Interest Charge' : cashPct < 1 ? `Cash Due (${Math.round(cashPct * 100)}%)` : 'Interest Due'}
              </div>
              <div className="font-mono font-bold text-base text-primary">
                {cashPct < 1 && !isPik
                  ? formatCurrency(latestPeriod.interestAccrued * cashPct + latestPeriod.commitmentFeeAccrued)
                  : formatCurrency(latestPeriod.interestAccrued + latestPeriod.commitmentFeeAccrued)}
              </div>
              {cashPct < 1 && !isPik && (
                <div className="text-[10px] text-foreground-tertiary font-normal">
                  of {formatCurrency(latestPeriod.interestAccrued + latestPeriod.commitmentFeeAccrued)} total
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Period Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Period-by-Period Accruals
                {initialFacility && (
                  <span className="text-xs font-normal font-mono text-foreground-tertiary bg-muted px-1.5 py-0.5 rounded">
                    {initialFacility}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 cursor-help underline decoration-dotted underline-offset-2">
                        30/360 Day Count
                        <Info className="h-3 w-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs">
                      <p className="font-semibold mb-1">30/360 Day Count Convention</p>
                      <p>Each month is treated as 30 days, and the year as 360 days. This standardizes daily accrual rates across all months for consistency.</p>
                      <p className="mt-1 text-muted-foreground">Daily Rate = Annual Rate ÷ 360</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span>· Click row to expand</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerAccruals.mutate(undefined)}
                disabled={triggerAccruals.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${triggerAccruals.isPending ? 'animate-spin' : ''}`} />
                {triggerAccruals.isPending ? 'Generating...' : 'Generate Accruals'}
              </Button>
              <Badge variant={isPik ? 'default' : 'secondary'} className="text-xs">
                {isPik ? 'PIK Loan' : 'Cash Pay'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {periodAccruals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No periods to calculate accruals for
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground w-8"></th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Period</th>
                    <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Days</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Opening</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Rate</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                      {isPik ? 'Interest Charge' : hasDepotSplit ? `Cash Due (${Math.round(cashPct * 100)}%)` : 'Interest Due'}
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground bg-primary/10">Closing</th>
                    <th className="text-center py-3 px-4 font-semibold text-muted-foreground w-32">
                      {isPik ? 'Capitalized' : 'Payment'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...periodAccruals].sort((a, b) =>
                    new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
                  ).map((period, index) => {
                    const chargeStatus = getInterestChargeStatus(period.periodId);
                    const periodDrawEvents = events?.filter(e =>
                      (e.event_type === 'principal_draw' || e.event_type === 'principal_repayment') &&
                      e.effective_date >= period.periodStart &&
                      e.effective_date <= period.periodEnd
                    ) ?? [];
                    return (
                      <PeriodTableRow
                        key={period.periodId}
                        period={period}
                        index={index}
                        isExpanded={expandedPeriods.has(period.periodId)}
                        onToggle={() => togglePeriod(period.periodId)}
                        showDailyBreakdown={showDailyBreakdown === period.periodId}
                        onToggleDailyBreakdown={() =>
                          setShowDailyBreakdown(
                            showDailyBreakdown === period.periodId ? null : period.periodId
                          )
                        }
                        chargeStatus={chargeStatus}
                        canCreateInterestCharge={canCreateInterestCharge}
                        onCreateInterestCharge={() => handleCreateInterestCharge(period)}
                        isCreatingCharge={createInterestCharge.isPending}
                        isPik={isPik}
                        matchedPayment={paymentMatches.get(period.periodId)}
                        matchedDepot={depotMatches.get(period.periodId)}
                        onConfirmPayment={(payment) => {
                          // payment.amount is already the net cash amount
                          // (1751 depot debits subtracted in useAfasCashPayments)
                          confirmPayment.mutate({
                            periodId: period.periodId,
                            paymentDate: payment.date,
                            paymentAmount: payment.amount,
                            paymentAfasRef: payment.ref,
                          });
                        }}
                        isConfirmingPayment={confirmPayment.isPending}
                        isController={isController}
                        drawEvents={periodDrawEvents.length > 0 ? periodDrawEvents : undefined}
                        cashPct={cashPct}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface PeriodTableRowProps {
  period: PeriodAccrual;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  showDailyBreakdown: boolean;
  onToggleDailyBreakdown: () => void;
  chargeStatus: 'none' | 'draft' | 'approved';
  canCreateInterestCharge: boolean;
  onCreateInterestCharge: () => void;
  isCreatingCharge: boolean;
  isPik: boolean;
  matchedPayment?: AfasCashPayment;
  matchedDepot?: AfasCashPayment;
  onConfirmPayment?: (payment: AfasCashPayment) => void;
  isConfirmingPayment?: boolean;
  isController?: boolean;
  drawEvents?: LoanEvent[];
  cashPct: number;
}

function PeriodTableRow({
  period,
  index,
  isExpanded,
  onToggle,
  showDailyBreakdown,
  onToggleDailyBreakdown,
  chargeStatus,
  canCreateInterestCharge,
  onCreateInterestCharge,
  isCreatingCharge,
  isPik,
  matchedPayment,
  matchedDepot,
  onConfirmPayment,
  isConfirmingPayment,
  isController,
  drawEvents,
  cashPct,
}: PeriodTableRowProps) {
  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'open': return 'border-l-accent-amber';
      case 'submitted': return 'border-l-accent-amber';
      case 'approved': return 'border-l-primary';
      case 'sent': return 'border-l-accent-sage';
      case 'paid': return 'border-l-accent-sage';
      default: return 'border-l-muted';
    }
  };

  const totalInterestDue = period.interestAccrued + period.commitmentFeeAccrued;
  const expectedCashDue = period.interestAccrued * cashPct + period.commitmentFeeAccrued + period.feesInvoiced;
  const fullDue = period.interestAccrued + period.commitmentFeeAccrued + period.feesInvoiced;
  const hasDepotSplit = cashPct < 1;

  // Determine payment status
  const getPaymentStatus = (): 'pending' | 'invoiced' | 'paid' | 'matched' => {
    // Already confirmed in DB
    if (period.paymentDate || period.status === 'paid') return 'paid';
    // AFAS payment matched but not yet confirmed
    if (matchedPayment) return 'matched';
    if (period.status === 'sent') return 'invoiced';
    if (period.status === 'approved') return 'invoiced';
    return 'pending';
  };

  const paymentStatus = getPaymentStatus();

  return (
    <>
      <tr 
        className={`
          cursor-pointer transition-colors border-l-4
          ${getStatusBorderColor(period.status)}
          ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
          hover:bg-muted/40
        `}
        onClick={onToggle}
      >
        <td className="py-4 px-4">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
        <td className="py-4 px-4">
          <span className="font-mono text-sm font-medium">
            {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
          </span>
        </td>
        <td className="py-4 px-4 text-center">
          <div className="flex items-center gap-2 justify-center">
            <StatusBadge status={period.status as PeriodStatus} />
            <PeriodPipeline current={period.status as PeriodStatus} />
          </div>
        </td>
        <td className="py-4 px-4 text-right font-mono text-sm text-muted-foreground">
          {period.days}
        </td>
        <td className="py-4 px-4 text-right font-mono text-sm font-medium">
          {formatCurrency(period.openingPrincipal)}
        </td>
        <td className="py-4 px-4 text-right font-mono text-sm text-muted-foreground">
          {formatPercent(period.openingRate, 2)}
        </td>
        <td className="py-4 px-4 text-right font-mono text-sm text-primary font-semibold">
          {hasDepotSplit ? formatCurrency(expectedCashDue) : formatCurrency(totalInterestDue)}
          {hasDepotSplit && (
            <div className="text-[10px] text-foreground-tertiary font-normal">
              of {formatCurrency(totalInterestDue)} total
            </div>
          )}
        </td>
        <td className="py-4 px-4 text-right font-mono text-sm font-bold bg-primary/10">
          {formatCurrency(period.closingPrincipal)}
        </td>
        <td className="py-4 px-4 text-center">
          {isPik ? (
            // PIK loan: show capitalization status with Roll Up action
            <>
              {chargeStatus === 'none' && canCreateInterestCharge && totalInterestDue > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateInterestCharge();
                  }}
                  disabled={isCreatingCharge}
                  className="h-7 text-xs"
                >
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  Roll Up
                </Button>
              )}
              {chargeStatus === 'draft' && (
                <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                  <Clock className="h-3 w-3" />
                  Draft
                </span>
              )}
              {chargeStatus === 'approved' && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Rolled
                </span>
              )}
            </>
          ) : (
            // Cash pay loan: show payment status with AFAS matching
            <>
              {paymentStatus === 'pending' && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CircleDashed className="h-3 w-3" />
                  Pending
                </span>
              )}
              {paymentStatus === 'invoiced' && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                  <Clock className="h-3 w-3" />
                  Invoiced
                </span>
              )}
              {paymentStatus === 'matched' && matchedPayment && isController && onConfirmPayment && (() => {
                const hasDelta = Math.abs(matchedPayment.amount - expectedCashDue) > 0.01;
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmPayment(matchedPayment);
                    }}
                    disabled={isConfirmingPayment}
                    className={`h-7 text-xs ${hasDelta
                      ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                      : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <Banknote className="h-3 w-3 mr-1" />
                    {hasDelta ? 'Confirm (Δ)' : 'Confirm'}
                  </Button>
                );
              })()}
              {paymentStatus === 'matched' && (!isController || !onConfirmPayment) && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                  <Banknote className="h-3 w-3" />
                  Matched
                </span>
              )}
              {paymentStatus === 'paid' && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Received {period.paymentDate ? formatDate(period.paymentDate) : ''}
                </span>
              )}
            </>
          )}
        </td>
      </tr>
      
      {isExpanded && (
        <tr>
          <td colSpan={9} className="p-0">
            <div className="bg-muted/30 border-b px-6 py-4 space-y-4">
              {/* Compact Summary Grid */}
              <div className="grid grid-cols-5 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="text-muted-foreground uppercase tracking-wide">Opening</div>
                  <div className="font-mono">{formatCurrency(period.openingPrincipal)} @ {formatPercent(period.openingRate, 2)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground uppercase tracking-wide">Closing</div>
                  <div className="font-mono">{formatCurrency(period.closingPrincipal)} @ {formatPercent(period.closingRate, 2)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground uppercase tracking-wide">
                    {hasDepotSplit ? 'Interest (gross)' : 'Interest'}
                  </div>
                  <div className="font-mono text-primary">{formatCurrency(period.interestAccrued)}</div>
                  {hasDepotSplit && (
                    <div className="text-[10px] text-foreground-tertiary font-normal font-mono">
                      {formatCurrency(period.interestAccrued * cashPct)} cash / {formatCurrency(period.interestAccrued * (1 - cashPct))} depot
                    </div>
                  )}
                </div>
                {period.commitmentFeeAccrued > 0 && (
                  <div className="space-y-1">
                    <div className="text-muted-foreground uppercase tracking-wide">Commit. Fee</div>
                    <div className="font-mono">{formatCurrency(period.commitmentFeeAccrued)}</div>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-muted-foreground uppercase tracking-wide">Undrawn</div>
                  <div className="font-mono text-green-600">{formatCurrency(period.openingUndrawn)}</div>
                </div>
              </div>

              {/* AFAS Payment Match */}
              {!isPik && matchedPayment && paymentStatus === 'matched' && (() => {
                const delta = matchedPayment.amount - expectedCashDue;
                const hasDelta = Math.abs(delta) > 0.01;
                const borderColor = hasDelta ? 'border-amber-200' : 'border-emerald-200';
                const bgColor = hasDelta ? 'bg-amber-50' : 'bg-emerald-50';
                return (
                  <div className={`flex items-center gap-3 p-3 ${bgColor} border ${borderColor} rounded-md text-xs`}>
                    <Banknote className={`h-4 w-4 ${hasDelta ? 'text-amber-600' : 'text-emerald-600'} shrink-0`} />
                    <div className="flex-1">
                      <span className={`font-medium ${hasDelta ? 'text-amber-800' : 'text-emerald-800'}`}>AFAS payment found: </span>
                      <span className="font-mono">{formatCurrency(matchedPayment.amount)}</span>
                      <span className={hasDelta ? 'text-amber-700' : 'text-emerald-700'}> on {formatDate(matchedPayment.date)}</span>
                      {hasDelta && (
                        <span className="ml-2 font-medium text-amber-700">
                          (expected {formatCurrency(expectedCashDue)}, delta {delta > 0 ? '+' : ''}{formatCurrency(delta)})
                        </span>
                      )}
                      {!hasDelta && cashPct < 1 && (
                        <span className="ml-2 text-emerald-600">({Math.round(cashPct * 100)}% cash)</span>
                      )}
                      {matchedPayment.description && (
                        <span className={`${hasDelta ? 'text-amber-600' : 'text-emerald-600'} ml-1`}>— {matchedPayment.description}</span>
                      )}
                    </div>
                    {isController && onConfirmPayment && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfirmPayment(matchedPayment);
                        }}
                        disabled={isConfirmingPayment}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Confirm Payment
                      </Button>
                    )}
                  </div>
                );
              })()}

              {/* AFAS Depot Match (journal 90) */}
              {!isPik && hasDepotSplit && matchedDepot && (() => {
                const expectedDepot = period.interestAccrued * (1 - cashPct);
                const delta = matchedDepot.amount - expectedDepot;
                const hasDelta = Math.abs(delta) > 0.01;
                return (
                  <div className={`flex items-center gap-3 p-3 ${hasDelta ? 'bg-amber-50' : 'bg-blue-50'} border ${hasDelta ? 'border-amber-200' : 'border-blue-200'} rounded-md text-xs`}>
                    <Landmark className={`h-4 w-4 ${hasDelta ? 'text-amber-600' : 'text-blue-600'} shrink-0`} />
                    <div className="flex-1">
                      <span className={`font-medium ${hasDelta ? 'text-amber-800' : 'text-blue-800'}`}>Depot settlement: </span>
                      <span className="font-mono">{formatCurrency(matchedDepot.amount)}</span>
                      <span className={hasDelta ? 'text-amber-700' : 'text-blue-700'}> on {formatDate(matchedDepot.date)}</span>
                      {hasDelta && (
                        <span className="ml-2 font-medium text-amber-700">
                          (expected {formatCurrency(expectedDepot)}, delta {delta > 0 ? '+' : ''}{formatCurrency(delta)})
                        </span>
                      )}
                      {!hasDelta && (
                        <span className="ml-2 text-blue-600">({Math.round((1 - cashPct) * 100)}% depot)</span>
                      )}
                      {matchedDepot.description && (
                        <span className={`${hasDelta ? 'text-amber-600' : 'text-blue-600'} ml-1`}>— {matchedDepot.description}</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Depot — no match found */}
              {!isPik && hasDepotSplit && !matchedDepot && paymentStatus !== 'paid' && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-md text-xs">
                  <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    No depot settlement found (expected {formatCurrency(period.interestAccrued * (1 - cashPct))} from journal 90)
                  </span>
                </div>
              )}

              {/* Confirmed Payment Info */}
              {!isPik && paymentStatus === 'paid' && period.paymentDate && (() => {
                const paymentMismatch = hasDepotSplit && Math.abs((period.paymentAmount ?? 0) - expectedCashDue) > 0.01;
                return (
                  <div className={`flex items-center gap-3 p-3 ${paymentMismatch ? 'bg-destructive/5 border-destructive/20' : 'bg-accent-sage/10 border-accent-sage/20'} border rounded-md text-xs`}>
                    <CheckCircle2 className={`h-4 w-4 ${paymentMismatch ? 'text-destructive' : 'text-accent-sage'} shrink-0`} />
                    <div>
                      <span className={`font-medium ${paymentMismatch ? 'text-destructive' : 'text-accent-sage'}`}>
                        {hasDepotSplit ? 'Cash payment received: ' : 'Payment received: '}
                      </span>
                      <span className="font-mono">{formatCurrency(period.paymentAmount ?? 0)}</span>
                      <span className={paymentMismatch ? 'text-destructive/70' : 'text-accent-sage/80'}> on {formatDate(period.paymentDate)}</span>
                      {hasDepotSplit && !paymentMismatch && (
                        <span className="text-accent-sage/70 ml-1">({Math.round(cashPct * 100)}% cash)</span>
                      )}
                      {paymentMismatch && (
                        <span className="text-destructive ml-1">
                          (expected {formatCurrency(expectedCashDue)}, mismatch {formatCurrency((period.paymentAmount ?? 0) - expectedCashDue)})
                        </span>
                      )}
                      {period.paymentAfasRef && (
                        <span className="text-muted-foreground ml-1">(ref: {period.paymentAfasRef})</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Depot settlement for paid periods */}
              {!isPik && hasDepotSplit && paymentStatus === 'paid' && matchedDepot && (() => {
                const expectedDepot = period.interestAccrued * (1 - cashPct);
                const delta = matchedDepot.amount - expectedDepot;
                const hasDelta = Math.abs(delta) > 0.01;
                return (
                  <div className={`flex items-center gap-3 p-3 ${hasDelta ? 'bg-amber-50' : 'bg-blue-50/50'} border ${hasDelta ? 'border-amber-200' : 'border-blue-100'} rounded-md text-xs`}>
                    <Landmark className={`h-4 w-4 ${hasDelta ? 'text-amber-600' : 'text-blue-600'} shrink-0`} />
                    <div>
                      <span className={`font-medium ${hasDelta ? 'text-amber-800' : 'text-blue-800'}`}>Depot settlement: </span>
                      <span className="font-mono">{formatCurrency(matchedDepot.amount)}</span>
                      <span className={hasDelta ? 'text-amber-700' : 'text-blue-700'}> on {formatDate(matchedDepot.date)}</span>
                      <span className="text-blue-600 ml-1">({Math.round((1 - cashPct) * 100)}% depot)</span>
                      {hasDelta && (
                        <span className="ml-2 font-medium text-amber-700">
                          (expected {formatCurrency(expectedDepot)}, delta {delta > 0 ? '+' : ''}{formatCurrency(delta)})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Principal Movements */}
              {(period.principalDrawn > 0 || period.feesInvoiced > 0 || period.principalRepaid > 0 || period.pikCapitalized > 0) && (
                <div className="flex gap-6 text-xs pt-2 border-t">
                  {period.principalDrawn > 0 && (
                    <div>
                      <span className="text-muted-foreground">Drawn: </span>
                      <span className="font-mono text-emerald-600">+{formatCurrency(period.principalDrawn)}</span>
                    </div>
                  )}
                  {period.feesInvoiced > 0 && (
                    <div>
                      <span className="text-muted-foreground">
                        {isPik ? 'Fee (capitalised): ' : 'Fee (withheld): '}
                      </span>
                      <span className="font-mono text-emerald-600">+{formatCurrency(period.feesInvoiced)}</span>
                    </div>
                  )}
                  {period.principalRepaid > 0 && (
                    <div>
                      <span className="text-muted-foreground">Repaid: </span>
                      <span className="font-mono text-destructive">-{formatCurrency(period.principalRepaid)}</span>
                    </div>
                  )}
                  {period.pikCapitalized > 0 && (
                    <div>
                      <span className="text-muted-foreground">PIK Capitalized: </span>
                      <span className="font-mono text-amber-600">+{formatCurrency(period.pikCapitalized)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* AFAS Draw/Repayment Events */}
              {drawEvents && drawEvents.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Draw & Repayment Events</div>
                  <div className="space-y-1.5">
                    {drawEvents.map(event => {
                      const afasRef = (event.metadata as Record<string, unknown>)?.afas_ref as string | undefined;
                      return (
                        <div key={event.id} className="flex items-center gap-3 text-xs">
                          <span className="font-mono text-muted-foreground">{formatDate(event.effective_date)}</span>
                          {event.event_type === 'principal_draw' ? (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs">Draw</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">Repayment</Badge>
                          )}
                          <span className="font-mono font-medium">
                            {event.event_type === 'principal_draw' ? '+' : '-'}{formatCurrency(event.amount ?? 0)}
                          </span>
                          <span className={`inline-flex items-center gap-1 ${event.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {event.status === 'approved' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {event.status === 'approved' ? 'Approved' : 'Draft'}
                          </span>
                          {afasRef && (
                            <span className="text-muted-foreground">(ref: {afasRef})</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Interest Segments */}
              {period.interestSegments.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Interest Segments</div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left py-1 font-medium">Period</th>
                        <th className="text-right font-medium">Days</th>
                        <th className="text-right font-medium">Principal</th>
                        <th className="text-right font-medium">Rate</th>
                        <th className="text-right font-medium">Interest</th>
                        <th className="text-left pl-2 font-medium">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {period.interestSegments.map((segment, idx) => (
                        <InterestSegmentRow key={idx} segment={segment} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Commitment Fee Segments - only show if there are fees */}
              {period.commitmentFeeSegments.length > 0 && period.commitmentFeeRate > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Commitment Fees</div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left py-1 font-medium">Period</th>
                        <th className="text-right font-medium">Days</th>
                        <th className="text-right font-medium">Undrawn</th>
                        <th className="text-right font-medium">Rate</th>
                        <th className="text-right font-medium">Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {period.commitmentFeeSegments.map((segment, idx) => (
                        <tr key={idx} className="border-b border-border/30 last:border-0">
                          <td className="py-1 font-mono">{formatDate(segment.startDate)} – {formatDate(segment.endDate)}</td>
                          <td className="text-right font-mono">{segment.days}</td>
                          <td className="text-right font-mono text-green-600">{formatCurrency(segment.undrawn)}</td>
                          <td className="text-right font-mono">{formatPercent(segment.feeRate, 2)}</td>
                          <td className="text-right font-mono">{formatCurrency(segment.fee)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Daily Breakdown Toggle */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleDailyBreakdown();
                  }}
                  className="text-xs h-7 px-2"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  {showDailyBreakdown ? 'Hide daily' : 'Show daily breakdown'}
                </Button>
                
                {showDailyBreakdown && (
                  <DailyBreakdownTable dailyAccruals={period.dailyAccruals} />
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface InterestSegmentRowProps {
  segment: InterestSegment;
}

function InterestSegmentRow({ segment }: InterestSegmentRowProps) {
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-1.5 font-mono text-xs">
        {formatDate(segment.startDate)} – {formatDate(segment.endDate)}
      </td>
      <td className="text-right font-mono">{segment.days}</td>
      <td className="text-right font-mono">{formatCurrency(segment.principal)}</td>
      <td className="text-right font-mono">{formatPercent(segment.rate, 2)}</td>
      <td className="text-right font-mono">{formatCurrency(segment.interest)}</td>
      <td className="pl-2">
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          segment.interestType === 'pik' 
            ? 'bg-amber-500/20 text-amber-700' 
            : 'bg-green-500/20 text-green-700'
        }`}>
          {segment.interestType === 'pik' ? 'PIK' : 'Cash'}
        </span>
      </td>
    </tr>
  );
}


interface DailyBreakdownTableProps {
  dailyAccruals: DailyAccrual[];
}

function DailyBreakdownTable({ dailyAccruals }: DailyBreakdownTableProps) {
  return (
    <div className="mt-4 max-h-64 overflow-auto border rounded-lg">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-background border-b">
          <tr className="text-muted-foreground">
            <th className="text-left py-2 px-3">Date</th>
            <th className="text-right px-3">Principal</th>
            <th className="text-right px-3">Rate</th>
            <th className="text-right px-3">Daily Int.</th>
            <th className="text-right px-3">Cumulative</th>
            <th className="text-center px-3">Type</th>
          </tr>
        </thead>
        <tbody>
          {dailyAccruals.map((day, idx) => (
            <tr 
              key={day.date} 
              className={idx % 2 === 0 ? 'bg-muted/20' : ''}
            >
              <td className="py-1.5 px-3 font-mono">{formatDate(day.date)}</td>
              <td className="text-right px-3 font-mono">{formatCurrency(day.principal)}</td>
              <td className="text-right px-3 font-mono">{formatPercent(day.rate, 2)}</td>
              <td className="text-right px-3 font-mono">{formatCurrency(day.dailyInterest)}</td>
              <td className="text-right px-3 font-mono text-primary">
                {formatCurrency(day.cumulativeInterest)}
              </td>
              <td className="text-center px-3">
                <span className={`px-1.5 py-0.5 rounded ${
                  day.interestType === 'pik' 
                    ? 'bg-amber-500/20 text-amber-700' 
                    : 'bg-green-500/20 text-green-700'
                }`}>
                  {day.interestType === 'pik' ? 'PIK' : 'Cash'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
