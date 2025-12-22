import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format';
import { PeriodStatus } from '@/types/loan';
import { PeriodAccrual, AccrualsSummary, InterestSegment, DailyAccrual, CommitmentFeeSegment } from '@/lib/loanCalculations';
import { StatusBadge } from './LoanStatusBadge';
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  Calculator, 
  Calendar,
  DollarSign,
  Percent,
  BarChart3,
  Wallet,
  PiggyBank
} from 'lucide-react';

interface AccrualsTabProps {
  periodAccruals: PeriodAccrual[];
  summary: AccrualsSummary;
  isLoading: boolean;
}

export function AccrualsTab({ periodAccruals, summary, isLoading }: AccrualsTabProps) {
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [showDailyBreakdown, setShowDailyBreakdown] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Commitment Breakdown Card */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Commitment Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Commitment</div>
              <div className="text-2xl font-bold font-mono">{formatCurrency(summary.totalCommitment)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Outstanding (Drawn)</div>
              <div className="text-2xl font-bold font-mono text-primary">{formatCurrency(summary.currentPrincipal)}</div>
              <div className="text-xs text-muted-foreground">
                {summary.totalCommitment > 0 
                  ? `${((summary.currentPrincipal / summary.totalCommitment) * 100).toFixed(1)}% utilized`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Undrawn (Available)</div>
              <div className="text-2xl font-bold font-mono text-green-600">{formatCurrency(summary.currentUndrawn)}</div>
              <div className="text-xs text-muted-foreground">
                Fee rate: {formatPercent(summary.commitmentFeeRate, 2)} p.a.
              </div>
            </div>
          </div>
          {summary.totalCommitment > 0 && (
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-1">Utilization</div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ width: `${Math.min(100, (summary.currentPrincipal / summary.totalCommitment) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>€0</span>
                <span>{formatCurrency(summary.totalCommitment)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Current Principal"
          value={formatCurrency(summary.currentPrincipal)}
          subtext={`${summary.totalDays} days tracked`}
        />
        <SummaryCard
          icon={<Percent className="h-4 w-4" />}
          label="Current Rate"
          value={formatPercent(summary.currentRate, 2)}
          subtext={`Avg: ${formatPercent(summary.averageRate, 2)}`}
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Total Interest"
          value={formatCurrency(summary.totalInterestAccrued)}
          subtext={summary.totalPikCapitalized > 0 ? `PIK: ${formatCurrency(summary.totalPikCapitalized)}` : 'All cash pay'}
        />
        <SummaryCard
          icon={<PiggyBank className="h-4 w-4" />}
          label="Commitment Fees"
          value={formatCurrency(summary.totalCommitmentFees)}
          subtext={`@ ${formatPercent(summary.commitmentFeeRate, 2)} on undrawn`}
        />
      </div>

      {/* Period Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Period-by-Period Accruals
          </CardTitle>
          <CardDescription>
            Derived from the event ledger using ACT/365 Fixed day count convention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {periodAccruals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No periods to calculate accruals for
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-3">Period</div>
                <div className="col-span-2 text-right">Opening</div>
                <div className="col-span-2 text-right">Interest</div>
                <div className="col-span-2 text-right">Closing</div>
                <div className="col-span-2 text-right">Due</div>
                <div className="col-span-1"></div>
              </div>

              {/* Period Rows */}
              {periodAccruals.map((period) => (
                <PeriodRow
                  key={period.periodId}
                  period={period}
                  isExpanded={expandedPeriods.has(period.periodId)}
                  onToggle={() => togglePeriod(period.periodId)}
                  showDailyBreakdown={showDailyBreakdown === period.periodId}
                  onToggleDailyBreakdown={() => 
                    setShowDailyBreakdown(
                      showDailyBreakdown === period.periodId ? null : period.periodId
                    )
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}

function SummaryCard({ icon, label, value, subtext }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
      </CardContent>
    </Card>
  );
}

interface PeriodRowProps {
  period: PeriodAccrual;
  isExpanded: boolean;
  onToggle: () => void;
  showDailyBreakdown: boolean;
  onToggleDailyBreakdown: () => void;
}

function PeriodRow({ 
  period, 
  isExpanded, 
  onToggle,
  showDailyBreakdown,
  onToggleDailyBreakdown,
}: PeriodRowProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-muted/50 rounded-lg cursor-pointer items-center">
          <div className="col-span-3 flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <div className="font-mono text-sm">
                {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={period.status as PeriodStatus} />
                <span className="text-xs text-muted-foreground">{period.days} days</span>
              </div>
            </div>
          </div>
          <div className="col-span-2 text-right">
            <div className="font-mono">{formatCurrency(period.openingPrincipal)}</div>
            <div className="text-xs text-muted-foreground">@ {formatPercent(period.openingRate, 2)}</div>
          </div>
          <div className="col-span-2 text-right">
            <div className="font-mono text-primary">{formatCurrency(period.interestAccrued)}</div>
            {period.commitmentFeeAccrued > 0 && (
              <div className="text-xs text-muted-foreground">
                +{formatCurrency(period.commitmentFeeAccrued)} fee
              </div>
            )}
          </div>
          <div className="col-span-2 text-right">
            <div className="font-mono">{formatCurrency(period.closingPrincipal)}</div>
            <div className="text-xs text-muted-foreground">@ {formatPercent(period.closingRate, 2)}</div>
          </div>
          <div className="col-span-2 text-right">
            <div className="font-mono font-semibold">{formatCurrency(period.totalDue)}</div>
          </div>
          <div className="col-span-1"></div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-8 mr-4 mb-4 space-y-4">
          {/* Commitment Breakdown for Period */}
          <div className="bg-blue-500/10 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Commitment Status
            </h4>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Opening</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Commitment</div>
                    <div className="font-mono font-medium">{formatCurrency(period.openingCommitment)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Drawn</div>
                    <div className="font-mono font-medium">{formatCurrency(period.openingPrincipal)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Undrawn</div>
                    <div className="font-mono font-medium text-green-600">{formatCurrency(period.openingUndrawn)}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Closing</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Commitment</div>
                    <div className="font-mono font-medium">{formatCurrency(period.closingCommitment)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Drawn</div>
                    <div className="font-mono font-medium">{formatCurrency(period.closingPrincipal)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Undrawn</div>
                    <div className="font-mono font-medium text-green-600">{formatCurrency(period.closingUndrawn)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Movement Summary */}
          {(period.principalDrawn > 0 || period.principalRepaid > 0 || period.pikCapitalized > 0) && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Principal Movements</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {period.principalDrawn > 0 && (
                  <div>
                    <span className="text-muted-foreground">Drawn:</span>{' '}
                    <span className="font-mono text-green-600">+{formatCurrency(period.principalDrawn)}</span>
                  </div>
                )}
                {period.principalRepaid > 0 && (
                  <div>
                    <span className="text-muted-foreground">Repaid:</span>{' '}
                    <span className="font-mono text-red-600">-{formatCurrency(period.principalRepaid)}</span>
                  </div>
                )}
                {period.pikCapitalized > 0 && (
                  <div>
                    <span className="text-muted-foreground">PIK Capitalized:</span>{' '}
                    <span className="font-mono text-amber-600">+{formatCurrency(period.pikCapitalized)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interest Segments */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Interest Calculation</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-1">Period</th>
                  <th className="text-right">Days</th>
                  <th className="text-right">Principal</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right">Interest</th>
                  <th className="text-left pl-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {period.interestSegments.map((segment, idx) => (
                  <InterestSegmentRow key={idx} segment={segment} />
                ))}
                <tr className="border-t font-medium">
                  <td className="py-2">Total</td>
                  <td className="text-right">{period.days}</td>
                  <td></td>
                  <td></td>
                  <td className="text-right font-mono">{formatCurrency(period.interestAccrued)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Commitment Fee Segments */}
          {period.commitmentFeeSegments.length > 0 && period.commitmentFeeRate > 0 && (
            <div className="bg-amber-500/10 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                Commitment Fee Calculation
              </h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left py-1">Period</th>
                    <th className="text-right">Days</th>
                    <th className="text-right">Commitment</th>
                    <th className="text-right">Undrawn</th>
                    <th className="text-right">Fee Rate</th>
                    <th className="text-right">Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {period.commitmentFeeSegments.map((segment, idx) => (
                    <CommitmentFeeSegmentRow key={idx} segment={segment} />
                  ))}
                  <tr className="border-t font-medium">
                    <td className="py-2">Total</td>
                    <td className="text-right">{period.days}</td>
                    <td></td>
                    <td className="text-right text-xs text-muted-foreground">
                      Avg: {formatCurrency(period.avgUndrawnAmount)}
                    </td>
                    <td></td>
                    <td className="text-right font-mono">{formatCurrency(period.commitmentFeeAccrued)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Daily Breakdown Toggle */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleDailyBreakdown();
              }}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {showDailyBreakdown ? 'Hide Daily Breakdown' : 'Show Daily Breakdown'}
            </Button>
            
            {showDailyBreakdown && (
              <DailyBreakdownTable dailyAccruals={period.dailyAccruals} />
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
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

interface CommitmentFeeSegmentRowProps {
  segment: CommitmentFeeSegment;
}

function CommitmentFeeSegmentRow({ segment }: CommitmentFeeSegmentRowProps) {
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-1.5 font-mono text-xs">
        {formatDate(segment.startDate)} – {formatDate(segment.endDate)}
      </td>
      <td className="text-right font-mono">{segment.days}</td>
      <td className="text-right font-mono">{formatCurrency(segment.commitment)}</td>
      <td className="text-right font-mono text-green-600">{formatCurrency(segment.undrawn)}</td>
      <td className="text-right font-mono">{formatPercent(segment.feeRate, 2)}</td>
      <td className="text-right font-mono">{formatCurrency(segment.fee)}</td>
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
