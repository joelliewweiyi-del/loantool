import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus } from 'lucide-react';
import { useCreateLoan } from '@/hooks/useLoans';
import { InterestType, LoanType, CommitmentFeeBasis } from '@/types/loan';

interface LoanFormData {
  // Identity
  loan_name: string;
  borrower_name: string;
  loan_start_date: string;
  maturity_date: string;
  // Interest
  interest_rate: string;
  interest_type: InterestType;
  // Structure
  loan_type: LoanType;
  initial_principal: string;
  total_commitment: string;
  commitment_fee_rate: string;
  commitment_fee_basis: CommitmentFeeBasis;
  // Payments & Notices
  notice_frequency: string;
  payment_due_rule: string;
}

const initialFormData: LoanFormData = {
  loan_name: '',
  borrower_name: '',
  loan_start_date: '',
  maturity_date: '',
  interest_rate: '',
  interest_type: 'cash_pay',
  loan_type: 'term_loan',
  initial_principal: '',
  total_commitment: '',
  commitment_fee_rate: '',
  commitment_fee_basis: 'undrawn_only',
  notice_frequency: 'monthly',
  payment_due_rule: '',
};

export function CreateLoanDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<LoanFormData>(initialFormData);
  const createLoan = useCreateLoan();

  const handleChange = (field: keyof LoanFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    const payload = {
      loan_name: formData.loan_name || null,
      borrower_name: formData.borrower_name,
      loan_start_date: formData.loan_start_date || null,
      maturity_date: formData.maturity_date || null,
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) / 100 : null,
      interest_type: formData.interest_type,
      loan_type: formData.loan_type,
      initial_principal: formData.initial_principal ? parseFloat(formData.initial_principal) : null,
      total_commitment: formData.loan_type === 'committed_facility' && formData.total_commitment 
        ? parseFloat(formData.total_commitment) : null,
      commitment_fee_rate: formData.loan_type === 'committed_facility' && formData.commitment_fee_rate 
        ? parseFloat(formData.commitment_fee_rate) / 100 : null,
      commitment_fee_basis: formData.loan_type === 'committed_facility' 
        ? formData.commitment_fee_basis : null,
      notice_frequency: formData.notice_frequency,
      payment_due_rule: formData.payment_due_rule || null,
    };

    await createLoan.mutateAsync(payload);
    setIsOpen(false);
    setFormData(initialFormData);
  };

  const isCommittedFacility = formData.loan_type === 'committed_facility';
  const canSubmit = formData.borrower_name && formData.loan_start_date;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Loan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Loan</DialogTitle>
          <DialogDescription>
            Enter the key loan details. All monetary values in EUR.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Identity Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Identity
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loan_name">Loan Name</Label>
                <Input
                  id="loan_name"
                  value={formData.loan_name}
                  onChange={(e) => handleChange('loan_name', e.target.value)}
                  placeholder="e.g., Senior Secured Term Loan A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="borrower_name">Borrower Legal Name *</Label>
                <Input
                  id="borrower_name"
                  value={formData.borrower_name}
                  onChange={(e) => handleChange('borrower_name', e.target.value)}
                  placeholder="Enter borrower name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan_start_date">Loan Start Date *</Label>
                <Input
                  id="loan_start_date"
                  type="date"
                  value={formData.loan_start_date}
                  onChange={(e) => handleChange('loan_start_date', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maturity_date">Maturity Date</Label>
                <Input
                  id="maturity_date"
                  type="date"
                  value={formData.maturity_date}
                  onChange={(e) => handleChange('maturity_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Interest Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Interest
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                <Input
                  id="interest_rate"
                  type="number"
                  step="0.0001"
                  value={formData.interest_rate}
                  onChange={(e) => handleChange('interest_rate', e.target.value)}
                  placeholder="e.g., 8.5000"
                />
              </div>
              <div className="space-y-2">
                <Label>Interest Type</Label>
                <Select 
                  value={formData.interest_type} 
                  onValueChange={(v) => handleChange('interest_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_pay">Cash Pay</SelectItem>
                    <SelectItem value="pik">PIK (Capitalized)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Structure Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Structure
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Type</Label>
                <Select 
                  value={formData.loan_type} 
                  onValueChange={(v) => handleChange('loan_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="term_loan">Fully Drawn Term Loan</SelectItem>
                    <SelectItem value="committed_facility">Committed Facility with Draws</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial_principal">Initial Principal Outstanding (EUR)</Label>
                <Input
                  id="initial_principal"
                  type="number"
                  step="0.01"
                  value={formData.initial_principal}
                  onChange={(e) => handleChange('initial_principal', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              {isCommittedFacility && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="total_commitment">Total Commitment (EUR)</Label>
                    <Input
                      id="total_commitment"
                      type="number"
                      step="0.01"
                      value={formData.total_commitment}
                      onChange={(e) => handleChange('total_commitment', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commitment_fee_rate">Commitment Fee Rate (%)</Label>
                    <Input
                      id="commitment_fee_rate"
                      type="number"
                      step="0.0001"
                      value={formData.commitment_fee_rate}
                      onChange={(e) => handleChange('commitment_fee_rate', e.target.value)}
                      placeholder="e.g., 0.5000"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Commitment Fee Basis</Label>
                    <Select 
                      value={formData.commitment_fee_basis} 
                      onValueChange={(v) => handleChange('commitment_fee_basis', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="undrawn_only">Undrawn Only</SelectItem>
                        <SelectItem value="total_commitment">Total Commitment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Payments & Notices Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Payments & Notices
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Notice Frequency</Label>
                <Select 
                  value={formData.notice_frequency} 
                  onValueChange={(v) => handleChange('notice_frequency', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_due_rule">Payment Due Date Rule</Label>
                <Input
                  id="payment_due_rule"
                  value={formData.payment_due_rule}
                  onChange={(e) => handleChange('payment_due_rule', e.target.value)}
                  placeholder="e.g., 5 business days after period end"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!canSubmit || createLoan.isPending}
          >
            {createLoan.isPending ? 'Creating...' : 'Create Loan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
