import { useLoans } from '@/hooks/useLoans';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/loans/LoanStatusBadge';
import { formatCurrency } from '@/lib/format';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Landmark, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

export default function Dashboard() {
  const { data: loans, isLoading } = useLoans();
  const { roles } = useAuth();

  const activeLoans = loans?.filter(l => l.status === 'active') || [];
  const recentLoans = loans?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Loan portfolio overview • Role: {roles.join(', ') || 'None assigned'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Loans
            </CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLoans.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Loans
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loans?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Periods
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Draft Events
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Loans */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Loans</CardTitle>
          <CardDescription>Latest loans in the portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLoans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No loans yet. Create your first loan to get started.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Status</th>
                  <th>Frequency</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentLoans.map(loan => (
                  <tr key={loan.id}>
                    <td className="font-medium">{loan.borrower_name}</td>
                    <td><StatusBadge status={loan.status} /></td>
                    <td className="capitalize">{loan.notice_frequency}</td>
                    <td className="text-right">
                      <Link 
                        to={`/loans/${loan.id}`}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Role-based notices */}
      {roles.length === 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <h3 className="font-medium">No role assigned</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You don't have a role assigned yet. Contact an administrator to be assigned 
                  as a Portfolio Manager (PM) or Financial Controller.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
