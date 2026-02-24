import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Pencil } from 'lucide-react';
import { useUpdateLoan } from '@/hooks/useLoans';
import { Loan, InterestType, PaymentType, CommitmentFeeBasis } from '@/types/loan';

interface EditLoanDialogProps {
  loan: Loan;
}

interface LoanFormData {
  borrower_name: string;
  loan_start_date: string;
  maturity_date: string;
  vehicle: string;
  facility: string;
  city: string;
  category: string;
  interest_rate: string;
  interest_type: InterestType;
  fee_payment_type: PaymentType;
  interest_payment_type: PaymentType;
  total_commitment: string;
  commitment_fee_rate: string;
  commitment_fee_basis: CommitmentFeeBasis;
  notice_frequency: string;
  payment_due_rule: string;
  remarks: string;
}

export function EditLoanDialog({ loan }: EditLoanDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateLoan = useUpdateLoan();
  
  const [formData, setFormData] = useState<LoanFormData>({
    borrower_name: '',
    loan_start_date: '',
    maturity_date: '',
    vehicle: 'RED IV',
    facility: '',
    city: '',
    category: '',
    interest_rate: '',
    interest_type: 'cash_pay',
    fee_payment_type: 'pik',
    interest_payment_type: 'cash',
    total_commitment: '',
    commitment_fee_rate: '',
    commitment_fee_basis: 'undrawn_only',
    notice_frequency: 'monthly',
    payment_due_rule: '',
    remarks: '',
  });

  // Populate form when dialog opens
  useEffect(() => {
    if (isOpen && loan) {
      setFormData({
        borrower_name: loan.borrower_name || '',
        loan_start_date: loan.loan_start_date || '',
        maturity_date: loan.maturity_date || '',
        vehicle: loan.vehicle || 'RED IV',
        facility: loan.facility || '',
        city: loan.city || '',
        category: loan.category || '',
        interest_rate: loan.interest_rate != null ? (loan.interest_rate * 100).toString() : '',
        interest_type: (loan.interest_type as InterestType) || 'cash_pay',
        fee_payment_type: ((loan as any).fee_payment_type as PaymentType) || 'pik',
        interest_payment_type: ((loan as any).interest_payment_type as PaymentType) || 'cash',
        total_commitment: loan.total_commitment != null ? loan.total_commitment.toString() : '',
        commitment_fee_rate: loan.commitment_fee_rate != null ? (loan.commitment_fee_rate * 100).toString() : '',
        commitment_fee_basis: (loan.commitment_fee_basis as CommitmentFeeBasis) || 'undrawn_only',
        notice_frequency: loan.notice_frequency || 'monthly',
        payment_due_rule: loan.payment_due_rule || '',
        remarks: loan.remarks || '',
      });
    }
  }, [isOpen, loan]);

  const handleChange = (field: keyof LoanFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const payload = {
      id: loan.id,
      borrower_name: formData.borrower_name,
      loan_start_date: formData.loan_start_date || null,
      maturity_date: formData.maturity_date || null,
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) / 100 : null,
      interest_type: formData.interest_payment_type === 'pik' ? 'pik' : 'cash_pay',
      fee_payment_type: formData.fee_payment_type,
      interest_payment_type: formData.interest_payment_type,
      total_commitment: formData.total_commitment ? parseFloat(formData.total_commitment) : null,
      commitment_fee_rate: formData.commitment_fee_rate ? parseFloat(formData.commitment_fee_rate) / 100 : null,
      commitment_fee_basis: formData.commitment_fee_basis,
      notice_frequency: formData.notice_frequency,
      payment_due_rule: formData.payment_due_rule || null,
      vehicle: formData.vehicle,
      facility: formData.vehicle === 'TLF' ? formData.facility || null : null,
      city: formData.city || null,
      category: formData.category || null,
      remarks: formData.remarks || null,
    };

    await updateLoan.mutateAsync({ id: loan.id, updates: payload as unknown as Partial<Loan> });
    setIsOpen(false);
  };

  const isTLF = formData.vehicle === 'TLF';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Edit Loan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Loan</DialogTitle>
          <DialogDescription>
            Update the loan details. Note: Loan ID cannot be changed.
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
                <Label>Vehicle</Label>
                <Select 
                  value={formData.vehicle} 
                  onValueChange={(v) => handleChange('vehicle', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RED IV">RED IV</SelectItem>
                    <SelectItem value="TLF">TLF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isTLF && (
                <div className="space-y-2">
                  <Label htmlFor="facility">Facility Name</Label>
                  <Input
                    id="facility"
                    value={formData.facility}
                    onChange={(e) => handleChange('facility', e.target.value)}
                    placeholder="e.g., TLF_DEC_A"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="borrower_name">Borrower Legal Name</Label>
                <Input
                  id="borrower_name"
                  value={formData.borrower_name}
                  onChange={(e) => handleChange('borrower_name', e.target.value)}
                  placeholder="Enter borrower name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loan_start_date">Loan Start Date</Label>
                <Input
                  id="loan_start_date"
                  type="date"
                  value={formData.loan_start_date}
                  onChange={(e) => handleChange('loan_start_date', e.target.value)}
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
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g., Amsterdam"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="e.g., Office, Residential"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Types Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Payment Types
            </h3>
            <div className="grid grid-cols-3 gap-4">
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
                <Label>Interest Payments</Label>
                <Select 
                  value={formData.interest_payment_type} 
                  onValueChange={(v) => handleChange('interest_payment_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash (Invoiced)</SelectItem>
                    <SelectItem value="pik">PIK (Capitalized)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.interest_payment_type === 'pik' 
                    ? 'Monthly interest rolled into principal' 
                    : 'Monthly interest invoiced for payment'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Arrangement Fees</Label>
                <Select 
                  value={formData.fee_payment_type} 
                  onValueChange={(v) => handleChange('fee_payment_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pik">PIK (Capitalized)</SelectItem>
                    <SelectItem value="cash">Cash (Withheld)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.fee_payment_type === 'pik' 
                    ? 'Fees added to principal balance' 
                    : 'Fees withheld from initial funding'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Structure Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Commitment Structure
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_commitment">Total Commitment (EUR)</Label>
                <Input
                  id="total_commitment"
                  type="number"
                  step="0.01"
                  value={formData.total_commitment}
                  onChange={(e) => handleChange('total_commitment', e.target.value)}
                  placeholder="Optional"
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
                  placeholder="e.g., 1.0000"
                />
              </div>
              <div className="space-y-2">
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

          <Separator />

          {/* Remarks Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Notes
            </h3>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateLoan.isPending}
          >
            {updateLoan.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
