import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoans } from '@/hooks/useLoans';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/loans/LoanStatusBadge';
import { CreateLoanDialog } from '@/components/loans/CreateLoanDialog';
import { formatDate, formatCurrency, formatPercent } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Search } from 'lucide-react';

export default function Loans() {
  const { data: loans, isLoading } = useLoans();
  const { roles } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const canCreate = roles.includes('pm') || roles.includes('controller');

  const filteredLoans = loans?.filter(loan => 
    loan.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loan.loan_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Loans</h1>
          <p className="text-muted-foreground">
            Manage loan portfolio
          </p>
        </div>
        
        {canCreate && <CreateLoanDialog />}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search loans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLoans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'No loans match your search.' : 'No loans yet. Create your first loan to get started.'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan / Borrower</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="text-right">Principal</th>
                  <th className="text-right">Rate</th>
                  <th>Start</th>
                  <th>Maturity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map(loan => (
                  <tr key={loan.id}>
                    <td>
                      <div className="font-medium">{loan.loan_name || loan.borrower_name}</div>
                      {loan.loan_name && (
                        <div className="text-xs text-muted-foreground">{loan.borrower_name}</div>
                      )}
                    </td>
                    <td className="text-sm">
                      {loan.loan_type === 'committed_facility' ? 'Committed' : 'Term Loan'}
                    </td>
                    <td><StatusBadge status={loan.status} /></td>
                    <td className="numeric">{formatCurrency(loan.initial_principal)}</td>
                    <td className="numeric">{formatPercent(loan.interest_rate)}</td>
                    <td className="text-muted-foreground">{formatDate(loan.loan_start_date)}</td>
                    <td className="text-muted-foreground">{formatDate(loan.maturity_date)}</td>
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
    </div>
  );
}