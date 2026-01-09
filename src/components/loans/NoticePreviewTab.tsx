import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format';
import { PeriodAccrual, AccrualsSummary, InterestSegment } from '@/lib/loanCalculations';
import { Loan } from '@/types/loan';
import { getCurrentDateString } from '@/lib/simulatedDate';
import {
  FileText, 
  Download, 
  Send, 
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  ChevronRight,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';

interface NoticePreviewTabProps {
  loan: Loan;
  periodAccruals: PeriodAccrual[];
  summary: AccrualsSummary;
  isLoading: boolean;
}

export function NoticePreviewTab({ loan, periodAccruals, summary, isLoading }: NoticePreviewTabProps) {
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
                        {formatCurrency(period.totalDue)}
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
              description="Daily interest calculated automatically"
              completed={true}
            />
            <WorkflowStep 
              number={2} 
              title="Monthly Approval" 
              description="Controller reviews & batch approves"
              completed={selectedPeriod?.status === 'approved' || selectedPeriod?.status === 'sent'}
            />
            <WorkflowStep 
              number={3} 
              title="Notice Generated" 
              description="PDF created with calculations"
              completed={selectedPeriod?.status === 'approved' || selectedPeriod?.status === 'sent'}
            />
            <WorkflowStep 
              number={4} 
              title="Sent to Borrower" 
              description="Email with PDF attachment"
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
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Interest Notice Preview</span>
                <NoticeStatusBadge status={selectedPeriod.status} />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {selectedPeriod.status === 'approved' && (
                  <Button size="sm">
                    <Send className="h-4 w-4 mr-2" />
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
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
}

function NoticeDocument({ loan, period, summary }: NoticeDocumentProps) {
  const paymentDueDate = new Date(period.periodEnd);
  paymentDueDate.setDate(paymentDueDate.getDate() + 5); // Assume 5 business days

  return (
    <div className="max-w-3xl mx-auto space-y-8 font-serif">
      {/* Letterhead */}
      <div className="text-center border-b pb-6">
        <h1 className="text-2xl font-bold tracking-tight">INTEREST PAYMENT NOTICE</h1>
        <p className="text-muted-foreground mt-2">Private Credit Fund</p>
      </div>

      {/* Recipient & Reference */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <p className="text-sm text-muted-foreground mb-1">To:</p>
          <p className="font-semibold text-lg">{loan.borrower_name}</p>
          {loan.loan_name && (
            <p className="text-muted-foreground">{loan.loan_name}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground mb-1">Notice Date:</p>
          <p className="font-mono">{formatDate(getCurrentDateString())}</p>
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
            <p className="text-xs text-muted-foreground">({period.days} days)</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Amount Due</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {formatCurrency(period.totalDue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Payment Due Date</p>
            <p className="font-mono font-medium mt-1">
              {formatDate(paymentDueDate.toISOString())}
            </p>
          </div>
        </div>
      </div>

      {/* Calculation Details */}
      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Interest Calculation
        </h3>
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
                <td className="text-right font-mono">{formatPercent(segment.rate, 4)}</td>
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
                  <td className="text-right font-mono">{formatPercent(segment.feeRate, 4)}</td>
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
            <h3 className="font-semibold text-lg">Total Amount Due</h3>
            <p className="text-sm text-muted-foreground">
              Please remit payment by {formatDate(paymentDueDate.toISOString())}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{formatCurrency(period.totalDue)}</p>
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
          {period.feesInvoiced > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Other Fees</span>
              <span className="font-mono">{formatCurrency(period.feesInvoiced)}</span>
            </div>
          )}
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
          {period.pikCapitalized > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">PIK Capitalized</span>
              <span className="font-mono text-amber-600">+{formatCurrency(period.pikCapitalized)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Instructions */}
      <Separator />
      <div className="text-sm text-muted-foreground space-y-2">
        <h4 className="font-medium text-foreground">Payment Instructions</h4>
        <p>Please wire the amount due to the following account:</p>
        <div className="bg-muted/30 rounded p-4 font-mono text-xs space-y-1">
          <p>Bank: [Bank Name]</p>
          <p>Account Name: Private Credit Fund</p>
          <p>IBAN: [IBAN Number]</p>
          <p>BIC/SWIFT: [BIC Code]</p>
          <p>Reference: {period.periodId.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-4 border-t">
        <p>This notice was generated automatically. Day count convention: ACT/365 Fixed.</p>
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
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Sent
        </Badge>
      );
    case 'approved':
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          <Eye className="h-3 w-3 mr-1" />
          Ready
        </Badge>
      );
    case 'submitted':
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <AlertTriangle className="h-3 w-3 mr-1" />
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
        {completed ? <CheckCircle2 className="h-4 w-4" /> : number}
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
