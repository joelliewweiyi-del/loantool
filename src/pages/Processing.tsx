import { useState } from 'react';
import { useProcessingJobs, useTriggerDailyAccruals } from '@/hooks/useMonthlyApproval';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { format } from 'date-fns';

function getJobStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'default';
    case 'running': return 'secondary';
    case 'failed': return 'destructive';
    default: return 'outline';
  }
}

function getJobStatusIcon(status: string) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="h-4 w-4" />;
    case 'running': return <Loader2 className="h-4 w-4 animate-spin" />;
    case 'failed': return <XCircle className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
}

function formatJobType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDuration(start: string | null, end: string | null) {
  if (!start) return '—';
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  if (duration < 60) return `${duration}s`;
  return `${Math.floor(duration / 60)}m ${duration % 60}s`;
}

export default function Processing() {
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: jobs, isLoading, refetch } = useProcessingJobs();
  const triggerAccruals = useTriggerDailyAccruals();
  const { isController } = useAuth();

  const handleRunAccruals = async () => {
    await triggerAccruals.mutateAsync(manualDate);
    setIsDialogOpen(false);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const recentJobs = jobs || [];
  const lastJob = recentJobs[0];
  const completedJobs = recentJobs.filter(j => j.status === 'completed').length;
  const failedJobs = recentJobs.filter(j => j.status === 'failed').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Processing Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage automated accrual processing jobs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {isController && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Run Accruals
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Run Daily Accruals</DialogTitle>
                  <DialogDescription>
                    Manually trigger the daily accrual processing. This will calculate interest and fees for all active loans.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <label className="text-sm font-medium">Processing Date</label>
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Accruals will be calculated for this date. Existing entries for this date will be skipped.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRunAccruals} disabled={triggerAccruals.isPending}>
                    {triggerAccruals.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Run Processing'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Run</p>
                <p className="text-lg font-medium">
                  {lastJob ? formatDateTime(lastJob.created_at).split(' ')[0] : 'Never'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Status</p>
                {lastJob ? (
                  <Badge variant={getJobStatusColor(lastJob.status)} className="mt-1">
                    {getJobStatusIcon(lastJob.status)}
                    <span className="ml-1 capitalize">{lastJob.status}</span>
                  </Badge>
                ) : (
                  <p className="text-lg font-medium">—</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed (50 recent)</p>
                <p className="text-2xl font-bold text-green-600">{completedJobs}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed (50 recent)</p>
                <p className="text-2xl font-bold text-red-600">{failedJobs}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Processing Jobs</CardTitle>
          <CardDescription>
            Last 50 processing jobs. Daily accruals run automatically at midnight.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No processing jobs yet. Run your first accrual processing to see results here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      {formatJobType(job.job_type)}
                      {job.metadata && typeof job.metadata === 'object' && 'processing_date' in job.metadata && (
                        <span className="text-muted-foreground text-sm ml-2">
                          ({String((job.metadata as Record<string, unknown>).processing_date)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getJobStatusColor(job.status)}>
                        {getJobStatusIcon(job.status)}
                        <span className="ml-1 capitalize">{job.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {job.started_at ? formatDateTime(job.started_at) : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDuration(job.started_at, job.completed_at)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {job.processed_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {job.error_count > 0 ? (
                        <Badge variant="destructive">{job.error_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Scheduling Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Automated Processing Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Daily Accruals</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Runs daily at midnight UTC. Calculates interest and commitment fees for all active loans.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium">Month-End Processing</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Runs on the last day of each month. Closes periods and prepares for monthly approval.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
