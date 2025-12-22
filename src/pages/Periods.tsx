import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/loans/LoanStatusBadge';
import { formatDate, formatDateTime } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Period } from '@/types/loan';
import { ChevronRight } from 'lucide-react';

export default function Periods() {
  const { data: periods, isLoading } = useQuery({
    queryKey: ['all-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periods')
        .select(`
          *,
          loans:loan_id (borrower_name)
        `)
        .order('period_start', { ascending: false });
      
      if (error) throw error;
      return data as (Period & { loans: { borrower_name: string } })[];
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const openPeriods = periods?.filter(p => p.status === 'open') || [];
  const submittedPeriods = periods?.filter(p => p.status === 'submitted') || [];
  const approvedPeriods = periods?.filter(p => p.status === 'approved') || [];
  const sentPeriods = periods?.filter(p => p.status === 'sent') || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Periods</h1>
        <p className="text-muted-foreground">
          Manage notice periods across all loans
        </p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPeriods.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submittedPeriods.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedPeriods.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentPeriods.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Periods</CardTitle>
          <CardDescription>Notice periods across all loans in the portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          {!periods || periods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No periods yet. Periods are created when loans have approved events.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Approved</th>
                  <th>Sent</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {periods.map(period => (
                  <tr key={period.id}>
                    <td className="font-medium">{period.loans?.borrower_name}</td>
                    <td className="font-mono">
                      {formatDate(period.period_start)} – {formatDate(period.period_end)}
                    </td>
                    <td><StatusBadge status={period.status} /></td>
                    <td className="text-muted-foreground text-sm">{formatDateTime(period.submitted_at)}</td>
                    <td className="text-muted-foreground text-sm">{formatDateTime(period.approved_at)}</td>
                    <td className="text-muted-foreground text-sm">{formatDateTime(period.sent_at)}</td>
                    <td className="text-right">
                      <Link 
                        to={`/loans/${period.loan_id}`}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View Loan <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
