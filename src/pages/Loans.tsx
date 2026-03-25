import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLoans, useLatestChargesPerLoan, useUpdateLoan } from '@/hooks/useLoans';
import { useLatestActivityPerLoan, useCreateActivityLog } from '@/hooks/useActivityLog';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/loans/LoanStatusBadge';
import { CreateLoanDialog } from '@/components/loans/CreateLoanDialog';
import { RentRollPanel } from '@/components/loans/RentRollPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatCurrency, formatCurrencyShort, formatPercent } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Plus, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { FinancialStrip } from '@/components/loans/FinancialStrip';
import { VEHICLES, DEFAULT_VEHICLE, type Vehicle, vehicleRequiresFacility, isPipelineVehicle, PIPELINE_STAGES } from '@/lib/constants';
import { useIsMobile } from '@/hooks/use-mobile';
import { PipelineCard } from '@/components/mobile/PipelineCard';
import { MobileLoanCard } from '@/components/mobile/MobileLoanCard';
type SortField = 'loan_id' | 'city' | 'category' | 'initial_facility' | 'outstanding' | 'total_commitment' | 'interest_rate' | 'loan_start_date' | 'maturity_date' | 'last_interest' | 'last_cf';
type SortDir = 'asc' | 'desc';
interface LoansProps {
  /** When true, shows only RED IV + TLF (read-only portfolio mode for mobile) */
  mobilePortfolio?: boolean;
}

export default function Loans({ mobilePortfolio }: LoansProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  // On mobile /loans route (not portfolio): force Pipeline vehicle, no tabs
  const mobilePipeline = isMobile && !mobilePortfolio;
  const defaultVehicle = mobilePortfolio ? 'RED IV' : DEFAULT_VEHICLE;
  const activeVehicle = mobilePipeline ? 'Pipeline' : (searchParams.get('vehicle') as Vehicle || defaultVehicle);
  const {
    data: loans,
    isLoading
  } = useLoans();
  const { data: latestCharges = {} } = useLatestChargesPerLoan();
  const { data: latestActivity = {} } = useLatestActivityPerLoan();
  const createActivityLog = useCreateActivityLog();
  // Derive the period label from the first available charge entry
  const chargesPeriodLabel = useMemo(() => {
    const firstEntry = Object.values(latestCharges)[0];
    return firstEntry?.periodLabel || '';
  }, [latestCharges]);
  const {
    roles
  } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const updateLoan = useUpdateLoan();
  const canCreate = roles.includes('pm') || roles.includes('controller');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const SortTh = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th
      className={`cursor-pointer select-none hover:text-foreground group ${className || ''}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <SortIcon field={field} />
      </span>
    </th>
  );
  // Quick note popover cell for inline activity logging
  const QuickNoteCell = ({ loanId }: { loanId: string }) => {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState('');
    const latest = latestActivity[loanId];
    const handleQuickAdd = async () => {
      if (!note.trim()) return;
      await createActivityLog.mutateAsync({ loan_id: loanId, content: note.trim() });
      setNote('');
      setOpen(false);
    };
    return (
      <div className="flex items-center gap-1.5">
        {latest ? (
          <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={latest.content}>
            {latest.content.slice(0, 40)}{latest.content.length > 40 ? '...' : ''}
            <span className="ml-1 opacity-60">
              {formatDistanceToNow(new Date(latest.created_at), { addSuffix: false })}
            </span>
          </span>
        ) : (
          <span className="text-xs text-foreground-muted">—</span>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground-secondary">Quick note</p>
              <Textarea
                placeholder="Log a quick note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleQuickAdd();
                  }
                }}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleQuickAdd}
                  disabled={!note.trim() || createActivityLog.isPending}
                >
                  {createActivityLog.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  const handleVehicleChange = (vehicle: string) => {
    setSearchParams({
      vehicle
    });
    setSearchQuery('');
  };

  // Filter by vehicle first
  const vehicleLoans = loans?.filter(loan => (loan as any).vehicle === activeVehicle) || [];
  const searchFiltered = vehicleLoans.filter(loan => loan.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) || (loan as any).loan_id?.toLowerCase().includes(searchQuery.toLowerCase()) || (loan as any).city?.toLowerCase().includes(searchQuery.toLowerCase()) || (loan as any).category?.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredLoans = useMemo(() => {
    if (!sortField) return searchFiltered;
    return [...searchFiltered].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      if (sortField === 'last_interest') {
        aVal = latestCharges[a.id]?.interest ?? -Infinity;
        bVal = latestCharges[b.id]?.interest ?? -Infinity;
      } else if (sortField === 'last_cf') {
        aVal = latestCharges[a.id]?.commitmentFee ?? -Infinity;
        bVal = latestCharges[b.id]?.commitmentFee ?? -Infinity;
      } else {
        aVal = (a as any)[sortField] ?? '';
        bVal = (b as any)[sortField] ?? '';
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [searchFiltered, sortField, sortDir, latestCharges]);

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

  // Filter vehicles based on mode: mobilePortfolio shows RED IV + TLF only, otherwise show all
  const availableVehicles = mobilePortfolio
    ? VEHICLES.filter(v => !isPipelineVehicle(v.value))
    : VEHICLES;

  // Count loans per vehicle for tabs
  const vehicleCounts = availableVehicles.map(v => ({
    ...v,
    count: loans?.filter(l => (l as any).vehicle === v.value).length || 0,
  }));
  if (isLoading) {
    return <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>;
  }
  return <div className={isMobile ? "px-4 pt-5 pb-4 space-y-5" : "p-6 space-y-6"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={isMobile ? "text-2xl font-bold text-primary" : "text-xl font-semibold"}>
            {mobilePortfolio ? 'Portfolio' : isPipelineVehicle(activeVehicle) ? 'Pipeline' : 'Loans'}
          </h1>
          {!isMobile && (
            <p className="text-sm text-foreground-secondary">
              Manage loan portfolio by vehicle
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isMobile && <RentRollPanel />}
          {canCreate && !mobilePortfolio && <CreateLoanDialog defaultVehicle={activeVehicle} />}
        </div>
      </div>

      {/* Vehicle Tabs — hidden on mobile pipeline (only Pipeline shown) */}
      {!mobilePipeline && (
        <Tabs value={activeVehicle} onValueChange={handleVehicleChange} className="w-full">
          <TabsList className={`grid w-full max-w-md ${vehicleCounts.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {vehicleCounts.map(v => (
              <TabsTrigger key={v.value} value={v.value} className="flex items-center gap-2">
                {v.label}
                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">{v.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Portfolio Metrics Strip */}
      {isPipelineVehicle(activeVehicle) ? (() => {
        const prospectCount = vehicleLoans.filter(l => (l as any).pipeline_stage === 'prospect').length;
        const hardCount = vehicleLoans.filter(l => (l as any).pipeline_stage === 'hard').length;
        const signedCount = vehicleLoans.filter(l => (l as any).pipeline_stage === 'signed').length;
        const noStageCount = vehicleLoans.filter(l => !(l as any).pipeline_stage).length;
        const totalCommitmentPipeline = vehicleLoans.reduce((s, l) => s + (l.total_commitment || 0), 0);
        const loansWithRate = vehicleLoans.filter(l => l.interest_rate && l.interest_rate > 0);
        const avgRatePipeline = loansWithRate.length > 0
          ? loansWithRate.reduce((s, l) => s + (l.interest_rate || 0), 0) / loansWithRate.length
          : 0;
        const loansWithLtv = vehicleLoans.filter(l => (l as any).ltv && (l as any).ltv > 0);
        const avgLtv = loansWithLtv.length > 0
          ? loansWithLtv.reduce((s, l) => s + ((l as any).ltv || 0), 0) / loansWithLtv.length
          : 0;
        return <FinancialStrip items={isMobile ? [
          { label: 'Deals', value: String(vehicleLoans.length), mono: false },
          { label: 'Prospect', value: String(prospectCount + noStageCount), mono: false },
          { label: 'Hard', value: String(hardCount), mono: false, accent: 'amber' as const },
          { label: 'Signed', value: String(signedCount), mono: false, accent: 'sage' as const },
          { label: 'Commitment', value: formatCurrencyShort(totalCommitmentPipeline) },
        ] : [
          { label: 'Deals', value: String(vehicleLoans.length), mono: false },
          { label: 'Prospect', value: String(prospectCount + noStageCount), mono: false },
          { label: 'Hard', value: String(hardCount), mono: false, accent: 'amber' as const },
          { label: 'Signed', value: String(signedCount), mono: false, accent: 'sage' as const },
          { label: 'Est. Commitment', value: formatCurrency(totalCommitmentPipeline) },
          { label: 'Avg Rate', value: avgRatePipeline > 0 ? formatPercent(avgRatePipeline, 2) : '—' },
          { label: 'Avg LTV', value: avgLtv > 0 ? formatPercent(avgLtv, 1) : '—' },
        ]} />;
      })() : (
        <FinancialStrip items={isMobile ? [
          { label: 'Outstanding', value: formatCurrencyShort(totalPrincipal), accent: 'primary' },
          { label: 'Commitment', value: formatCurrencyShort(totalCommitment) },
          { label: 'Undrawn', value: formatCurrencyShort(totalUndrawn), accent: 'sage' },
          { label: 'Avg Rate', value: formatPercent(avgRate, 2) },
          { label: 'Active', value: String(activeLoans.length), mono: false },
        ] : [
          { label: 'Outstanding', value: formatCurrency(totalPrincipal), accent: 'primary' },
          { label: 'Commitment', value: formatCurrency(totalCommitment) },
          { label: 'Undrawn', value: formatCurrency(totalUndrawn), accent: 'sage' },
          { label: 'Avg Rate', value: formatPercent(avgRate, 2) },
          { label: 'Active', value: String(activeLoans.length), mono: false },
        ]} />
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={`Search ${activeVehicle} loans...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      {filteredLoans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? 'No loans match your search.' : `No loans in ${activeVehicle} yet.`}
        </div>
      ) : isMobile && isPipelineVehicle(activeVehicle) ? (
        /* Mobile Pipeline: dense table view */
        <div className="-mx-4">
          <div className="flex items-center px-4 py-1.5 text-[10px] uppercase tracking-wider text-foreground-muted font-medium border-b border-border/60">
            <span className="flex-1 min-w-0">Deal</span>
            <span className="text-right shrink-0 w-[56px]">Stage</span>
            <span className="text-right shrink-0 w-[100px]">Commitment</span>
          </div>
          {filteredLoans.map((loan, i) => {
            const stage = (loan as any).pipeline_stage;
            const stageLabel = stage === 'signed' ? 'Signed' : stage === 'hard' ? 'Hard' : 'Prospect';
            const stageColor = stage === 'signed' ? 'text-accent-sage' : stage === 'hard' ? 'text-accent-amber' : 'text-foreground-muted';
            return (
              <div
                key={loan.id}
                className={`flex items-center px-4 py-2.5 active:bg-muted/40 transition-colors cursor-pointer ${
                  i < filteredLoans.length - 1 ? 'border-b border-border/20' : ''
                }`}
                onClick={() => navigate(`/loans/${loan.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-primary shrink-0">{(loan as any).loan_id}</span>
                    {(loan as any).city && <span className="text-[13px] font-medium truncate">{(loan as any).city}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-foreground-muted">
                    {loan.interest_rate ? <span className="font-mono">{formatPercent(loan.interest_rate, 2)}</span> : null}
                  </div>
                </div>
                <span className={`text-right shrink-0 w-[56px] text-[11px] font-medium ${stageColor}`}>{stageLabel}</span>
                <span className="text-right shrink-0 pl-2 font-mono text-[13px] font-semibold w-[100px]">{formatCurrencyShort(loan.total_commitment || 0)}</span>
              </div>
            );
          })}
        </div>
      ) : isMobile ? (
        /* Mobile Portfolio: dense table view */
        <div className="-mx-4">
          <div className="flex items-center px-4 py-1.5 text-[10px] uppercase tracking-wider text-foreground-muted font-medium border-b border-border/60">
            <span className="flex-1 min-w-0">Loan</span>
            <span className="text-right shrink-0 w-[110px]">Outstanding</span>
          </div>
          {filteredLoans.map((loan, i) => (
            <div
              key={loan.id}
              className={`flex items-center px-4 py-2.5 active:bg-muted/40 transition-colors cursor-pointer ${
                i < filteredLoans.length - 1 ? 'border-b border-border/20' : ''
              }`}
              onClick={() => navigate(`/loans/${loan.id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] font-bold text-primary shrink-0">{(loan as any).loan_id}</span>
                  <span className="text-[13px] font-medium truncate">{(loan as any).city || loan.borrower_name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-foreground-muted font-mono">
                  <span>{formatPercent(loan.interest_rate, 2)}</span>
                  <span className="opacity-40">|</span>
                  <span>{formatDate(loan.maturity_date)}</span>
                </div>
              </div>
              <span className="text-right shrink-0 pl-3 font-mono text-[13px] font-semibold w-[110px]">{formatCurrencyShort(loan.outstanding)}</span>
            </div>
          ))}
        </div>
      ) : (
      <Card>
        <CardContent className="pt-4">
          <table className="data-table">
              <thead>
                <tr>
                  <SortTh field="loan_id">Loan_ID</SortTh>
                  {vehicleRequiresFacility(activeVehicle) && <th>Facility</th>}
                  <SortTh field="city">City</SortTh>
                  <SortTh field="category">Category</SortTh>
                  {isPipelineVehicle(activeVehicle) && <th>Stage</th>}
                  {activeVehicle === 'RED IV' && <SortTh field="initial_facility">Initial Facility</SortTh>}
                  <SortTh field="outstanding" className="text-right">Outstanding</SortTh>
                  <SortTh field="total_commitment" className="text-right">Commitment</SortTh>
                  <SortTh field="interest_rate" className="text-right">Rate</SortTh>
                  <SortTh field="last_interest" className="text-right">Int. {chargesPeriodLabel || 't-1'}</SortTh>
                  <SortTh field="last_cf" className="text-right">CF {chargesPeriodLabel || 't-1'}</SortTh>
                  <SortTh field="loan_start_date" className="text-right">Start</SortTh>
                  <SortTh field="maturity_date" className="text-right">Maturity</SortTh>
                  <th>Last Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map(loan => <tr key={loan.id} onClick={() => navigate(`/loans/${loan.id}`)} className="clickable">
                    <td className="font-mono font-medium">{(loan as any).loan_id || '—'}</td>
                    {vehicleRequiresFacility(activeVehicle) && <td>
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
                    {isPipelineVehicle(activeVehicle) && <td onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={(loan as any).pipeline_stage || ''}
                          onValueChange={(v) => updateLoan.mutate({ id: loan.id, updates: { pipeline_stage: v } as any })}
                        >
                          <SelectTrigger className="h-7 w-[160px] text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map(s => (
                              <SelectItem key={s.value} value={s.value}>
                                <span>{s.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>}
                    {activeVehicle === 'RED IV' && <td className="text-muted-foreground">{loan.initial_facility || '—'}</td>}
                    <td className="numeric">{formatCurrency(loan.outstanding)}</td>
                    <td className="numeric">{formatCurrency(loan.total_commitment || loan.outstanding)}</td>
                    <td className="numeric">{formatPercent(loan.interest_rate, 2)}</td>
                    <td className="numeric text-muted-foreground">
                      {latestCharges[loan.id] ? formatCurrency(latestCharges[loan.id].interest) : '—'}
                    </td>
                    <td className="numeric text-muted-foreground">
                      {latestCharges[loan.id]?.commitmentFee ? formatCurrency(latestCharges[loan.id].commitmentFee) : '—'}
                    </td>
                    <td className="text-right text-muted-foreground">{formatDate(loan.loan_start_date)}</td>
                    <td className="text-right text-muted-foreground">{formatDate(loan.maturity_date)}</td>
                    <td onClick={(e) => e.stopPropagation()} className="max-w-[200px]">
                      <QuickNoteCell loanId={loan.id} />
                    </td>
                  </tr>)}
              </tbody>
            </table>
        </CardContent>
      </Card>
      )}
    </div>;
}