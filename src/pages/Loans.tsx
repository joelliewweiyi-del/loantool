import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoans, useCreateLoan } from '@/hooks/useLoans';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/loans/LoanStatusBadge';
import { formatDate } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronRight, Search } from 'lucide-react';

export default function Loans() {
  const { data: loans, isLoading } = useLoans();
  const { roles } = useAuth();
  const createLoan = useCreateLoan();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [paymentDueRule, setPaymentDueRule] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const canCreate = roles.includes('pm') || roles.includes('controller');

  const handleCreate = async () => {
    await createLoan.mutateAsync({
      borrower_name: borrowerName,
      payment_due_rule: paymentDueRule || undefined,
    });
    setIsCreateOpen(false);
    setBorrowerName('');
    setPaymentDueRule('');
  };

  const filteredLoans = loans?.filter(loan => 
    loan.borrower_name.toLowerCase().includes(searchQuery.toLowerCase())
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
        
        {canCreate && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Loan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Loan</DialogTitle>
                <DialogDescription>
                  Add a new loan to the portfolio
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="borrower">Borrower Name</Label>
                  <Input
                    id="borrower"
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="Enter borrower name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-rule">Payment Due Rule (optional)</Label>
                  <Input
                    id="payment-rule"
                    value={paymentDueRule}
                    onChange={(e) => setPaymentDueRule(e.target.value)}
                    placeholder="e.g., 5 business days after period end"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={!borrowerName || createLoan.isPending}
                >
                  {createLoan.isPending ? 'Creating...' : 'Create Loan'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
                  <th>Borrower</th>
                  <th>Status</th>
                  <th>Frequency</th>
                  <th>Payment Rule</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map(loan => (
                  <tr key={loan.id}>
                    <td className="font-medium">{loan.borrower_name}</td>
                    <td><StatusBadge status={loan.status} /></td>
                    <td className="capitalize">{loan.notice_frequency}</td>
                    <td className="text-muted-foreground">{loan.payment_due_rule || '—'}</td>
                    <td className="text-muted-foreground">{formatDate(loan.created_at)}</td>
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
