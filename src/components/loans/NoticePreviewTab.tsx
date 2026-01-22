import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate, formatPercent, formatEventType } from '@/lib/format';
import { PeriodAccrual, AccrualsSummary } from '@/lib/loanCalculations';
import { Loan, LoanEvent } from '@/types/loan';
import { ChevronRight } from 'lucide-react';
import raxLogo from '@/assets/rax-logo.png';

interface NoticePreviewTabProps {
  loan: Loan;
  periodAccruals: PeriodAccrual[];
  summary: AccrualsSummary;
  isLoading: boolean;
  events?: LoanEvent[];
}

export function NoticePreviewTab({ loan, periodAccruals, summary, isLoading, events = [] }: NoticePreviewTabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodAccrual | null>(
    periodAccruals.length > 0 ? periodAccruals[periodAccruals.length - 1] : null
  );

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-muted rounded-lg" />;
  }

  // Sort periods oldest to newest
  const sortedPeriods = [...periodAccruals].sort(
    (a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
  );

  // Get events for selected period
  const periodEvents = selectedPeriod 
    ? events.filter(e => {
        const eventDate = new Date(e.effective_date);
        const start = new Date(selectedPeriod.periodStart);
        const end = new Date(selectedPeriod.periodEnd);
        return eventDate >= start && eventDate <= end && e.status === 'approved';
      })
    : [];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Period List Sidebar */}
      <div className="col-span-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Interest Periods</CardTitle>
            <CardDescription>Select a period to preview notice</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {sortedPeriods.map((period) => (
                <button
                  key={period.periodId}
                  onClick={() => setSelectedPeriod(period)}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between ${
                    selectedPeriod?.periodId === period.periodId ? 'bg-muted' : ''
                  }`}
                >
                  <div>
                    <div className="font-mono text-sm">
                      {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <NoticeStatusBadge status={period.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(period.interestAccrued + period.commitmentFeeAccrued)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workflow Steps */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notice Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <WorkflowStep 
              number={1} 
              title="Period Accrued" 
              description="Daily interest calculated (30/360)"
              completed={true}
            />
            <WorkflowStep 
              number={2} 
              title="Interest Rolled Up" 
              description="PM creates interest charge event"
              completed={selectedPeriod?.status !== 'open'}
            />
            <WorkflowStep 
              number={3} 
              title="Controller Approved" 
              description="Events approved & locked"
              completed={selectedPeriod?.status === 'approved' || selectedPeriod?.status === 'sent'}
            />
            <WorkflowStep 
              number={4} 
              title="Notice Sent" 
              description="PDF generated & emailed"
              completed={selectedPeriod?.status === 'sent'}
            />
          </CardContent>
        </Card>
      </div>

      {/* Notice Preview */}
      <div className="col-span-8">
        {selectedPeriod ? (
          <Card className="overflow-hidden">
            {/* Notice Header Actions */}
            <div className="bg-muted/50 border-b px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Interest Notice Preview</span>
                <NoticeStatusBadge status={selectedPeriod.status} />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Print
                </Button>
                <Button variant="outline" size="sm">
                  Download PDF
                </Button>
                {selectedPeriod.status === 'approved' && (
                  <Button size="sm">
                    Send to Borrower
                  </Button>
                )}
              </div>
            </div>

            {/* Notice Document */}
            <CardContent className="p-8 bg-white dark:bg-background">
              <NoticeDocument 
                loan={loan} 
                period={selectedPeriod} 
                summary={summary}
                events={periodEvents}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground py-12">
              <p>Select a period to preview its interest notice</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

interface NoticeDocumentProps {
  loan: Loan;
  period: PeriodAccrual;
  summary: AccrualsSummary;
  events: LoanEvent[];
}

function NoticeDocument({ loan, period, summary, events }: NoticeDocumentProps) {
  const paymentDueDate = new Date(period.periodEnd);
  paymentDueDate.setDate(paymentDueDate.getDate() + 5);

  // Categorize events for display only
  const principalDraws = events.filter(e => e.event_type === 'principal_draw');
  const principalRepayments = events.filter(e => e.event_type === 'principal_repayment');
  const rateChanges = events.filter(e => e.event_type === 'interest_rate_change' || e.event_type === 'interest_rate_set');
  const feeInvoices = events.filter(e => e.event_type === 'fee_invoice');
  const pikCapitalizations = events.filter(e => e.event_type === 'pik_capitalization_posted');
  const commitmentChanges = events.filter(e => 
    e.event_type === 'commitment_change' || e.event_type === 'commitment_cancel'
  );

  // CRITICAL: Use period accrual totals (derived from event ledger) for consistency
  // This ensures Notice matches Accruals tab exactly
  const totalDraws = period.principalDrawn;
  const totalRepayments = period.principalRepaid;
  const totalFees = period.feesInvoiced;
  const totalPikCapitalized = period.pikCapitalized;

  // Interest charge (from accruals - already calculated from event ledger)
  const interestCharge = period.interestAccrued + period.commitmentFeeAccrued;

  // PIK vs Cash determination
  const isPik = loan.interest_type === 'pik';

  return (
    <div className="max-w-3xl mx-auto space-y-8 font-barlow">
      {/* Letterhead */}
      <div className="text-center border-b pb-6">
        <img src={raxLogo} alt="Rax Finance" className="h-10 mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight">INTEREST PAYMENT NOTICE</h1>
      </div>

      {/* Recipient & Reference */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <p className="text-sm text-muted-foreground mb-1">To:</p>
          <p className="font-semibold text-lg">{loan.borrower_name}</p>
          <p className="text-muted-foreground font-mono text-sm">{(loan as any).loan_id}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground mb-1">Notice Date:</p>
          <p className="font-mono">{formatDate(period.periodEnd)}</p>
          <p className="text-sm text-muted-foreground mt-3 mb-1">Reference:</p>
          <p className="font-mono text-sm">{period.periodId.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* Period Summary Box */}
      <div className="bg-muted/30 rounded-lg p-6">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Interest Period</p>
            <p className="font-mono font-medium mt-1">
              {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
            </p>
            <p className="text-xs text-muted-foreground">({period.days} days • 30/360)</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {isPik ? 'Amount Capitalized' : 'Amount Due'}
            </p>
            <p className="text-2xl font-bold text-primary mt-1">
              {formatCurrency(interestCharge)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {isPik ? 'Interest Type' : 'Payment Due Date'}
            </p>
            <p className="font-mono font-medium mt-1">
              {isPik ? (
                <span className="text-amber-600 font-semibold">PIK (Rolled Up)</span>
              ) : (
                formatDate(paymentDueDate.toISOString())
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Principal Movement Summary */}
      <div>
        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Principal Summary</h3>
        <div className="bg-muted/20 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-center flex-1">
              <p className="text-muted-foreground text-xs mb-1">Opening Principal</p>
              <p className="font-mono font-semibold text-lg">{formatCurrency(period.openingPrincipal)}</p>
            </div>
            <div className="text-muted-foreground mx-2">→</div>
            <div className="text-center flex-1 space-y-1">
              {totalDraws > 0 && (
                <div className="flex items-center justify-center gap-1">
                  <span className="font-mono text-sm text-emerald-600">+{formatCurrency(totalDraws)}</span>
                  <span className="text-xs text-muted-foreground">Drawdowns</span>
                </div>
              )}
              {totalRepayments > 0 && (
                <div className="flex items-center justify-center gap-1">
                  <span className="font-mono text-sm text-destructive">-{formatCurrency(totalRepayments)}</span>
                  <span className="text-xs text-muted-foreground">Repayments</span>
                </div>
              )}
              {totalFees > 0 && isPik && (
                <div className="flex items-center justify-center gap-1">
                  <span className="font-mono text-sm text-emerald-600">+{formatCurrency(totalFees)}</span>
                  <span className="text-xs text-muted-foreground">Fees Capitalised</span>
                </div>
              )}
              {isPik && interestCharge > 0 && (
                <div className="flex items-center justify-center gap-1">
                  <span className="font-mono text-sm text-amber-600">+{formatCurrency(interestCharge)}</span>
                  <span className="text-xs text-muted-foreground">Interest Capitalised</span>
                </div>
              )}
              {totalDraws === 0 && totalRepayments === 0 && totalFees === 0 && (!isPik || interestCharge === 0) && (
                <span className="text-muted-foreground text-xs">No movements</span>
              )}
            </div>
            <div className="text-muted-foreground mx-2">→</div>
            <div className="text-center flex-1">
              <p className="text-muted-foreground text-xs mb-1">Closing Principal</p>
              <p className="font-mono font-semibold text-lg">{formatCurrency(period.closingPrincipal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Period Transactions */}
      {events.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Period Transactions</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium">Date</th>
                <th className="text-left font-medium">Transaction</th>
                <th className="text-left font-medium">Description</th>
                <th className="text-right font-medium">Amount</th>
                <th className="text-right font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {events
                .filter(e => {
                  // Hide cash_received (accounting only)
                  if (e.event_type === 'cash_received') return false;
                  // Hide fee split adjustment repayments (internal accounting, not client-facing)
                  const meta = e.metadata as Record<string, unknown>;
                  if (e.event_type === 'principal_repayment' && meta?.adjustment_type === 'fee_split') return false;
                  return true;
                })
                .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime())
                .map((event) => {
                  const meta = event.metadata as Record<string, unknown>;
                  
                  // Get description - standardized labels for arrangement fees
                  const getEventDescription = () => {
                    // For arrangement fees, ALWAYS use standardized labels based on payment_type
                    // This ensures consistency regardless of stored description
                    if (event.event_type === 'fee_invoice') {
                      const feeType = meta?.fee_type as string | undefined;
                      const paymentType = meta?.payment_type as string | undefined;
                      
                      // Arrangement fees: standardized labels
                      if (feeType?.includes('arrangement') || meta?.adjustment_type === 'fee_split') {
                        // PIK: Fee is capitalised (added to principal, accrues interest)
                        // Cash: Fee is withheld from borrower (deducted from draw, no principal impact)
                        return paymentType === 'pik' 
                          ? 'Arrangement fee (capitalised)'
                          : 'Arrangement fee (withheld from borrower)';
                      }
                      
                      // Other fee types: use stored description or generate from fee_type
                      if (meta?.description) return meta.description as string;
                      if (feeType) return `${feeType} fee`;
                    }
                    
                    // Non-fee events: use stored description if available
                    if (meta?.description) return meta.description as string;
                    if (meta?.period_id) return 'Period interest';
                    return null;
                  };
                  
                  const description = getEventDescription();
                  
                  return (
                    <tr key={event.id} className="border-b border-border/50">
                      <td className="py-2 font-mono text-xs">{formatDate(event.effective_date)}</td>
                      <td className="py-2">
                        <span className="text-xs">{formatEventType(event.event_type)}</span>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {description || '—'}
                      </td>
                      <td className="text-right font-mono py-2">
                        {event.amount ? (
                          <span className={
                            event.event_type === 'principal_repayment' 
                              ? 'text-destructive' 
                              : event.event_type === 'principal_draw' || event.event_type === 'pik_capitalization_posted'
                                ? 'text-emerald-600'
                                : ''
                          }>
                            {event.event_type === 'principal_repayment' ? '-' : ''}
                            {formatCurrency(event.amount)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-right font-mono py-2 text-muted-foreground">
                        {event.rate ? formatPercent(event.rate) : '—'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Interest Calculation Details */}
      <div>
        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Interest Calculation</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2 font-medium">Period</th>
              <th className="text-right font-medium">Days</th>
              <th className="text-right font-medium">Principal</th>
              <th className="text-right font-medium">Rate</th>
              <th className="text-right font-medium">Interest</th>
            </tr>
          </thead>
          <tbody>
            {period.interestSegments.map((segment, idx) => (
              <tr key={idx} className="border-b border-border/50">
                <td className="py-2 font-mono text-xs">
                  {formatDate(segment.startDate)} – {formatDate(segment.endDate)}
                </td>
                <td className="text-right font-mono">{segment.days}</td>
                <td className="text-right font-mono">{formatCurrency(segment.principal)}</td>
                <td className="text-right font-mono">{formatPercent(segment.rate)}</td>
                <td className="text-right font-mono">{formatCurrency(segment.interest)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="py-2">Interest Subtotal</td>
              <td className="text-right">{period.days}</td>
              <td></td>
              <td></td>
              <td className="text-right font-mono">{formatCurrency(period.interestAccrued)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Commitment Fee (if applicable) */}
      {period.commitmentFeeAccrued > 0 && (
        <div>
          <h3 className="font-semibold mb-4">Commitment Fee</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium">Period</th>
                <th className="text-right font-medium">Days</th>
                <th className="text-right font-medium">Undrawn Amount</th>
                <th className="text-right font-medium">Fee Rate</th>
                <th className="text-right font-medium">Fee</th>
              </tr>
            </thead>
            <tbody>
              {period.commitmentFeeSegments.map((segment, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="py-2 font-mono text-xs">
                    {formatDate(segment.startDate)} – {formatDate(segment.endDate)}
                  </td>
                  <td className="text-right font-mono">{segment.days}</td>
                  <td className="text-right font-mono">{formatCurrency(segment.undrawn)}</td>
                  <td className="text-right font-mono">{formatPercent(segment.feeRate)}</td>
                  <td className="text-right font-mono">{formatCurrency(segment.fee)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="py-2">Fee Subtotal</td>
                <td></td>
                <td></td>
                <td></td>
                <td className="text-right font-mono">{formatCurrency(period.commitmentFeeAccrued)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Total Summary */}
      <div className="bg-primary/5 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-lg">
              {isPik ? 'Total Interest Capitalized' : 'Total Amount Due'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isPik 
                ? 'Added to principal balance'
                : `Please remit payment by ${formatDate(paymentDueDate.toISOString())}`
              }
            </p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${isPik ? 'text-amber-600' : 'text-primary'}`}>
              {formatCurrency(interestCharge)}
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown Summary */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Interest Accrued</span>
            <span className="font-mono">{formatCurrency(period.interestAccrued)}</span>
          </div>
          {period.commitmentFeeAccrued > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commitment Fee</span>
              <span className="font-mono">{formatCurrency(period.commitmentFeeAccrued)}</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex justify-between font-semibold">
            <span>Total Interest Charge</span>
            <span className="font-mono">{formatCurrency(interestCharge)}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Opening Principal</span>
            <span className="font-mono">{formatCurrency(period.openingPrincipal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Closing Principal</span>
            <span className="font-mono">{formatCurrency(period.closingPrincipal)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Net Change</span>
            <span className={`font-mono ${period.closingPrincipal > period.openingPrincipal ? 'text-emerald-600' : 'text-destructive'}`}>
              {period.closingPrincipal >= period.openingPrincipal ? '+' : ''}
              {formatCurrency(period.closingPrincipal - period.openingPrincipal)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Instructions (only for cash pay) */}
      {!isPik && (
        <>
          <Separator />
          <div className="text-sm text-muted-foreground space-y-2">
            <h4 className="font-medium text-foreground">Payment Instructions</h4>
            <p>Please wire the amount due to the following account:</p>
            <div className="bg-muted/30 rounded p-4 font-mono text-xs space-y-1">
              <p>Bank: [Bank Name]</p>
              <p>Account Name: Rax Finance</p>
              <p>IBAN: [IBAN Number]</p>
              <p>BIC/SWIFT: [BIC Code]</p>
              <p>Reference: {period.periodId.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-4 border-t">
        <p>This notice was generated automatically. Day count convention: 30E/360 (Eurobond).</p>
        <p>For questions, contact your relationship manager.</p>
      </div>
    </div>
  );
}

function NoticeStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'sent':
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          Sent
        </Badge>
      );
    case 'approved':
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          Ready
        </Badge>
      );
    case 'submitted':
      return (
        <Badge variant="secondary">
          Pending
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          Draft
        </Badge>
      );
  }
}

interface WorkflowStepProps {
  number: number;
  title: string;
  description: string;
  completed: boolean;
}

function WorkflowStep({ number, title, description, completed }: WorkflowStepProps) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
        completed 
          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
          : 'bg-muted text-muted-foreground'
      }`}>
        {completed ? '✓' : number}
      </div>
      <div>
        <p className={`text-sm font-medium ${completed ? 'text-foreground' : 'text-muted-foreground'}`}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
