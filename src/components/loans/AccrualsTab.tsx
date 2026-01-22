import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format';
import { LoanEvent, PeriodStatus, InterestType } from '@/types/loan';
import { PeriodAccrual, AccrualsSummary, InterestSegment, DailyAccrual } from '@/lib/loanCalculations';
import { StatusBadge } from './LoanStatusBadge';
import { useCreateInterestChargeEvent } from '@/hooks/useLoans';
import { useAuth } from '@/hooks/useAuth';
import { 
  ChevronDown, 
  ChevronRight, 
  Calendar,
  ArrowUpRight,
  Info,
  Clock,
  CheckCircle2,
  CircleDashed
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
  events?: LoanEvent[];
  interestType?: InterestType;
}

export function AccrualsTab({ periodAccruals, summary, isLoading, loanId, events, interestType = 'cash_pay' }: AccrualsTabProps) {
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [showDailyBreakdown, setShowDailyBreakdown] = useState<string | null>(null);
  const createInterestCharge = useCreateInterestChargeEvent();
  const { isController, isPM } = useAuth();

  const isPik = interestType === 'pik';
  const canCreateInterestCharge = isPik && (isPM || isController);

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
        <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Current Period</div>
                  <div className="font-mono font-semibold">
                    {formatDate(latestPeriod.periodStart)} – {formatDate(latestPeriod.periodEnd)}
                  </div>
                </div>
                <StatusBadge status={latestPeriod.status as PeriodStatus} />
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Principal</div>
                  <div className="font-mono font-semibold">{formatCurrency(latestPeriod.openingPrincipal)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Rate</div>
                  <div className="font-mono font-semibold">{formatPercent(latestPeriod.openingRate, 2)}</div>
                </div>
                <div className="text-right border-l pl-6">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                    {isPik ? 'Interest Charge' : 'Interest Due'}
                  </div>
                  <div className="font-mono font-bold text-lg text-primary">
                    {formatCurrency(latestPeriod.interestAccrued + latestPeriod.commitmentFeeAccrued)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Period-by-Period Accruals</CardTitle>
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
            <Badge variant={isPik ? 'default' : 'secondary'} className="text-xs">
              {isPik ? 'PIK Loan' : 'Cash Pay'}
            </Badge>
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
                      {isPik ? 'Interest Charge' : 'Interest Due'}
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
}: PeriodTableRowProps) {
  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'open': return 'border-l-blue-400';
      case 'submitted': return 'border-l-yellow-400';
      case 'approved': return 'border-l-green-400';
      case 'sent': return 'border-l-primary';
      default: return 'border-l-muted';
    }
  };

  const totalInterestDue = period.interestAccrued + period.commitmentFeeAccrued;

  // Determine payment status (placeholder for AFAS integration)
  const getPaymentStatus = (): 'pending' | 'invoiced' | 'paid' => {
    // For now, derive from period status
    // In future: check AFAS invoice sync table
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
          <StatusBadge status={period.status as PeriodStatus} />
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
          {formatCurrency(totalInterestDue)}
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
            // Cash pay loan: show payment status (future AFAS link)
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
              {paymentStatus === 'paid' && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Paid
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
                  <div className="text-muted-foreground uppercase tracking-wide">Interest</div>
                  <div className="font-mono text-primary">{formatCurrency(period.interestAccrued)}</div>
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
