import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Pencil, Plus, Minus } from 'lucide-react';
import { useUpdateLoan } from '@/hooks/useLoans';
import { Loan, InterestType, PaymentType, CommitmentFeeBasis } from '@/types/loan';
import { VEHICLES, DEFAULT_VEHICLE, vehicleRequiresFacility, isPipelineVehicle, PIPELINE_STAGES } from '@/lib/constants';

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
  property_status: string;
  earmarked: boolean;
  initial_facility: string;
  red_iv_start_date: string;
  borrower_email: string;
  borrower_address: string;
  property_address: string;
  interest_rate: string;
  interest_type: InterestType;
  fee_payment_type: PaymentType;
  interest_payment_type: PaymentType;
  total_commitment: string;
  commitment_fee_rate: string;
  commitment_fee_basis: CommitmentFeeBasis;
  notice_frequency: string;
  payment_due_rule: string;
  cash_interest_percentage: string;
  guarantor: string;
  valuation: string;
  valuation_date: string;
  rental_income: string;
  remarks: string;
  google_maps_url: string;
  kadastrale_kaart_url: string;
  photo_url: string;
  additional_info: string;
  pipeline_stage: string;
  walt: string;
  walt_comment: string;
  occupancy: string;
}

export function EditLoanDialog({ loan }: EditLoanDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateLoan = useUpdateLoan();
  const [propertyAddresses, setPropertyAddresses] = useState<string[]>(['']);
  
  const [formData, setFormData] = useState<LoanFormData>({
    borrower_name: '',
    loan_start_date: '',
    maturity_date: '',
    vehicle: DEFAULT_VEHICLE,
    facility: '',
    city: '',
    category: '',
    property_status: '',
    earmarked: false,
    initial_facility: '',
    red_iv_start_date: '',
    borrower_email: '',
    borrower_address: '',
    property_address: '',
    interest_rate: '',
    interest_type: 'cash_pay',
    fee_payment_type: 'pik',
    interest_payment_type: 'cash',
    total_commitment: '',
    commitment_fee_rate: '',
    commitment_fee_basis: 'undrawn_only',
    notice_frequency: 'monthly',
    payment_due_rule: '',
    cash_interest_percentage: '',
    guarantor: '',
    valuation: '',
    valuation_date: '',
    rental_income: '',
    remarks: '',
    google_maps_url: '',
    kadastrale_kaart_url: '',
    photo_url: '',
    additional_info: '',
    pipeline_stage: '',
    walt: '',
    walt_comment: '',
    occupancy: '',
  });

  // Populate form when dialog opens
  useEffect(() => {
    if (isOpen && loan) {
      const addrs = loan.property_address ? loan.property_address.split('\n').filter(Boolean) : [''];
      setPropertyAddresses(addrs.length ? addrs : ['']);
      setFormData({
        borrower_name: loan.borrower_name || '',
        loan_start_date: loan.loan_start_date || '',
        maturity_date: loan.maturity_date || '',
        vehicle: loan.vehicle || DEFAULT_VEHICLE,
        facility: loan.facility || '',
        city: loan.city || '',
        category: loan.category || '',
        property_status: loan.property_status || '',
        earmarked: loan.earmarked ?? false,
        initial_facility: loan.initial_facility || '',
        red_iv_start_date: loan.red_iv_start_date || '',
        borrower_email: loan.borrower_email || '',
        borrower_address: loan.borrower_address || '',
        property_address: loan.property_address || '',
        interest_rate: loan.interest_rate != null ? (loan.interest_rate * 100).toString() : '',
        interest_type: (loan.interest_type as InterestType) || 'cash_pay',
        fee_payment_type: ((loan as any).fee_payment_type as PaymentType) || 'pik',
        interest_payment_type: ((loan as any).interest_payment_type as PaymentType) || 'cash',
        total_commitment: loan.total_commitment != null ? loan.total_commitment.toString() : '',
        commitment_fee_rate: loan.commitment_fee_rate != null ? (loan.commitment_fee_rate * 100).toString() : '',
        commitment_fee_basis: (loan.commitment_fee_basis as CommitmentFeeBasis) || 'undrawn_only',
        notice_frequency: loan.notice_frequency || 'monthly',
        payment_due_rule: loan.payment_due_rule || '',
        cash_interest_percentage: loan.cash_interest_percentage != null ? loan.cash_interest_percentage.toString() : '',
        guarantor: loan.guarantor || '',
        valuation: loan.valuation != null ? loan.valuation.toString() : '',
        valuation_date: loan.valuation_date || '',
        rental_income: loan.rental_income != null ? loan.rental_income.toString() : '',
        remarks: loan.remarks || '',
        google_maps_url: (loan as any).google_maps_url || '',
        kadastrale_kaart_url: (loan as any).kadastrale_kaart_url || '',
        photo_url: (loan as any).photo_url || '',
        additional_info: (loan as any).additional_info || '',
        pipeline_stage: (loan as any).pipeline_stage || '',
        walt: loan.walt != null ? loan.walt.toString() : '',
        walt_comment: loan.walt_comment || '',
        occupancy: loan.occupancy != null ? (loan.occupancy * 100).toString() : '',
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
      facility: vehicleRequiresFacility(formData.vehicle) ? formData.facility || null : null,
      city: formData.city || null,
      category: formData.category || null,
      property_status: formData.property_status || null,
      earmarked: formData.earmarked,
      initial_facility: formData.initial_facility || null,
      red_iv_start_date: formData.red_iv_start_date || null,
      borrower_email: formData.borrower_email || null,
      borrower_address: formData.borrower_address || null,
      property_address: propertyAddresses.filter(a => a.trim()).join('\n') || null,
      guarantor: formData.guarantor || null,
      valuation: formData.valuation ? parseFloat(formData.valuation) : null,
      valuation_date: formData.valuation_date || null,
      rental_income: formData.rental_income ? parseFloat(formData.rental_income) : null,
      ltv: (() => {
        const val = formData.valuation ? parseFloat(formData.valuation) : 0;
        if (!val) return null;
        const commitment = formData.total_commitment ? parseFloat(formData.total_commitment) : 0;
        const outstanding = loan.outstanding ?? 0;
        return Math.max(commitment, outstanding) / val;
      })(),
      remarks: formData.remarks || null,
      cash_interest_percentage: formData.cash_interest_percentage ? parseFloat(formData.cash_interest_percentage) : null,
      google_maps_url: formData.google_maps_url || null,
      kadastrale_kaart_url: formData.kadastrale_kaart_url || null,
      photo_url: formData.photo_url || null,
      additional_info: formData.additional_info || null,
      pipeline_stage: isPipelineVehicle(formData.vehicle) ? formData.pipeline_stage || null : null,
      walt: formData.walt ? parseFloat(formData.walt) : null,
      walt_comment: formData.walt_comment || null,
      occupancy: formData.occupancy ? parseFloat(formData.occupancy) / 100 : null,
    };

    await updateLoan.mutateAsync({ id: loan.id, updates: payload as unknown as Partial<Loan> });
    setIsOpen(false);
  };

  const isTLF = vehicleRequiresFacility(formData.vehicle);

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
                    {VEHICLES.map(v => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
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
              {isPipelineVehicle(formData.vehicle) && (
                <div className="space-y-2">
                  <Label>Pipeline Stage</Label>
                  <Select value={formData.pipeline_stage} onValueChange={(v) => handleChange('pipeline_stage', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label} <span className="opacity-50">· {s.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-initial_facility">Initial Facility</Label>
                <Input
                  id="edit-initial_facility"
                  value={formData.initial_facility}
                  onChange={(e) => handleChange('initial_facility', e.target.value)}
                  placeholder="e.g., TLFOKT25"
                />
              </div>
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
                <Label htmlFor="edit-guarantor">Guarantor</Label>
                <Input
                  id="edit-guarantor"
                  value={formData.guarantor}
                  onChange={(e) => handleChange('guarantor', e.target.value)}
                  placeholder="e.g., Holding B.V."
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
                <Label htmlFor="edit-red_iv_start_date">RED IV Start Date</Label>
                <Input
                  id="edit-red_iv_start_date"
                  type="date"
                  value={formData.red_iv_start_date}
                  onChange={(e) => handleChange('red_iv_start_date', e.target.value)}
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
              <div className="space-y-2">
                <Label>Property Status</Label>
                <Select
                  value={formData.property_status}
                  onValueChange={(v) => handleChange('property_status', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Leased">Leased</SelectItem>
                    <SelectItem value="Redevelopment">Redevelopment</SelectItem>
                    <SelectItem value="Development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="edit-earmarked"
                  checked={formData.earmarked}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, earmarked: checked === true }))}
                />
                <Label htmlFor="edit-earmarked" className="cursor-pointer">Earmarked</Label>
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
            {formData.interest_payment_type === 'cash' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cash_interest_percentage">Cash Interest %</Label>
                  <Input
                    id="cash_interest_percentage"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={formData.cash_interest_percentage}
                    onChange={(e) => handleChange('cash_interest_percentage', e.target.value)}
                    placeholder="100 (default)"
                  />
                  <p className="text-xs text-muted-foreground">
                    % of interest paid in cash. Leave empty for 100%. Remainder from interest depot.
                  </p>
                </div>
              </div>
            )}
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

          {/* Valuation Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Valuation
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-valuation">Valuation (EUR)</Label>
                <Input
                  id="edit-valuation"
                  type="number"
                  step="0.01"
                  value={formData.valuation}
                  onChange={(e) => handleChange('valuation', e.target.value)}
                  placeholder="e.g., 5000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-valuation_date">Valuation Date</Label>
                <Input
                  id="edit-valuation_date"
                  type="date"
                  value={formData.valuation_date}
                  onChange={(e) => handleChange('valuation_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-rental_income">Rental Income (EUR)</Label>
                <Input
                  id="edit-rental_income"
                  type="number"
                  step="0.01"
                  value={formData.rental_income}
                  onChange={(e) => handleChange('rental_income', e.target.value)}
                  placeholder="e.g., 120000"
                />
              </div>
            </div>
            {formData.valuation && (
              <p className="text-xs text-muted-foreground">
                LTV is auto-calculated as max(commitment, outstanding) / valuation
              </p>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-walt">WALT (years)</Label>
                <Input
                  id="edit-walt"
                  type="number"
                  step="0.1"
                  value={formData.walt}
                  onChange={(e) => handleChange('walt', e.target.value)}
                  placeholder="e.g., 5.2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-walt_comment">WALT Comment</Label>
                <Input
                  id="edit-walt_comment"
                  value={formData.walt_comment}
                  onChange={(e) => handleChange('walt_comment', e.target.value)}
                  placeholder="e.g., Peildatum 01-01-2026, bron: taxatierapport"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-occupancy">Occupancy (%)</Label>
                <Input
                  id="edit-occupancy"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={formData.occupancy}
                  onChange={(e) => handleChange('occupancy', e.target.value)}
                  placeholder="e.g., 95"
                />
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

          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Addresses & Contact
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-borrower_address">Borrower Address</Label>
                <Input
                  id="edit-borrower_address"
                  value={formData.borrower_address}
                  onChange={(e) => handleChange('borrower_address', e.target.value)}
                  placeholder="e.g., Keizersgracht 127, 1015CJ Amsterdam"
                />
              </div>
              <div className="space-y-2">
                <Label>Property Addresses</Label>
                {propertyAddresses.map((addr, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={addr}
                      onChange={(e) => {
                        const updated = [...propertyAddresses];
                        updated[idx] = e.target.value;
                        setPropertyAddresses(updated);
                      }}
                      placeholder="e.g., Oudenoord 330-340, Utrecht"
                    />
                    {propertyAddresses.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setPropertyAddresses(propertyAddresses.filter((_, i) => i !== idx))}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => setPropertyAddresses([...propertyAddresses, ''])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Address
                </Button>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-borrower_email">Borrower Email</Label>
                <Input
                  id="edit-borrower_email"
                  value={formData.borrower_email}
                  onChange={(e) => handleChange('borrower_email', e.target.value)}
                  placeholder="e.g., contact@borrower.nl; cfo@borrower.nl"
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

          <Separator />

          {/* Property Detail Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Property Detail (Loan Tape)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-google_maps_url">Google Maps URL</Label>
                <Input
                  id="edit-google_maps_url"
                  value={formData.google_maps_url}
                  onChange={(e) => handleChange('google_maps_url', e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-kadastrale_kaart_url">Kadastrale Kaart URL</Label>
                <Input
                  id="edit-kadastrale_kaart_url"
                  value={formData.kadastrale_kaart_url}
                  onChange={(e) => handleChange('kadastrale_kaart_url', e.target.value)}
                  placeholder="https://kadastralekaart.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-photo_url">Photo URL</Label>
                <Input
                  id="edit-photo_url"
                  value={formData.photo_url}
                  onChange={(e) => handleChange('photo_url', e.target.value)}
                  placeholder="https://i.imgur.com/..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-additional_info">Additional Information</Label>
              <textarea
                id="edit-additional_info"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.additional_info}
                onChange={(e) => handleChange('additional_info', e.target.value)}
                placeholder="Detailed description for loan tape..."
                rows={4}
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
