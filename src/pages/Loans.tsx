import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useLoans } from '@/hooks/useLoans';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/loans/LoanStatusBadge';
import { CreateLoanDialog } from '@/components/loans/CreateLoanDialog';
import { BatchUploadDialog } from '@/components/loans/BatchUploadDialog';
import { formatDate, formatCurrency, formatPercent } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronRight, Search, Building2, Briefcase } from 'lucide-react';
type Vehicle = 'RED IV' | 'TLF';
export default function Loans() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeVehicle = searchParams.get('vehicle') as Vehicle || 'RED IV';
  const {
    data: loans,
    isLoading
  } = useLoans();
  const {
    roles
  } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const canCreate = roles.includes('pm') || roles.includes('controller');
  const handleVehicleChange = (vehicle: string) => {
    setSearchParams({
      vehicle
    });
    setSearchQuery('');
  };

  // Filter by vehicle first
  const vehicleLoans = loans?.filter(loan => (loan as any).vehicle === activeVehicle) || [];
  const filteredLoans = vehicleLoans.filter(loan => loan.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) || (loan as any).loan_id?.toLowerCase().includes(searchQuery.toLowerCase()) || (loan as any).city?.toLowerCase().includes(searchQuery.toLowerCase()) || (loan as any).category?.toLowerCase().includes(searchQuery.toLowerCase()));

  // Calculate portfolio summary metrics for current vehicle
  const activeLoans = vehicleLoans.filter(l => l.status === 'active');
  const totalPrincipal = activeLoans.reduce((sum, l) => sum + (l.outstanding || 0), 0);
  // For bullet loans with no separate commitment, treat commitment as equal to outstanding (fully drawn)
  const totalCommitment = activeLoans.reduce((sum, l) => {
    const commitment = l.total_commitment || 0;
    const outstanding = l.outstanding || 0;
    // If commitment is 0/null but there's outstanding, use outstanding as effective commitment
    return sum + (commitment > 0 ? commitment : outstanding);
  }, 0);
  const totalUndrawn = Math.max(0, totalCommitment - totalPrincipal);
  const weightedRateSum = activeLoans.reduce((sum, l) => {
    const principal = l.outstanding || 0;
    const rate = l.interest_rate || 0;
    return sum + principal * rate;
  }, 0);
  const avgRate = totalPrincipal > 0 ? weightedRateSum / totalPrincipal : 0;
  const pikLoansCount = activeLoans.filter(l => l.interest_type === 'pik').length;

  // Count loans per vehicle for tabs
  const redIVCount = loans?.filter(l => (l as any).vehicle === 'RED IV').length || 0;
  const tlfCount = loans?.filter(l => (l as any).vehicle === 'TLF').length || 0;
  if (isLoading) {
    return <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>;
  }
  return <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Loans</h1>
          <p className="text-muted-foreground">
            Manage loan portfolio by vehicle
          </p>
        </div>
        
        {canCreate && (
          <div className="flex items-center gap-2">
            <BatchUploadDialog />
            <CreateLoanDialog />
          </div>
        )}
      </div>

      {/* Vehicle Tabs */}
      <Tabs value={activeVehicle} onValueChange={handleVehicleChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="RED IV" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            RED IV
            <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{redIVCount}</span>
          </TabsTrigger>
          <TabsTrigger value="TLF" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            TLF
            <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{tlfCount}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Portfolio Metrics Bar */}
      <div className="grid grid-cols-6 gap-6 py-3 px-4 bg-background border-l-4 border-l-primary border rounded-sm shadow-sm">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Outstanding</div>
          <div className="text-lg font-semibold font-mono text-primary">{formatCurrency(totalPrincipal)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Commitment</div>
          <div className="text-lg font-semibold font-mono">{formatCurrency(totalCommitment)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Undrawn</div>
          <div className="text-lg font-semibold font-mono text-green-600">{formatCurrency(totalUndrawn)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg Rate</div>
          <div className="text-lg font-semibold font-mono">{formatPercent(avgRate, 2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Active</div>
          <div className="text-lg font-semibold font-mono">{activeLoans.length}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">PIK</div>
          <div className="text-lg font-semibold font-mono text-amber-600">{pikLoansCount}</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={`Search ${activeVehicle} loans...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLoans.length === 0 ? <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'No loans match your search.' : `No loans in ${activeVehicle} yet.`}
            </div> : <table className="data-table">
              <thead>
                <tr>
                  <th>Loan_ID</th>
                  {activeVehicle === 'TLF' && <th>Facility</th>}
                  <th>City</th>
                  <th>Category</th>
                  <th>PIK</th>
                  <th>Status</th>
                  <th className="text-right">Outstanding</th>
                  <th className="text-right">Rate</th>
                  <th className="text-right">Start</th>
                  <th className="text-right">Maturity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map(loan => <tr key={loan.id} onDoubleClick={() => navigate(`/loans/${loan.id}`)} className="cursor-pointer">
                    <td className="font-mono font-medium">{(loan as any).loan_id || '—'}</td>
                    {activeVehicle === 'TLF' && <td>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          {(loan as any).facility || '—'}
                        </span>
                      </td>}
                    <td className="text-muted-foreground">{(loan as any).city || '—'}</td>
                    <td>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted">
                        {(loan as any).category || '—'}
                      </span>
                    </td>
                    <td>
                      {loan.interest_type === 'pik' ? <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">PIK</span> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td><StatusBadge status={loan.status} /></td>
                    <td className="numeric">{formatCurrency(loan.outstanding)}</td>
                    <td className="numeric">{formatPercent(loan.interest_rate, 2)}</td>
                    <td className="text-right text-muted-foreground">{formatDate(loan.loan_start_date)}</td>
                    <td className="text-right text-muted-foreground">{formatDate(loan.maturity_date)}</td>
                    <td className="text-right">
                      <Link to={`/loans/${loan.id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                        View <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>)}
              </tbody>
            </table>}
        </CardContent>
      </Card>
    </div>;
}