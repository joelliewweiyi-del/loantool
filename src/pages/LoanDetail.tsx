import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLoan, useLoanEvents, useLoanPeriods, useLoanFacilities, useCreateLoanEvent, useApproveEvent, useDeleteLoan, useCloseOutLoan } from '@/hooks/useLoans';
import { useAccruals } from '@/hooks/useAccruals';
import { useAfasDepotPayments } from '@/hooks/useAfasCashPayments';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/loans/LoanStatusBadge';
import { EditLoanDialog } from '@/components/loans/EditLoanDialog';
import { ActivatePipelineLoanDialog } from '@/components/loans/ActivatePipelineLoanDialog';
import { isPipelineVehicle } from '@/lib/constants';
import { PipelineStageBadge } from '@/components/loans/PipelineStageBadge';
import { AccrualsTab } from '@/components/loans/AccrualsTab';
import { NoticePreviewTab } from '@/components/loans/NoticePreviewTab';
import { ActivityTab } from '@/components/loans/ActivityTab';
import { DocumentsTab } from '@/components/loans/DocumentsTab';
import { CollateralTab } from '@/components/loans/CollateralTab';
import { CovenantTab } from '@/components/loans/CovenantTab';
import { RentRollTab } from '@/components/loans/RentRollTab';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { formatCurrency, formatCurrencyShort, formatDate, formatDateTime, formatPercent, formatEventType } from '@/lib/format';
import { getCurrentDate } from '@/lib/simulatedDate';
import { FinancialStrip } from '@/components/loans/FinancialStrip';
import { Skeleton } from '@/components/ui/skeleton';
import { EventType } from '@/types/loan';
import { 
  ArrowLeft, 
  Plus, 
  Check,
  FileText,
  Clock,
  Landmark,
  TrendingUp,
  Mail,
  Trash2,
  MessageSquare,
  FolderOpen,
  Shield,
  Building2
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const eventTypes: EventType[] = [
  'principal_draw',
  'principal_repayment',
  'interest_rate_set',
  'interest_rate_change',
  'pik_flag_set',
  'commitment_set',
  'commitment_change',
  'commitment_cancel',
  'cash_received',
  'fee_invoice',
];

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: loan, isLoading: loanLoading } = useLoan(id);
  const { data: events, isLoading: eventsLoading } = useLoanEvents(id);
  const { data: periods } = useLoanPeriods(id);
  const { data: facilities } = useLoanFacilities(id);
  const { periodAccruals, summary: accrualsSummary, isLoading: accrualsLoading } = useAccruals(id);
  const depotEvent = events?.find(e =>
    e.event_type === 'principal_draw' &&
    ((e.metadata as Record<string, unknown> | null)?.description as string || '').toLowerCase().includes('depot')
  );
  const depotReserve = depotEvent?.amount ?? 0;
  const { data: depotPayments } = useAfasDepotPayments(loan?.loan_id, depotReserve > 0);
  const depotUsed = (depotPayments ?? []).filter(p => p.amount > 0).reduce((sum, p) => sum + p.amount, 0);
  const depotRemaining = depotReserve - depotUsed;
  const { user, isController, isPM, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const createEvent = useCreateLoanEvent();
  const approveEvent = useApproveEvent();
  const deleteLoan = useDeleteLoan();
  const closeOutLoan = useCloseOutLoan();

  const [isEventOpen, setIsEventOpen] = useState(false);
  const [eventType, setEventType] = useState<EventType>('principal_draw');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [description, setDescription] = useState('');
  const [feeType, setFeeType] = useState<string>('arrangement');
  const [feePaymentType, setFeePaymentType] = useState<'cash' | 'pik'>('cash');
  const [lastEditedField, setLastEditedField] = useState<'amount' | 'rate' | null>(null);

  // Get current principal for fee calculations
  const currentPrincipal = accrualsSummary.currentPrincipal || 0;

  const canCreateEvents = isPM || isController;
  const canApproveEvents = isController;

  const handleCreateEvent = async () => {
    if (!id || !user) return;
    
    const metadata: Record<string, unknown> = {};
    if (description) {
      metadata.description = description;
    }
    if (eventType === 'fee_invoice') {
      metadata.fee_type = feeType;
      metadata.payment_type = feePaymentType;
    }
    
    await createEvent.mutateAsync({
      loan_id: id,
      facility_id: null,
      event_type: eventType,
      effective_date: effectiveDate,
      value_date: null,
      amount: amount ? parseFloat(amount) : null,
      rate: rate ? parseFloat(rate) / 100 : null,
      metadata,
      status: 'draft',
      created_by: user.id,
    });
    
    setIsEventOpen(false);
    setEventType('principal_draw');
    setEffectiveDate('');
    setAmount('');
    setRate('');
    setDescription('');
    setFeeType('arrangement');
    setFeePaymentType('cash');
  };

  const handleApproveEvent = async (eventId: string) => {
    if (!id) return;
    await approveEvent.mutateAsync({ eventId, loanId: id });
  };

  const handleDeleteLoan = async () => {
    if (!id) return;
    await deleteLoan.mutateAsync(id);
    navigate('/loans');
  };

  if (loanLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Loan not found</h2>
          <Link to="/loans" className="text-primary hover:underline mt-2 inline-block">
            Back to loans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={isMobile ? "px-4 pt-4 pb-4 space-y-5" : "p-6 space-y-6"}>
      {/* Header */}
      <div className={isMobile ? "space-y-3" : "flex items-start justify-between"}>
        <div className={isMobile ? "" : "flex items-center gap-3"}>
          {!isMobile && (
            <Link to="/loans">
              <Button variant="ghost" size="sm" className="gap-1.5 min-h-[44px] min-w-[44px]">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          )}
          <div>
            <div className={isMobile ? "flex items-center gap-2 mb-1.5" : "flex items-center gap-2 flex-wrap"}>
              {isMobile && (
                <Link to="/loans">
                  <Button variant="ghost" size="icon" className="h-11 w-11 -ml-2">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              <span className="font-mono text-sm font-semibold text-primary">{(loan as any).loan_id}</span>
              {!isMobile && <span className="text-foreground-secondary">—</span>}
              {!isMobile && <h1 className="text-lg font-semibold">{loan.borrower_name}</h1>}
              {!isMobile && <StatusBadge status={loan.status} />}
              {!isMobile && isPipelineVehicle(loan.vehicle || '') && (
                <PipelineStageBadge stage={(loan as any).pipeline_stage} />
              )}
            </div>
            {isMobile && (
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{loan.borrower_name}</h1>
                <StatusBadge status={loan.status} />
                {isPipelineVehicle(loan.vehicle || '') && (
                  <PipelineStageBadge stage={(loan as any).pipeline_stage} />
                )}
              </div>
            )}
            {!isMobile && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                (loan as any).interest_payment_type === 'pik'
                  ? 'bg-accent-amber/10 text-accent-amber'
                  : 'bg-muted text-muted-foreground'
              }`}>
                Int: {(loan as any).interest_payment_type === 'pik' ? 'PIK' : 'Cash'}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                (loan as any).fee_payment_type === 'pik'
                  ? 'bg-accent-amber/10 text-accent-amber'
                  : 'bg-muted text-muted-foreground'
              }`}>
                Fees: {(loan as any).fee_payment_type === 'pik' ? 'Withheld' : 'Cash Invoice'}
              </span>
              <span className="text-xs text-foreground-tertiary ml-1">
                Created {formatDate(loan.created_at)} · {loan.notice_frequency} notices
              </span>
            </div>
            )}
          </div>
        </div>
        {!isMobile && (
        <div className="flex items-center gap-2">
          <EditLoanDialog loan={loan} />
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Loan
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Loan Permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{loan.borrower_name}</strong> ({(loan as any).loan_id}) and all associated data including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All loan events ({events?.length || 0} events)</li>
                      <li>All periods and accruals</li>
                      <li>All notice snapshots</li>
                    </ul>
                    <p className="mt-3 font-semibold text-destructive">This action cannot be undone.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteLoan}
                    disabled={deleteLoan.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteLoan.isPending ? 'Deleting...' : 'Delete Permanently'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        )}
      </div>

      {/* Pipeline Banner — desktop only (mobile users cannot activate loans) */}
      {!isMobile && isPipelineVehicle((loan as any).vehicle || '') && (
        <div className="flex items-center justify-between rounded-lg border border-accent-amber/40 bg-accent-amber/5 px-4 py-3">
          <p className="text-sm text-foreground-secondary">
            This is a <span className="font-semibold text-accent-amber">pipeline</span> loan. Activate it when the deal closes to start tracking interest.
          </p>
          {(isPM || isController) && <ActivatePipelineLoanDialog loan={loan} />}
        </div>
      )}

      {/* Close-Out Banner — when loan is repaid but periods need cleanup */}
      {!isMobile && (() => {
        const isRepaid = loan.status === 'repaid' || accrualsSummary.currentPrincipal === 0;
        const lastRepayment = events?.filter(e => e.event_type === 'principal_repayment' && e.status === 'approved')
          .sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0];
        const hasOpenFuturePeriods = lastRepayment && periods?.some(
          p => p.period_start > lastRepayment.effective_date && (p.status === 'open' || p.status === 'submitted')
        );
        if (!isRepaid || !hasOpenFuturePeriods) return null;
        return (
          <div className="flex items-center justify-between rounded-lg border border-accent-sage/40 bg-accent-sage/5 px-4 py-3">
            <p className="text-sm text-foreground-secondary">
              This loan is <span className="font-semibold text-accent-sage">repaid</span> but has uncancelled future periods.
              Close out to truncate the final period and cancel remaining ones.
            </p>
            {isController && (
              <Button
                size="sm"
                onClick={() => closeOutLoan.mutate({ loanId: loan.id })}
                disabled={closeOutLoan.isPending}
              >
                {closeOutLoan.isPending ? 'Closing out...' : 'Close Out Loan'}
              </Button>
            )}
          </div>
        );
      })()}

      {/* Key Loan Metrics Strip */}
      <FinancialStrip items={(() => {
        const showInitial = accrualsSummary.initialLoanAmount > 0 && Math.abs(accrualsSummary.initialLoanAmount - accrualsSummary.currentPrincipal) > 1;
        const hasCommitment = accrualsSummary.totalCommitment > 0;
        return isMobile ? [
          ...(showInitial ? [{ label: 'Initial Loan', value: formatCurrencyShort(accrualsSummary.initialLoanAmount) }] : []),
          { label: 'Outstanding', value: formatCurrencyShort(accrualsSummary.currentPrincipal), accent: 'primary' as const },
          { label: 'Rate', value: formatPercent(accrualsSummary.currentRate, 2) },
          ...(hasCommitment ? [{ label: 'Commitment', value: formatCurrencyShort(accrualsSummary.totalCommitment) }] : []),
        ] : [
          ...(showInitial ? [{ label: 'Initial Loan', value: formatCurrency(accrualsSummary.initialLoanAmount) }] : []),
          { label: 'Outstanding', value: formatCurrency(accrualsSummary.currentPrincipal), accent: 'primary' as const },
          ...(hasCommitment ? [
            { label: 'Commitment', value: formatCurrency(accrualsSummary.totalCommitment) },
          ] : []),
          { label: 'Rate', value: formatPercent(accrualsSummary.currentRate, 2) },
          { label: 'PIK Capitalized', value: formatCurrency(periodAccruals.reduce((sum, p) => sum + p.pikCapitalized, 0)), accent: 'amber' as const },
          ...(hasCommitment ? [
            { label: `Undrawn${accrualsSummary.commitmentFeeRate > 0 ? ` @ ${formatPercent(accrualsSummary.commitmentFeeRate, 2)}` : ''}`, value: formatCurrency(accrualsSummary.currentUndrawn), accent: 'sage' as const },
          ] : []),
          { label: 'Start', value: formatDate(loan.loan_start_date) || '—' },
          { label: 'Maturity', value: formatDate(loan.maturity_date) || '—' },
          ...(loan.walt != null ? [{ label: 'WALT', value: `${loan.walt}y` }] : []),
        ];
      })()} />

      {/* Depot Balance Strip — only for loans with a depot reserve event */}
      {depotReserve > 0 && (
        <FinancialStrip items={isMobile ? [
          { label: 'Reserve', value: formatCurrencyShort(depotReserve) },
          { label: 'Used', value: formatCurrencyShort(depotUsed), accent: 'amber' },
          { label: 'Remaining', value: formatCurrencyShort(depotRemaining), accent: depotRemaining > 0 ? 'sage' : 'destructive' },
        ] : [
          { label: 'Depot Reserve', value: formatCurrency(depotReserve) },
          { label: 'Depot Used', value: formatCurrency(depotUsed), accent: 'amber' },
          { label: 'Depot Remaining', value: formatCurrency(depotRemaining), accent: depotRemaining > 0 ? 'sage' : 'destructive' },
        ]} />
      )}

      {/* Amortization Strip — only for loans with scheduled amortization */}
      {loan.amortization_amount && loan.amortization_frequency && (() => {
        const freqLabel: Record<string, string> = { monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-Annual', annual: 'Annual' };
        const freqShort: Record<string, string> = { monthly: '/mo', quarterly: '/qtr', semi_annual: '/semi', annual: '/yr' };
        const startDate = loan.amortization_start_date ? new Date(loan.amortization_start_date + 'T00:00:00') : null;
        const now = getCurrentDate();
        const notStarted = startDate && startDate > now;
        const totalAmortized = periodAccruals.reduce((sum, p) => sum + (p.amortizationDue || 0), 0);
        return (
          <div className={`rounded-lg border-2 ${notStarted ? 'border-accent-amber/40 bg-accent-amber/5' : 'border-primary/30 bg-primary/5'}`}>
            <FinancialStrip className="border-0" items={isMobile ? [
              { label: 'Amortization', value: `${formatCurrencyShort(loan.amortization_amount)}${freqShort[loan.amortization_frequency!] || ''}`, accent: notStarted ? 'amber' : 'primary' },
              { label: 'Starts', value: formatDate(loan.amortization_start_date) || '—', accent: notStarted ? 'amber' : undefined },
              ...(totalAmortized > 0 ? [{ label: 'Total Amortized', value: formatCurrencyShort(totalAmortized) }] : []),
            ] : [
              { label: 'Scheduled Amortization', value: formatCurrency(loan.amortization_amount), accent: notStarted ? 'amber' : 'primary' },
              { label: 'Frequency', value: freqLabel[loan.amortization_frequency!] || loan.amortization_frequency!, mono: false },
              { label: notStarted ? 'Starts' : 'Started', value: formatDate(loan.amortization_start_date) || '—', accent: notStarted ? 'amber' : undefined },
              { label: 'Payment Timing', value: (loan as any).payment_timing === 'in_advance' ? 'In Advance' : 'In Arrears', mono: false },
              ...(totalAmortized > 0 ? [{ label: 'Total Amortized', value: formatCurrency(totalAmortized) }] : []),
            ]} />
          </div>
        );
      })()}

      {/* Tabs */}
      <Tabs defaultValue={isMobile ? "activity" : "accruals"} className="space-y-4">
        <TabsList className={isMobile ? "w-full overflow-x-auto flex" : "overflow-x-auto"}>
          {!isMobile && <TabsTrigger value="accruals">Interest Periods</TabsTrigger>}
          {!isMobile && (
            <TabsTrigger value="notices">
              <Mail className="h-4 w-4 mr-1.5" />
              Notices
            </TabsTrigger>
          )}
          {!isMobile && <TabsTrigger value="events">Event Ledger</TabsTrigger>}
          <TabsTrigger value="activity">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FolderOpen className="h-4 w-4 mr-1.5" />
            {isMobile ? 'Docs' : 'Documents'}
          </TabsTrigger>
          <TabsTrigger value="rent-roll">
            <Building2 className="h-4 w-4 mr-1.5" />
            {isMobile ? 'Rent' : 'Rent Roll'}
          </TabsTrigger>
          <TabsTrigger value="covenants">
            <Shield className="h-4 w-4 mr-1.5" />
            {isMobile ? 'Cov.' : 'Covenants'}
          </TabsTrigger>
          <TabsTrigger value="collateral">
            <Landmark className="h-4 w-4 mr-1.5" />
            {isMobile ? 'Security' : 'Collateral'}
          </TabsTrigger>
          {isMobile && <TabsTrigger value="accruals">Periods</TabsTrigger>}
          {isMobile && <TabsTrigger value="events">Events</TabsTrigger>}
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card className={isMobile ? 'border-0 shadow-none bg-transparent' : ''}>
            <CardHeader className={isMobile ? 'px-0 pt-0 pb-3' : 'flex flex-row items-center justify-between'}>
              {!isMobile && (
              <div>
                <CardTitle>Event Ledger</CardTitle>
                <CardDescription>Append-only record of all economic events</CardDescription>
              </div>
              )}
              {!isMobile && canCreateEvents && (
                <Dialog open={isEventOpen} onOpenChange={setIsEventOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Event</DialogTitle>
                      <DialogDescription>
                        Add a new event to the ledger. Events start in draft status.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Event Type</Label>
                        <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {eventTypes.map(type => (
                              <SelectItem key={type} value={type}>
                                {formatEventType(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Fee-specific fields */}
                      {eventType === 'fee_invoice' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Fee Type</Label>
                            <Select value={feeType} onValueChange={setFeeType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="arrangement">Arrangement Fee</SelectItem>
                                <SelectItem value="extension">Extension Fee</SelectItem>
                                <SelectItem value="exit">Exit Fee</SelectItem>
                                <SelectItem value="monitoring">Monitoring Fee</SelectItem>
                                <SelectItem value="waiver">Waiver Fee</SelectItem>
                                <SelectItem value="legal">Legal Fee</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Payment Type</Label>
                            <Select value={feePaymentType} onValueChange={(v) => setFeePaymentType(v as 'cash' | 'pik')}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash (Paid Out)</SelectItem>
                                <SelectItem value="pik">PIK (Rolled Up)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label>Effective Date</Label>
                        <Input
                          type="date"
                          value={effectiveDate}
                          onChange={(e) => setEffectiveDate(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Amount (EUR)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => {
                              const newAmount = e.target.value;
                              setAmount(newAmount);
                              setLastEditedField('amount');
                              // Auto-calculate rate for fee_invoice when amount changes
                              if (eventType === 'fee_invoice' && currentPrincipal > 0 && newAmount) {
                                const calculatedRate = (parseFloat(newAmount) / currentPrincipal) * 100;
                                setRate(calculatedRate.toFixed(4));
                              }
                            }}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rate (%)</Label>
                          <Input
                            type="number"
                            step="0.0001"
                            value={rate}
                            onChange={(e) => {
                              const newRate = e.target.value;
                              setRate(newRate);
                              setLastEditedField('rate');
                              // Auto-calculate amount for fee_invoice when rate changes
                              if (eventType === 'fee_invoice' && currentPrincipal > 0 && newRate) {
                                const calculatedAmount = (parseFloat(newRate) / 100) * currentPrincipal;
                                setAmount(calculatedAmount.toFixed(2));
                              }
                            }}
                            placeholder="0.0000"
                          />
                        </div>
                      </div>
                      {eventType === 'fee_invoice' && currentPrincipal > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Based on current principal of {formatCurrency(currentPrincipal)}
                        </p>
                      )}
                      <div className="space-y-2">
                        <Label>Description (optional)</Label>
                        <Input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="e.g., Initial draw, Q4 extension fee..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEventOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateEvent}
                        disabled={!effectiveDate || createEvent.isPending}
                      >
                        {createEvent.isPending ? 'Creating...' : 'Create Event'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent className={isMobile ? 'px-0' : ''}>
              {eventsLoading ? (
                <Skeleton className="h-48" />
              ) : (() => {
                // Build a set of event IDs that have been reversed
                const reversedEventIds = new Set<string>();
                (events || []).forEach(event => {
                  const meta = event.metadata as Record<string, unknown> | null;
                  if (meta?.reverses_event_id) {
                    reversedEventIds.add(meta.reverses_event_id as string);
                  }
                });

                // Filter out system events and correction pairs
                const filtered = [...events || []]
                  .filter(event => {
                    if (event.event_type === 'cash_received') return false;
                    const meta = event.metadata as Record<string, unknown> | null;
                    if (meta?.correction === true) return false;
                    if (event.event_type === 'principal_repayment' && meta?.adjustment_type === 'fee_split') return false;
                    if (reversedEventIds.has(event.id)) return false;
                    if (event.event_type === 'pik_capitalization_posted' &&
                        event.status === 'approved' &&
                        meta?.auto_generated === true) return false;
                    return true;
                  })
                  .sort((a, b) =>
                    new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
                  );

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      No events recorded yet
                    </div>
                  );
                }

                const getEventDescription = (event: typeof filtered[0]) => {
                  const meta = event.metadata as Record<string, unknown> | null;
                  const description = (meta?.description ?? meta?.afas_description) as string | undefined;
                  if (event.event_type === 'fee_invoice') {
                    const feeType = meta?.fee_type as string | undefined;
                    const paymentType = meta?.payment_type as string | undefined;
                    if (feeType?.includes('arrangement') || meta?.adjustment_type === 'fee_split') {
                      return 'Arrangement fee (withheld)';
                    }
                    if (description) return description;
                    if (feeType) return `${feeType} fee`;
                  }
                  if (description) return description;
                  return null;
                };

                // Mobile: card list
                if (isMobile) {
                  return (
                    <div className="space-y-2">
                      {filtered.map(event => (
                        <div key={event.id} className="rounded-xl border bg-card px-4 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-foreground-secondary">
                              {formatEventType(event.event_type)}
                            </span>
                            <StatusBadge status={event.status} />
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="font-mono text-xs text-foreground-tertiary">
                              {formatDate(event.effective_date)}
                            </span>
                            <div className="text-right">
                              {event.amount != null && event.amount !== 0 && (
                                <span className="font-mono text-sm font-semibold">
                                  {formatCurrency(event.amount)}
                                </span>
                              )}
                              {event.rate != null && event.rate !== 0 && (
                                <span className="font-mono text-sm font-semibold ml-2">
                                  {formatPercent(event.rate)}
                                </span>
                              )}
                            </div>
                          </div>
                          {getEventDescription(event) && (
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {getEventDescription(event)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                }

                // Desktop: table
                return (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Rate</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(event => (
                        <tr key={event.id}>
                          <td className="font-mono">{formatDate(event.effective_date)}</td>
                          <td>{formatEventType(event.event_type)}</td>
                          <td className="text-muted-foreground text-sm max-w-[200px] truncate">
                            {getEventDescription(event) || '—'}
                          </td>
                          <td className="numeric">{formatCurrency(event.amount)}</td>
                          <td className="numeric">{formatPercent(event.rate)}</td>
                          <td><StatusBadge status={event.status} /></td>
                          <td className="text-right">
                            {event.status === 'draft' && canApproveEvents && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApproveEvent(event.id)}
                                disabled={approveEvent.isPending}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notices Tab */}
        <TabsContent value="notices">
          <ErrorBoundary fallbackTitle="Notices tab crashed">
            {loan && (
              <NoticePreviewTab
                loan={loan}
                periodAccruals={periodAccruals}
                summary={accrualsSummary}
                isLoading={accrualsLoading}
                events={events}
              />
            )}
          </ErrorBoundary>
        </TabsContent>

        {/* Accruals Tab */}
        <TabsContent value="accruals">
          <ErrorBoundary fallbackTitle="Accruals tab crashed">
            <AccrualsTab
              periodAccruals={periodAccruals}
              summary={accrualsSummary}
              isLoading={accrualsLoading}
              loanId={id}
              loanNumericId={(loan as any)?.loan_id}
              events={events}
              interestType={(loan?.interest_type as 'cash_pay' | 'pik') || 'cash_pay'}
              cashInterestPct={(loan as any)?.cash_interest_percentage}
              initialFacility={loan?.initial_facility}
            />
          </ErrorBoundary>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ErrorBoundary fallbackTitle="Activity tab crashed">
            <ActivityTab loanId={id!} />
          </ErrorBoundary>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <ErrorBoundary fallbackTitle="Documents tab crashed">
            <DocumentsTab loanId={id!} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="rent-roll">
          <ErrorBoundary fallbackTitle="Rent Roll tab crashed">
            <RentRollTab loanId={id!} occupancy={loan?.occupancy} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="covenants">
          <ErrorBoundary fallbackTitle="Covenants tab crashed">
            <CovenantTab loanId={id!} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="collateral">
          <ErrorBoundary fallbackTitle="Collateral tab crashed">
            <CollateralTab loanId={id!} combinedGuaranteeCap={loan?.combined_guarantee_cap ?? null} />
          </ErrorBoundary>
        </TabsContent>

      </Tabs>
    </div>
  );
}
