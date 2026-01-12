import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format';
import { PeriodStatus } from '@/types/loan';
import { PeriodAccrual, AccrualsSummary, InterestSegment, DailyAccrual } from '@/lib/loanCalculations';
import { StatusBadge } from './LoanStatusBadge';
import { 
  ChevronDown, 
  ChevronRight, 
  Calendar,
  Wallet
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
      {/* Period Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Period-by-Period Accruals</CardTitle>
          <CardDescription className="text-xs">
            ACT/365 Fixed · Click row to expand
          </CardDescription>
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
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Opening Principal</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Rate</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Interest</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Commitment Fees</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Total Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...periodAccruals].sort((a, b) => 
                    new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
                  ).map((period, index) => (
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
                    />
                  ))}
                </tbody>
              </table>
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

interface PeriodTableRowProps {
  period: PeriodAccrual;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  showDailyBreakdown: boolean;
  onToggleDailyBreakdown: () => void;
}

function PeriodTableRow({ 
  period, 
  index,
  isExpanded, 
  onToggle,
  showDailyBreakdown,
  onToggleDailyBreakdown,
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
          {formatCurrency(period.interestAccrued)}
        </td>
        <td className="py-4 px-4 text-right font-mono text-sm text-muted-foreground">
          {period.commitmentFeeAccrued > 0 ? formatCurrency(period.commitmentFeeAccrued) : '—'}
        </td>
        <td className="py-4 px-4 text-right font-mono text-sm font-bold">
          {formatCurrency(period.totalDue)}
        </td>
      </tr>
      
      {isExpanded && (
        <tr>
          <td colSpan={9} className="p-0">
            <div className="bg-muted/30 border-b px-6 py-4 space-y-4">
              {/* Compact Summary Grid */}
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="text-muted-foreground uppercase tracking-wide">Opening</div>
                  <div className="font-mono">{formatCurrency(period.openingPrincipal)} @ {formatPercent(period.openingRate, 2)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground uppercase tracking-wide">Closing</div>
                  <div className="font-mono">{formatCurrency(period.closingPrincipal)} @ {formatPercent(period.closingRate, 2)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground uppercase tracking-wide">Commitment</div>
                  <div className="font-mono">{formatCurrency(period.openingCommitment)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground uppercase tracking-wide">Undrawn</div>
                  <div className="font-mono text-green-600">{formatCurrency(period.openingUndrawn)}</div>
                </div>
              </div>

              {/* Principal Movements */}
              {(period.principalDrawn > 0 || period.principalRepaid > 0 || period.pikCapitalized > 0) && (
                <div className="flex gap-6 text-xs pt-2 border-t">
                  {period.principalDrawn > 0 && (
                    <div>
                      <span className="text-muted-foreground">Drawn: </span>
                      <span className="font-mono text-green-600">+{formatCurrency(period.principalDrawn)}</span>
                    </div>
                  )}
                  {period.principalRepaid > 0 && (
                    <div>
                      <span className="text-muted-foreground">Repaid: </span>
                      <span className="font-mono text-red-600">-{formatCurrency(period.principalRepaid)}</span>
                    </div>
                  )}
                  {period.pikCapitalized > 0 && (
                    <div>
                      <span className="text-muted-foreground">PIK: </span>
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

              {/* Commitment Fee Segments */}
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
