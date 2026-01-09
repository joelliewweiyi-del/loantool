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

  const canCreateEvents = isPM || isController;
  const canApproveEvents = isController;

  const handleCreateEvent = async () => {
    if (!id || !user) return;
    
    await createEvent.mutateAsync({
      loan_id: id,
      facility_id: null,
      event_type: eventType,
      effective_date: effectiveDate,
      value_date: null,
      amount: amount ? parseFloat(amount) : null,
      rate: rate ? parseFloat(rate) / 100 : null,
      metadata: {},
      status: 'draft',
      created_by: user.id,
    });
    
    setIsEventOpen(false);
    setEventType('principal_draw');
    setEffectiveDate('');
    setAmount('');
    setRate('');
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
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="notices">
            <Mail className="h-4 w-4 mr-2" />
            Interest Notices
          </TabsTrigger>
          <TabsTrigger value="accruals">Accruals</TabsTrigger>
          <TabsTrigger value="periods">Periods</TabsTrigger>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
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
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rate (%)</Label>
                          <Input
                            type="number"
                            step="0.0001"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            placeholder="0.0000"
                          />
                        </div>
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
              ) : events?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No events recorded yet
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Rate</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...events || []].sort((a, b) => 
                      new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
                    ).map(event => (
                      <tr key={event.id}>
                        <td className="font-mono">{formatDate(event.effective_date)}</td>
                        <td>{formatEventType(event.event_type)}</td>
                        <td className="numeric">{formatCurrency(event.amount)}</td>
                        <td className="numeric">{formatPercent(event.rate)}</td>
                        <td><StatusBadge status={event.status} /></td>
                        <td className="text-muted-foreground text-xs">
                          {formatDateTime(event.created_at)}
                        </td>
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
            />
          )}
        </TabsContent>

        {/* Accruals Tab */}
        <TabsContent value="accruals">
          <AccrualsTab 
            periodAccruals={periodAccruals} 
            summary={accrualsSummary} 
            isLoading={accrualsLoading} 
          />
        </TabsContent>

        {/* Periods Tab */}
        <TabsContent value="periods">
          <Card>
            <CardHeader>
              <CardTitle>Notice Periods</CardTitle>
              <CardDescription>Monthly notice periods and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {periods?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No periods created yet
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Approved</th>
                      <th>Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...periods || []].sort((a, b) => 
                      new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
                    ).map(period => (
                      <tr key={period.id}>
                        <td className="font-mono">
                          {formatDate(period.period_start)} – {formatDate(period.period_end)}
                        </td>
                        <td><StatusBadge status={period.status} /></td>
                        <td className="text-muted-foreground">{formatDateTime(period.submitted_at)}</td>
                        <td className="text-muted-foreground">{formatDateTime(period.approved_at)}</td>
                        <td className="text-muted-foreground">{formatDateTime(period.sent_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facilities Tab */}
        <TabsContent value="facilities">
          <Card>
            <CardHeader>
              <CardTitle>Facilities</CardTitle>
              <CardDescription>Commitment facilities (capex, interest depot, etc.)</CardDescription>
            </CardHeader>
            <CardContent>
              {facilities?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No facilities created yet
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th className="text-right">Commitment</th>
                      <th className="text-right">Fee Rate</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...facilities || []].sort((a, b) => 
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    ).map(facility => (
                      <tr key={facility.id}>
                        <td className="capitalize">{facility.facility_type.replace('_', ' ')}</td>
                        <td className="numeric">{formatCurrency(facility.commitment_amount)}</td>
                        <td className="numeric">{formatPercent(facility.commitment_fee_rate)}</td>
                        <td className="text-muted-foreground">{formatDate(facility.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
