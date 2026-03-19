import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllCollateralItems, useAllGuarantors, type CollateralItemWithLoan } from '@/hooks/useCollateral';
import { FinancialStrip } from '@/components/loans/FinancialStrip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency, formatDate, formatOwnershipTypeShort } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';

type SortField = 'loan_id_display' | 'gemeente' | 'perceelnummer' | 'ownership_type' | 'city' | 'registration_amount' | 'status';
type SortDir = 'asc' | 'desc';

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'active'
    ? 'status-badge status-done'
    : status === 'released'
      ? 'status-badge status-action'
      : 'status-badge status-problem';
  return <span className={cls}>{status}</span>;
}

function OwnershipBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground-secondary">
      {formatOwnershipTypeShort(type)}
    </span>
  );
}

function downloadCsv(items: CollateralItemWithLoan[]) {
  const headers = [
    'Loan ID', 'Gemeente', 'Sectie', 'Perceelnummer',
    'Kadastrale Grootte', 'Ownership Type', 'Registration Date',
    'Registration Amount', 'City', 'Address', 'Security Provider',
    'Status', 'Notes',
  ];
  const rows = items.map(i => [
    i.loan_id_display,
    i.gemeente || '',
    i.sectie || '',
    i.perceelnummer || '',
    i.kadastrale_grootte || '',
    i.ownership_type,
    i.registration_date || '',
    i.registration_amount != null ? String(i.registration_amount) : '',
    i.city || '',
    i.address || '',
    i.security_provider || '',
    i.status,
    i.notes || '',
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `collateral-register-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Collateral() {
  const { data: items, isLoading: itemsLoading } = useAllCollateralItems();
  const { data: guarantors, isLoading: guarantorsLoading } = useAllGuarantors();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<string>('all');
  const [loanFilter, setLoanFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('loan_id_display');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [activeTab, setActiveTab] = useState('items');

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }, [sortField]);

  // Unique loan IDs for filter dropdown
  const loanIds = useMemo(() => {
    if (!items) return [];
    return [...new Set(items.map(i => i.loan_id_display))].sort((a, b) => +a - +b);
  }, [items]);

  // Filtered + sorted items
  const filteredItems = useMemo(() => {
    if (!items) return [];
    let result = items;
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter);
    if (ownershipFilter !== 'all') result = result.filter(i => i.ownership_type === ownershipFilter);
    if (loanFilter !== 'all') result = result.filter(i => i.loan_id_display === loanFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.loan_id_display.toLowerCase().includes(q) ||
        i.borrower_name.toLowerCase().includes(q) ||
        (i.gemeente || '').toLowerCase().includes(q) ||
        (i.city || '').toLowerCase().includes(q) ||
        (i.address || '').toLowerCase().includes(q) ||
        (i.perceelnummer || '').toLowerCase().includes(q) ||
        (i.security_provider || '').toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      let aVal: any = (a as any)[sortField] ?? '';
      let bVal: any = (b as any)[sortField] ?? '';
      if (sortField === 'loan_id_display') {
        aVal = +aVal || 0;
        bVal = +bVal || 0;
      }
      if (sortField === 'registration_amount') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [items, statusFilter, ownershipFilter, loanFilter, searchQuery, sortField, sortDir]);

  // Summary metrics
  const summary = useMemo(() => {
    if (!items) return { total: 0, active: 0, released: 0, sold: 0, registrationTotal: 0, loans: 0, guarantorCount: 0 };
    const active = items.filter(i => i.status === 'active');
    const released = items.filter(i => i.status === 'released');
    const sold = items.filter(i => i.status === 'sold');
    const loanCount = new Set(items.map(i => i.loan_id_display)).size;

    // Deduplicate registration amounts by (loan, date, amount)
    const seen = new Set<string>();
    let registrationTotal = 0;
    for (const item of active) {
      if (item.registration_amount) {
        const key = `${item.loan_id}|${item.registration_date}|${item.registration_amount}`;
        if (!seen.has(key)) {
          seen.add(key);
          registrationTotal += item.registration_amount;
        }
      }
    }
    return {
      total: items.length,
      active: active.length,
      released: released.length,
      sold: sold.length,
      registrationTotal,
      loans: loanCount,
      guarantorCount: guarantors?.filter(g => g.status === 'active').length ?? 0,
    };
  }, [items, guarantors]);

  // Guarantors filtered by loan
  const filteredGuarantors = useMemo(() => {
    if (!guarantors) return [];
    let result = guarantors;
    if (loanFilter !== 'all') result = result.filter(g => g.loan_id_display === loanFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g =>
        g.guarantor_name.toLowerCase().includes(q) ||
        g.loan_id_display.toLowerCase().includes(q) ||
        g.borrower_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [guarantors, loanFilter, searchQuery]);

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

  if (itemsLoading || guarantorsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className={isMobile ? 'px-4 pt-5 pb-4 space-y-5' : 'p-6 space-y-6'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={isMobile ? 'text-2xl font-bold text-primary' : 'text-xl font-semibold'}>
            Collateral Register
          </h1>
          {!isMobile && (
            <p className="text-sm text-foreground-secondary">
              Zekerhedenlijst across all loans
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCsv(filteredItems)}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary strip */}
      <FinancialStrip items={isMobile ? [
        { label: 'Parcels', value: String(summary.active), mono: false },
        { label: 'Registration', value: formatCurrency(summary.registrationTotal), accent: 'primary' },
        { label: 'Loans', value: String(summary.loans), mono: false },
        { label: 'Guarantors', value: String(summary.guarantorCount), mono: false },
      ] : [
        { label: 'Active Parcels', value: String(summary.active), mono: false },
        { label: 'Registration Total', value: formatCurrency(summary.registrationTotal), accent: 'primary' },
        { label: 'Loans', value: String(summary.loans), mono: false },
        { label: 'Active Guarantors', value: String(summary.guarantorCount), mono: false },
        ...(summary.released > 0 ? [{ label: 'Released', value: String(summary.released), mono: false, accent: 'amber' as const }] : []),
        ...(summary.sold > 0 ? [{ label: 'Sold', value: String(summary.sold), mono: false, accent: 'destructive' as const }] : []),
      ]} />

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parcels, addresses, borrowers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={loanFilter} onValueChange={setLoanFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All loans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All loans</SelectItem>
            {loanIds.map(id => (
              <SelectItem key={id} value={id}>Loan {id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="eigendom">Eigendom</SelectItem>
            <SelectItem value="erfpacht">Erfpacht</SelectItem>
            <SelectItem value="appartementsrecht">Appartementsrecht</SelectItem>
            <SelectItem value="recht_van_opstal">Recht van Opstal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="released">Released</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-foreground-muted ml-auto">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabs: Items / Guarantors */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="items">
            Parcels
            <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{filteredItems.length}</span>
          </TabsTrigger>
          <TabsTrigger value="guarantors">
            Guarantors
            <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{filteredGuarantors.length}</span>
          </TabsTrigger>
        </TabsList>

        {/* Parcels tab */}
        <TabsContent value="items" className="mt-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery || statusFilter !== 'all' || ownershipFilter !== 'all' || loanFilter !== 'all'
                ? 'No items match your filters.'
                : 'No collateral items registered yet.'}
            </div>
          ) : isMobile ? (
            <div className="space-y-2">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className={`rounded-xl border bg-card px-4 py-3 ${item.status !== 'active' ? 'opacity-60' : ''}`}
                  onClick={() => navigate(`/loans/${item.loan_id}`)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-primary">{item.loan_id_display}</span>
                      <span className="font-mono text-sm font-medium">
                        {[item.gemeente, item.sectie, item.perceelnummer].filter(Boolean).join(' ')}
                      </span>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.address && (
                    <p className="text-xs text-foreground-secondary truncate">
                      {item.city ? `${item.city} · ` : ''}{item.address}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <OwnershipBadge type={item.ownership_type} />
                    {item.registration_amount && (
                      <span className="font-mono text-sm">{formatCurrency(item.registration_amount)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <table className="data-table">
                  <thead>
                    <tr>
                      <SortTh field="loan_id_display">Loan</SortTh>
                      <th>Kadastrale ref</th>
                      <SortTh field="ownership_type">Type</SortTh>
                      <SortTh field="city">City / Address</SortTh>
                      <SortTh field="registration_amount" className="text-right">Registration</SortTh>
                      <th>Area</th>
                      <SortTh field="status">Status</SortTh>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => (
                      <tr
                        key={item.id}
                        className={`clickable ${item.status !== 'active' ? 'opacity-50' : ''}`}
                        onClick={() => navigate(`/loans/${item.loan_id}`)}
                      >
                        <td>
                          <span className="font-mono font-medium text-primary">{item.loan_id_display}</span>
                        </td>
                        <td>
                          <span className="font-mono text-sm">
                            {[item.gemeente, item.sectie, item.perceelnummer].filter(Boolean).join(' ')}
                          </span>
                        </td>
                        <td><OwnershipBadge type={item.ownership_type} /></td>
                        <td>
                          <div className="max-w-[250px]">
                            {item.city && <span className="text-foreground-secondary">{item.city} · </span>}
                            <span className="truncate">{item.address || '—'}</span>
                          </div>
                        </td>
                        <td className="text-right">
                          <div>
                            <span className="font-mono text-sm">
                              {item.registration_amount ? formatCurrency(item.registration_amount) : '—'}
                            </span>
                            {item.registration_date && (
                              <div className="text-xs text-foreground-muted">{formatDate(item.registration_date)}</div>
                            )}
                          </div>
                        </td>
                        <td className="font-mono text-sm">{item.kadastrale_grootte || '—'}</td>
                        <td><StatusBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Guarantors tab */}
        <TabsContent value="guarantors" className="mt-4">
          {filteredGuarantors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No guarantors match your filters.
            </div>
          ) : isMobile ? (
            <div className="space-y-2">
              {filteredGuarantors.map(g => (
                <div
                  key={g.id}
                  className={`rounded-xl border bg-card px-4 py-3 ${g.status !== 'active' ? 'opacity-60' : ''}`}
                  onClick={() => navigate(`/loans/${g.loan_id}`)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-primary">{g.loan_id_display}</span>
                      <span className="font-medium text-sm">{g.guarantor_name}</span>
                    </div>
                    <StatusBadge status={g.status} />
                  </div>
                  {g.guarantee_cap && (
                    <p className="font-mono text-sm mt-1">{formatCurrency(g.guarantee_cap)}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Loan</th>
                      <th>Guarantor</th>
                      <th className="text-right">Cap</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuarantors.map(g => (
                      <tr
                        key={g.id}
                        className={`clickable ${g.status !== 'active' ? 'opacity-50' : ''}`}
                        onClick={() => navigate(`/loans/${g.loan_id}`)}
                      >
                        <td>
                          <span className="font-mono font-medium text-primary">{g.loan_id_display}</span>
                        </td>
                        <td className="font-medium">{g.guarantor_name}</td>
                        <td className="text-right font-mono text-sm">
                          {g.guarantee_cap ? formatCurrency(g.guarantee_cap) : '—'}
                        </td>
                        <td><StatusBadge status={g.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
