import { useState, useMemo } from 'react';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';
import { useMonthlyApprovalDetails, useApproveMonth } from '@/hooks/useMonthlyApproval';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
  Clock,
  FileCheck,
  Zap
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { Link } from 'react-router-dom';

export default function MonthlyApproval() {
  const [currentMonth, setCurrentMonth] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM'));
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data, isLoading } = useMonthlyApprovalDetails(currentMonth);
  const approveMonth = useApproveMonth();
  const { isController } = useAuth();

  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const newDate = subMonths(new Date(year, month - 1), 1);
    setCurrentMonth(format(newDate, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const newDate = addMonths(new Date(year, month - 1), 1);
    setCurrentMonth(format(newDate, 'yyyy-MM'));
  };

  const handleApprove = async () => {
    await approveMonth.mutateAsync({ yearMonth: currentMonth, notes: approvalNotes || undefined });
    setApprovalNotes('');
    setIsDialogOpen(false);
  };

  const stats = useMemo(() => {
    if (!data?.periods) return { auto: 0, manual: 0, approved: 0, exceptions: 0 };
    
    return {
      auto: data.periods.filter(p => p.processing_mode === 'auto').length,
      manual: data.periods.filter(p => p.processing_mode === 'manual').length,
      approved: data.periods.filter(p => p.status === 'approved').length,
      exceptions: data.periods.filter(p => p.has_economic_events).length,
    };
  }, [data]);

  const displayMonth = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    return format(new Date(year, month - 1), 'MMMM yyyy');
  }, [currentMonth]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const isApproved = data?.status === 'approved';
  const canApprove = isController && !isApproved && data?.periods?.length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header with prominent month display */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Monthly Approval</h1>
            <p className="text-muted-foreground">
              Review and approve all periods for a month in one batch
            </p>
          </div>
        </div>
        
        {/* Prominent Month Selector */}
        <div className="flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg border">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-10 w-10">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Approval Period</p>
            <p className="text-3xl font-bold text-primary">{displayMonth}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-10 w-10">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      {isApproved && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CardContent className="py-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                This month has been approved
              </p>
              {data?.approved_at && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Approved on {formatDate(data.approved_at)}
                  {data.notes && ` — ${data.notes}`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works Callout - only show when not approved */}
      {!isApproved && (
        <Card className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 dark:text-blue-100">How Monthly Approval Works</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Each loan has a billing period for this month. Periods without economic events are <strong>auto-processed</strong>. 
                  Periods with draws, repayments, or rate changes are flagged <strong>Manual</strong> for your review.
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  <strong>To approve:</strong> Review any periods marked "Economic events", click "View Loan" to check details, 
                  then click <strong>"Approve All Periods"</strong> to batch-approve the entire month.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Periods</p>
                <p className="text-2xl font-bold">{data?.total_periods || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Loans billing this month</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auto-Processed</p>
                <p className="text-2xl font-bold text-green-600">{stats.auto}</p>
                <p className="text-xs text-muted-foreground mt-1">No changes, ready to go</p>
              </div>
              <Zap className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.exceptions > 0 ? 'ring-2 ring-amber-300 dark:ring-amber-600' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Review</p>
                <p className="text-2xl font-bold text-amber-600">{stats.exceptions}</p>
                <p className="text-xs text-muted-foreground mt-1">Has economic events</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Already Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-xs text-muted-foreground mt-1">Previously approved</p>
              </div>
              <FileCheck className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Periods Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Periods for {displayMonth}</CardTitle>
            <CardDescription>
              {stats.exceptions > 0 
                ? `${stats.exceptions} period(s) contain economic events requiring review`
                : 'All periods processed automatically without exceptions'}
            </CardDescription>
          </div>
          {canApprove && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve All Periods
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve {displayMonth}</DialogTitle>
                  <DialogDescription>
                    This will approve all {data?.total_periods} periods for this month.
                    {stats.exceptions > 0 && (
                      <span className="block mt-2 text-amber-600">
                        ⚠️ {stats.exceptions} period(s) contain economic events that you should review first.
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Textarea
                    placeholder="Add any notes about this approval..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    className="mt-2"
                  />
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
          )}
        </CardHeader>
        <CardContent>
          {data?.periods?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No periods found for this month
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan ID</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>
                    <span title="Auto = no changes this period. Manual = has events requiring review.">
                      Processing
                    </span>
                  </TableHead>
                  <TableHead>
                    <span title="Open = awaiting approval. Approved = finalized.">
                      Status
                    </span>
                  </TableHead>
                  <TableHead>
                    <span title="Periods with draws, repayments, or rate changes need review.">
                      Exceptions
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.periods?.map((period) => (
                  <TableRow key={period.id} className={period.has_economic_events ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                    <TableCell className="font-medium font-mono text-sm">
                      {period.loans?.loan_id || period.loan_id?.slice(0, 8) || 'Unknown'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDate(period.period_start)} – {formatDate(period.period_end)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={period.processing_mode === 'auto' ? 'secondary' : 'outline'}>
                        {period.processing_mode === 'auto' ? (
                          <>
                            <Zap className="h-3 w-3 mr-1" />
                            Auto
                          </>
                        ) : (
                          'Manual'
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        period.status === 'approved' ? 'default' :
                        period.status === 'submitted' ? 'secondary' :
                        'outline'
                      }>
                        {period.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {period.has_economic_events ? (
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">Economic events</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/loans/${period.loan_id}`}>View Loan</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Workflow Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Approval Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-semibold text-primary">1</span>
              </div>
              <div>
                <h4 className="font-medium">Daily Accruals</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  System automatically calculates interest and fees daily. No action needed.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-semibold text-primary">2</span>
              </div>
              <div>
                <h4 className="font-medium">Review Exceptions</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Periods with economic events (draws, repayments, rate changes) are flagged for review.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-semibold text-primary">3</span>
              </div>
              <div>
                <h4 className="font-medium">Batch Approve</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Controller approves all periods for the month in one action.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
