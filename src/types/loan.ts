export type LoanStatus = 'active' | 'repaid' | 'defaulted';
export type FacilityType = 'capex' | 'interest_depot' | 'other';
export type EventStatus = 'draft' | 'approved';
export type PeriodStatus = 'open' | 'submitted' | 'approved' | 'sent' | 'paid';
export type AppRole = 'pm' | 'controller' | 'admin';
export type ProcessingMode = 'auto' | 'manual';
export type MonthlyApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ProcessingJobType = 'daily_accrual' | 'month_end' | 'period_close';
export type ProcessingJobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type EventType = 
  | 'principal_draw'
  | 'principal_repayment'
  | 'interest_rate_set'
  | 'interest_rate_change'
  | 'pik_flag_set'
  | 'commitment_set'
  | 'commitment_change'
  | 'commitment_cancel'
  | 'cash_received'
  | 'fee_invoice'
  | 'pik_capitalization_posted';

export type InterestType = 'cash_pay' | 'pik';
export type PaymentType = 'pik' | 'cash';
export type CommitmentFeeBasis = 'undrawn_only' | 'total_commitment';

export interface Loan {
  id: string;
  loan_id: string;
  borrower_name: string;
  status: LoanStatus;
  notice_frequency: string;
  payment_due_rule: string | null;
  loan_start_date: string | null;
  maturity_date: string | null;
  interest_rate: number | null;
  interest_type: InterestType;
  fee_payment_type: PaymentType;
  interest_payment_type: PaymentType;
  outstanding: number | null;
  total_commitment: number | null;
  commitment_fee_rate: number | null;
  commitment_fee_basis: CommitmentFeeBasis | null;
  afas_debtor_account: string | null;
  cash_interest_percentage: number | null;
  vehicle: string | null;
  facility: string | null;
  city: string | null;
  category: string | null;
  remarks: string | null;
  valuation: number | null;
  valuation_date: string | null;
  ltv: number | null;
  rental_income: number | null;
  property_status: string | null;
  occupancy: number | null;
  earmarked: boolean;
  original_vehicle: string | null;
  initial_facility: string | null;
  red_iv_start_date: string | null;
  borrower_email: string | null;
  borrower_address: string | null;
  property_address: string | null;
  google_maps_url: string | null;
  kadastrale_kaart_url: string | null;
  photo_url: string | null;
  additional_info: string | null;
  guarantor: string | null;
  pipeline_stage: string | null;
  walt: number | null;
  walt_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanFacility {
  id: string;
  loan_id: string;
  facility_type: FacilityType;
  commitment_amount: number;
  commitment_fee_rate: number | null;
  created_at: string;
}

export interface LoanEvent {
  id: string;
  loan_id: string;
  facility_id: string | null;
  event_type: EventType;
  effective_date: string;
  value_date: string | null;
  amount: number | null;
  rate: number | null;
  metadata: Record<string, unknown>;
  status: EventStatus;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface Period {
  id: string;
  loan_id: string;
  period_start: string;
  period_end: string;
  status: PeriodStatus;
  processing_mode: ProcessingMode;
  has_economic_events: boolean;
  monthly_approval_id: string | null;
  auto_processed_at: string | null;
  exception_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  snapshot_id: string | null;
  created_at: string;
  payment_date: string | null;
  payment_amount: number | null;
  payment_afas_ref: string | null;
  paid_at: string | null;
}

export interface MonthlyApproval {
  id: string;
  year_month: string;
  status: MonthlyApprovalStatus;
  total_periods: number;
  periods_with_exceptions: number;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccrualEntry {
  id: string;
  loan_id: string;
  period_id: string | null;
  accrual_date: string;
  principal_balance: number;
  interest_rate: number;
  daily_interest: number;
  commitment_balance: number | null;
  commitment_fee_rate: number | null;
  daily_commitment_fee: number;
  is_pik: boolean;
  created_at: string;
}

export interface ProcessingJob {
  id: string;
  job_type: ProcessingJobType;
  status: ProcessingJobStatus;
  started_at: string | null;
  completed_at: string | null;
  processed_count: number;
  error_count: number;
  error_details: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NoticeSnapshot {
  id: string;
  loan_id: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  version_number: number;
  is_adjustment: boolean;
  references_snapshot_id: string | null;
  totals: {
    opening_principal?: number;
    closing_principal?: number;
    interest_accrued?: number;
    pik_capitalized?: number;
    commitment_fee?: number;
    fees_invoiced?: number;
    total_due?: number;
  };
  line_items: Array<{
    description: string;
    start_date: string;
    end_date: string;
    principal?: number;
    rate?: number;
    days?: number;
    amount?: number;
  }>;
  inputs_hash: string;
  pdf_file_reference: string | null;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface AuditLog {
  id: string;
  object_type: string;
  object_id: string;
  action: string;
  user_id: string | null;
  timestamp: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'site_visit' | 'other';

export interface LoanActivityLog {
  id: string;
  loan_id: string;
  content: string;
  activity_type: ActivityType | null;
  activity_date: string | null;
  created_by: string;
  created_by_email: string | null;
  updated_at: string | null;
  created_at: string;
}

export interface AfasDrawTransaction {
  loanId: string;
  loanUuid: string | null;
  borrowerName: string;
  vehicle: string;
  entryDate: string;
  amount: number;
  type: 'draw' | 'repayment';
  description: string;
  afasRef: string;
  isConfirmed: boolean;
  createdEventId: string | null;
  eventStatus: 'draft' | 'approved' | null;
}
