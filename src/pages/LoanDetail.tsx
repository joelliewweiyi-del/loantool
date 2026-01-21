import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLoan, useLoanEvents, useLoanPeriods, useLoanFacilities, useCreateLoanEvent, useApproveEvent } from '@/hooks/useLoans';
import { useAccruals } from '@/hooks/useAccruals';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/loans/LoanStatusBadge';
import { AccrualsTab } from '@/components/loans/AccrualsTab';
import { NoticePreviewTab } from '@/components/loans/NoticePreviewTab';
import { formatCurrency, formatDate, formatDateTime, formatPercent, formatEventType } from '@/lib/format';
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
  Mail
} from 'lucide-react';

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
  const { data: loan, isLoading: loanLoading } = useLoan(id);
  const { data: events, isLoading: eventsLoading } = useLoanEvents(id);
  const { data: periods } = useLoanPeriods(id);
  const { data: facilities } = useLoanFacilities(id);
  const { periodAccruals, summary: accrualsSummary, isLoading: accrualsLoading } = useAccruals(id);
  const { user, isController, isPM } = useAuth();
  const createEvent = useCreateLoanEvent();
  const approveEvent = useApproveEvent();

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link to="/loans">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{loan.loan_name || loan.borrower_name}</h1>
              <StatusBadge status={loan.status} />
              <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                {loan.loan_type === 'committed_facility' ? 'Construction' : 'Bullet'}
              </span>
              {loan.interest_type === 'pik' && (
                <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">
                  PIK
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {loan.borrower_name} • Created {formatDate(loan.created_at)} • {loan.notice_frequency} notices
            </p>
          </div>
        </div>
      </div>

      {/* Key Loan Metrics Bar */}
      <div className="grid grid-cols-7 gap-4 py-3 px-4 bg-background border-l-4 border-l-primary border rounded-sm shadow-sm">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Outstanding Amount</div>
          <div className="text-lg font-semibold font-mono text-primary">{formatCurrency(accrualsSummary.currentPrincipal)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Commitment</div>
          <div className="text-lg font-semibold font-mono">{formatCurrency(accrualsSummary.totalCommitment)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Rate</div>
          <div className="text-lg font-semibold font-mono">{formatPercent(accrualsSummary.currentRate, 2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">PIK Capitalized</div>
          <div className="text-lg font-semibold font-mono text-amber-600">{formatCurrency(periodAccruals.reduce((sum, p) => sum + p.pikCapitalized, 0))}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Undrawn</div>
          <div className="text-lg font-semibold font-mono text-green-600">{formatCurrency(accrualsSummary.currentUndrawn)}</div>
          {accrualsSummary.commitmentFeeRate > 0 && (
            <div className="text-xs text-muted-foreground">@ {formatPercent(accrualsSummary.commitmentFeeRate, 2)}</div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Start Date</div>
          <div className="text-lg font-semibold font-mono">{formatDate(loan.loan_start_date)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Maturity Date</div>
          <div className="text-lg font-semibold font-mono">{formatDate(loan.maturity_date)}</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="accruals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accruals">Accruals</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="notices">
            <Mail className="h-4 w-4 mr-2" />
            Interest Notices
          </TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Event Ledger</CardTitle>
                <CardDescription>Append-only record of all economic events</CardDescription>
              </div>
              {canCreateEvents && (
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
            <CardContent>
              {eventsLoading ? (
                <Skeleton className="h-48" />
              ) : events?.filter(e => e.event_type !== 'pik_capitalization_posted')?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No events recorded yet
                </div>
              ) : (
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
                    {(() => {
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
                          // Show PIK capitalizations (interest charges) for approval
                          // Hide cash received (accounting entries, not economic events)
                          if (event.event_type === 'cash_received') return false;
                          // Hide correction/reversal entries
                          const meta = event.metadata as Record<string, unknown> | null;
                          if (meta?.correction === true) return false;
                          // Hide entries that have been reversed by another event
                          if (reversedEventIds.has(event.id)) return false;
                          // Hide auto-generated system events that are already approved
                          if (event.event_type === 'pik_capitalization_posted' && 
                              event.status === 'approved' && 
                              meta?.auto_generated === true) return false;
                          return true;
                        })
                        .sort((a, b) => 
                          new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
                        );
                      
                      return filtered.map(event => {
                        const meta = event.metadata as Record<string, unknown> | null;
                        const description = meta?.description as string | undefined;
                        
                        return (
                          <tr key={event.id}>
                            <td className="font-mono">{formatDate(event.effective_date)}</td>
                            <td>{formatEventType(event.event_type)}</td>
                            <td className="text-muted-foreground text-sm max-w-[200px] truncate">
                              {description || '—'}
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
                        );
                      });
                    })()}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notices Tab */}
        <TabsContent value="notices">
          {loan && (
            <NoticePreviewTab 
              loan={loan}
              periodAccruals={periodAccruals} 
              summary={accrualsSummary} 
              isLoading={accrualsLoading}
              events={events}
            />
          )}
        </TabsContent>

        {/* Accruals Tab */}
        <TabsContent value="accruals">
          <AccrualsTab 
            periodAccruals={periodAccruals} 
            summary={accrualsSummary} 
            isLoading={accrualsLoading}
            loanId={id}
            events={events}
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}
