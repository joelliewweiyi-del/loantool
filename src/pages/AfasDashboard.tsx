import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useConfirmDraw } from '@/hooks/useConfirmDraw';
import { useAuth } from '@/hooks/useAuth';
import type { LoanEvent } from '@/types/loan';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  Wifi,
  WifiOff,
  KeyRound,
  Settings,
  Clock,
  CircleDashed,
  Landmark,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────

interface AfasRow {
  EntryDate: string;
  JournalId: number;
  AccountNo: number;
  DimAx1: string | null;
  AmtDebit: number;
  AmtCredit: number;
  Description: string;
  EntryNo: number;
  SeqNo: number;
  Year: number;
  Period: number;
  VoucherNo: string | null;
  VoucherDate: string | null;
  InvoiceId: string | null;
}

interface LoanGroup {
  loanId: string;
  total: number;
  count: number;
  minDate: string;
  maxDate: string;
  rows: (AfasRow & { amount: number })[];
}

// ── Queries ────────────────────────────────────────────────────

function useAfasConnector(key: string, filters: { filterFieldIds: string; filterValues: string; operatorTypes: string }, enabled = true) {
  return useQuery({
    queryKey: ['afas-connector', key],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-draws', {
        body: { ...filters, take: 5000 },
      });
      if (error) throw error;
      return (data?.allData?.rows ?? []) as AfasRow[];
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

function useAfasConnection() {
  return useQuery({
    queryKey: ['afas-connection'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-connection');
      if (error) throw error;
      return data as { success: boolean; message?: string };
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

function useAfasEnvToggle() {
  return useQuery({
    queryKey: ['app-config', 'AFAS_USE_TEST_ENV'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'AFAS_USE_TEST_ENV')
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return (data?.value ?? 'true') !== 'false'; // default: test
    },
    staleTime: 60 * 1000,
  });
}

// ── Helpers ────────────────────────────────────────────────────

function groupByLoan(
  rows: AfasRow[],
  getLoanId: (r: AfasRow) => string | null,
  getAmount: (r: AfasRow) => number,
): LoanGroup[] {
  const map = new Map<string, LoanGroup>();
  for (const row of rows) {
    const loanId = getLoanId(row) ?? '—';
    const amount = getAmount(row);
    const existing = map.get(loanId);
    if (existing) {
      existing.total += amount;
      existing.count++;
      if (row.EntryDate < existing.minDate) existing.minDate = row.EntryDate;
      if (row.EntryDate > existing.maxDate) existing.maxDate = row.EntryDate;
      existing.rows.push({ ...row, amount });
    } else {
      map.set(loanId, {
        loanId,
        total: amount,
        count: 1,
        minDate: row.EntryDate,
        maxDate: row.EntryDate,
        rows: [{ ...row, amount }],
      });
    }
  }
  // Sort rows within each group by date descending
  for (const group of map.values()) {
    group.rows.sort((a, b) => b.EntryDate.localeCompare(a.EntryDate));
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

function useLoanIds() {
  return useQuery({
    queryKey: ['loan-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('loan_id, id');
      if (error) throw error;
      return {
        ids: new Set(data.map(l => l.loan_id)),
        numericToUuid: new Map(data.map(l => [l.loan_id, l.id])),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useAfasDrawConfirmations() {
  return useQuery({
    queryKey: ['afas-draw-confirmations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_events')
        .select('id, loan_id, event_type, status, metadata')
        .in('event_type', ['principal_draw', 'principal_repayment'])
        .not('metadata->afas_ref', 'is', null);
      if (error) throw error;
      const map = new Map<string, { id: string; status: string }>();
      for (const event of data as LoanEvent[]) {
        const ref = (event.metadata as Record<string, unknown>)?.afas_ref;
        if (typeof ref === 'string') {
          map.set(ref, { id: event.id, status: event.status });
        }
      }
      return map;
    },
    staleTime: 30 * 1000,
  });
}

// ── Page component ─────────────────────────────────────────────

export default function AfasDashboard({ embedded }: { embedded?: boolean } = {}) {
  const connection = useAfasConnection();
  const loanIds = useLoanIds();
  const drawConfirmations = useAfasDrawConfirmations();
  const confirmDraw = useConfirmDraw();
  const { isController } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenValue, setTokenValue] = useState('');
  const [tokenSaving, setTokenSaving] = useState(false);
  const envToggle = useAfasEnvToggle();
  const isTestEnv = envToggle.data ?? true;

  const toggleEnv = useMutation({
    mutationFn: async (useTest: boolean) => {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key: 'AFAS_USE_TEST_ENV', value: String(useTest) }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: (_data, useTest) => {
      queryClient.setQueryData(['app-config', 'AFAS_USE_TEST_ENV'], useTest);
      queryClient.invalidateQueries({ queryKey: ['afas-connection'] });
      queryClient.invalidateQueries({ queryKey: ['afas-connector'] });
      toast({ title: `Switched to ${useTest ? 'Test' : 'Production'} environment`, description: 'Refreshing AFAS data...' });
    },
    onError: (e) => {
      toast({ title: 'Failed to switch environment', description: (e as Error).message, variant: 'destructive' });
    },
  });

  // Connector #3: Cash interest payments — debtor accounts = loan IDs (400..599)
  const payments = useAfasConnector('cash-payments', {
    filterFieldIds: 'UnitId,JournalId,AccountNo',
    filterValues: '5,50,400..599',
    operatorTypes: '1,1,15',
  });

  // Connector #4: Loan draws/repayments (1750–1752)
  const draws = useAfasConnector('loan-draws', {
    filterFieldIds: 'UnitId,JournalId,AccountNo',
    filterValues: '5,50,1750..1752',
    operatorTypes: '1,1,15',
  });

  // Depot interest settlements (journal 90, debtor accounts = loan IDs)
  const depot = useAfasConnector('depot-payments', {
    filterFieldIds: 'UnitId,JournalId,AccountNo',
    filterValues: '5,90,400..599',
    operatorTypes: '1,1,15',
  });

  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [drawFilter, setDrawFilter] = useState<string>('all');
  const [depotFilter, setDepotFilter] = useState<string>('all');
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
  const [expandedDraws, setExpandedDraws] = useState<Set<string>>(new Set());
  const [expandedDepot, setExpandedDepot] = useState<Set<string>>(new Set());

  const validIds = loanIds.data?.ids;
  const numericToUuid = loanIds.data?.numericToUuid;

  // Group payments by loan, filtered to known loans only
  const paymentGroups = useMemo(() => {
    const rows = payments.data ?? [];
    const groups = groupByLoan(
      rows,
      (r) => String(r.AccountNo),
      (r) => r.AmtCredit > 0 ? r.AmtCredit : -r.AmtDebit,
    );
    return validIds ? groups.filter(g => validIds.has(g.loanId)) : groups;
  }, [payments.data, validIds]);

  const filteredPaymentGroups = useMemo(() => {
    if (paymentFilter === 'all') return paymentGroups;
    return paymentGroups.filter(g => g.loanId === paymentFilter);
  }, [paymentGroups, paymentFilter]);

  // Group draws by loan, filtered to known loans only
  const drawGroups = useMemo(() => {
    const rows = draws.data ?? [];
    const groups = groupByLoan(
      rows,
      (r) => r.DimAx1 ?? null,
      (r) => r.AmtDebit > 0 ? r.AmtDebit : r.AmtCredit,
    );
    return validIds ? groups.filter(g => validIds.has(g.loanId)) : groups;
  }, [draws.data, validIds]);

  const filteredDrawGroups = useMemo(() => {
    if (drawFilter === 'all') return drawGroups;
    return drawGroups.filter(g => g.loanId === drawFilter);
  }, [drawGroups, drawFilter]);

  // Group depot by loan, filtered to known loans only
  const depotGroups = useMemo(() => {
    const rows = depot.data ?? [];
    const groups = groupByLoan(
      rows,
      (r) => String(r.AccountNo),
      (r) => r.AmtCredit > 0 ? r.AmtCredit : -r.AmtDebit,
    );
    return validIds ? groups.filter(g => validIds.has(g.loanId)) : groups;
  }, [depot.data, validIds]);

  const filteredDepotGroups = useMemo(() => {
    if (depotFilter === 'all') return depotGroups;
    return depotGroups.filter(g => g.loanId === depotFilter);
  }, [depotGroups, depotFilter]);

  const isConnected = connection.data?.success === true;

  function togglePayment(loanId: string) {
    setExpandedPayments(prev => {
      const next = new Set(prev);
      if (next.has(loanId)) next.delete(loanId); else next.add(loanId);
      return next;
    });
  }

  function toggleDraw(loanId: string) {
    setExpandedDraws(prev => {
      const next = new Set(prev);
      if (next.has(loanId)) next.delete(loanId); else next.add(loanId);
      return next;
    });
  }

  function toggleDepot(loanId: string) {
    setExpandedDepot(prev => {
      const next = new Set(prev);
      if (next.has(loanId)) next.delete(loanId); else next.add(loanId);
      return next;
    });
  }

  function handleRefresh() {
    connection.refetch();
    payments.refetch();
    draws.refetch();
    depot.refetch();
    loanIds.refetch();
    drawConfirmations.refetch();
  }

  function handleConfirmDraw(row: AfasRow & { amount: number }, loanId: string) {
    const uuid = numericToUuid?.get(loanId);
    if (!uuid) return;
    const afasRef = `${row.EntryNo}-${row.SeqNo}`;
    confirmDraw.mutate({
      loanUuid: uuid,
      eventType: row.AmtDebit > 0 ? 'principal_draw' : 'principal_repayment',
      effectiveDate: row.EntryDate,
      amount: row.amount,
      afasRef,
      afasDescription: row.Description,
    });
  }

  async function handleSaveToken() {
    if (!tokenValue.trim()) return;
    setTokenSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-afas-token', {
        body: { token: tokenValue.trim() },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'Unknown error');
      toast({ title: 'Token updated', description: 'AFAS token saved. Refreshing connection...' });
      setTokenValue('');
      setShowTokenInput(false);
      // Invalidate all AFAS queries so they re-fetch with the new token
      queryClient.invalidateQueries({ queryKey: ['afas-connection'] });
      queryClient.invalidateQueries({ queryKey: ['afas-connector'] });
    } catch (e) {
      toast({ title: 'Failed to save token', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setTokenSaving(false);
    }
  }

  return (
    <div className={embedded ? 'space-y-6' : 'p-6 space-y-6'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold">AFAS Dashboard</h1>
          <p className="text-muted-foreground">Live connector status and data from AFAS Profit</p>
        </div>
        )}
        <div className="flex items-center gap-3">
          {connection.isLoading ? (
            <Badge variant="outline" className="gap-1"><RefreshCw className="h-3 w-3 animate-spin" />Connecting...</Badge>
          ) : isConnected ? (
            <Badge className="bg-accent-sage/15 text-accent-sage border-accent-sage/30 gap-1"><Wifi className="h-3 w-3" />Connected {isTestEnv ? '(Test)' : '(Prod)'}</Badge>
          ) : (
            <Badge variant="destructive" className="gap-1"><WifiOff className="h-3 w-3" />Disconnected</Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={payments.isFetching || draws.isFetching || depot.isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${payments.isFetching || draws.isFetching || depot.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowTokenInput(v => !v)} title="AFAS Token Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings panel (collapsible) */}
      {showTokenInput && (
        <Card className="border-dashed">
          <CardContent className="pt-4 pb-4 space-y-4">
            {/* Environment toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="afas-env-toggle" className="text-sm font-medium">Environment</Label>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${!isTestEnv ? 'text-destructive' : 'text-foreground-muted'}`}>Production</span>
                <Switch
                  id="afas-env-toggle"
                  checked={isTestEnv}
                  onCheckedChange={(checked) => toggleEnv.mutate(checked)}
                  disabled={toggleEnv.isPending}
                />
                <span className={`text-xs font-medium ${isTestEnv ? 'text-accent-sage' : 'text-foreground-muted'}`}>Test</span>
              </div>
            </div>
            {/* Token input */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Update AFAS Token</span>
                <span className="text-xs text-muted-foreground">(rotates daily)</span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Paste new AFAS token XML here..."
                  value={tokenValue}
                  onChange={e => setTokenValue(e.target.value)}
                  className="font-mono text-xs"
                />
                <Button size="sm" onClick={handleSaveToken} disabled={tokenSaving || !tokenValue.trim()}>
                  {tokenSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connector status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ConnectorStatusCard
          title="Connector #3 — Cash Payments"
          description="Interest payments received (debtor acct = loan ID)"
          data={payments}
          count={payments.data?.length}
          loanCount={paymentGroups.length}
        />
        <ConnectorStatusCard
          title="Depot Settlements"
          description="Interest depot settlements (journal 90, debtor acct = loan ID)"
          data={depot}
          count={depot.data?.length}
          loanCount={depotGroups.length}
        />
        <ConnectorStatusCard
          title="Connector #4 — Draws & Repayments"
          description="Bank movements on loan accounts (1750–1752)"
          data={draws}
          count={draws.data?.length}
          loanCount={drawGroups.length}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments" className="gap-1.5">
            <Banknote className="h-4 w-4" />
            Cash Payments
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{payments.data?.length ?? 0}</Badge>
          </TabsTrigger>
          {depotGroups.length > 0 && (
            <TabsTrigger value="depot" className="gap-1.5">
              <Landmark className="h-4 w-4" />
              Depot Settlements
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{depot.data?.length ?? 0}</Badge>
            </TabsTrigger>
          )}
          <TabsTrigger value="draws" className="gap-1.5">
            <ArrowUpRight className="h-4 w-4" />
            Draws & Repayments
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{draws.data?.length ?? 0}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Cash Payments Tab ── */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Cash Interest Payments Received</CardTitle>
                <CardDescription>
                  Dagboek 50, debtor accounts = loan IDs. Click a row to expand transactions.
                  {payments.isError && <span className="ml-2 text-destructive">— Failed to load: {(payments.error as Error)?.message}</span>}
                </CardDescription>
              </div>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({paymentGroups.length})</SelectItem>
                  {paymentGroups.map(g => (
                    <SelectItem key={g.loanId} value={g.loanId}>#{g.loanId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {payments.isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : paymentGroups.length === 0 ? (
                <EmptyState icon={<ArrowDownLeft className="h-8 w-8" />} text="No cash interest payments found in AFAS." />
              ) : (
                <ScrollArea className="h-[calc(100vh-480px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead>ID</TableHead>
                        <TableHead className="text-center">Transactions</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPaymentGroups.map(group => {
                        const isExpanded = expandedPayments.has(group.loanId);
                        return (
                          <>
                            <TableRow
                              key={group.loanId}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => togglePayment(group.loanId)}
                            >
                              <TableCell className="w-8 pr-0">
                                {isExpanded
                                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              </TableCell>
                              <TableCell className="font-mono font-semibold">#{group.loanId}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{group.count}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">{formatCurrency(group.total)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(group.minDate)}{group.minDate !== group.maxDate && ` — ${formatDate(group.maxDate)}`}
                              </TableCell>
                            </TableRow>
                            {isExpanded && group.rows.map((row, i) => (
                              <TableRow key={`${group.loanId}-${row.EntryNo}-${row.SeqNo}-${i}`} className="bg-muted/20">
                                <TableCell />
                                <TableCell className="text-sm text-muted-foreground pl-6">{formatDate(row.EntryDate)}</TableCell>
                                <TableCell />
                                <TableCell className="text-right font-mono text-sm">{formatCurrency(row.amount)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate" title={row.Description}>{row.Description}</TableCell>
                              </TableRow>
                            ))}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Depot Settlements Tab ── */}
        <TabsContent value="depot">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Interest Depot Settlements</CardTitle>
                <CardDescription>
                  Dagboek 90 (memorial), debtor accounts = loan IDs. Interest paid from commitment depot.
                  {depot.isError && <span className="ml-2 text-destructive">— Failed to load: {(depot.error as Error)?.message}</span>}
                </CardDescription>
              </div>
              <Select value={depotFilter} onValueChange={setDepotFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({depotGroups.length})</SelectItem>
                  {depotGroups.map(g => (
                    <SelectItem key={g.loanId} value={g.loanId}>#{g.loanId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {depot.isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : depotGroups.length === 0 ? (
                <EmptyState icon={<Landmark className="h-8 w-8" />} text="No depot settlements found in AFAS." />
              ) : (
                <ScrollArea className="h-[calc(100vh-480px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead>ID</TableHead>
                        <TableHead className="text-center">Transactions</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDepotGroups.map(group => {
                        const isExpanded = expandedDepot.has(group.loanId);
                        return (
                          <>
                            <TableRow
                              key={group.loanId}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleDepot(group.loanId)}
                            >
                              <TableCell className="w-8 pr-0">
                                {isExpanded
                                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              </TableCell>
                              <TableCell className="font-mono font-semibold">#{group.loanId}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{group.count}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">{formatCurrency(group.total)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(group.minDate)}{group.minDate !== group.maxDate && ` — ${formatDate(group.maxDate)}`}
                              </TableCell>
                            </TableRow>
                            {isExpanded && group.rows.map((row, i) => (
                              <TableRow key={`${group.loanId}-${row.EntryNo}-${row.SeqNo}-${i}`} className="bg-muted/20">
                                <TableCell />
                                <TableCell className="text-sm text-muted-foreground pl-6">{formatDate(row.EntryDate)}</TableCell>
                                <TableCell />
                                <TableCell className="text-right font-mono text-sm">{formatCurrency(row.amount)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate" title={row.Description}>{row.Description}</TableCell>
                              </TableRow>
                            ))}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Draws & Repayments Tab ── */}
        <TabsContent value="draws">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Loan Draws & Repayments</CardTitle>
                <CardDescription>
                  Dagboek 50, accounts 1750–1752. DimAx1 = Loan ID. Click a row to expand.
                  {draws.isError && <span className="ml-2 text-destructive">— Failed to load: {(draws.error as Error)?.message}</span>}
                </CardDescription>
              </div>
              <Select value={drawFilter} onValueChange={setDrawFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({drawGroups.length})</SelectItem>
                  {drawGroups.map(g => (
                    <SelectItem key={g.loanId} value={g.loanId}>#{g.loanId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {draws.isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : drawGroups.length === 0 ? (
                <EmptyState icon={<ArrowUpRight className="h-8 w-8" />} text="No draws or repayments found in AFAS." />
              ) : (
                <ScrollArea className="h-[calc(100vh-480px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead>ID</TableHead>
                        <TableHead className="text-center">Transactions</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDrawGroups.map(group => {
                        const isExpanded = expandedDraws.has(group.loanId);
                        const groupConfirmed = group.rows.filter(r => drawConfirmations.data?.has(`${r.EntryNo}-${r.SeqNo}`)).length;
                        return (
                          <>
                            <TableRow
                              key={group.loanId}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleDraw(group.loanId)}
                            >
                              <TableCell className="w-8 pr-0">
                                {isExpanded
                                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              </TableCell>
                              <TableCell className="font-mono font-semibold">#{group.loanId}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{group.count}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">{formatCurrency(group.total)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(group.minDate)}{group.minDate !== group.maxDate && ` — ${formatDate(group.maxDate)}`}
                              </TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground">
                                {groupConfirmed > 0 && <span className="text-accent-sage">{groupConfirmed}/{group.count}</span>}
                              </TableCell>
                            </TableRow>
                            {isExpanded && group.rows.map((row, i) => {
                              const afasRef = `${row.EntryNo}-${row.SeqNo}`;
                              const confirmation = drawConfirmations.data?.get(afasRef);
                              return (
                                <TableRow key={`${group.loanId}-${afasRef}-${i}`} className="bg-muted/20">
                                  <TableCell />
                                  <TableCell className="text-sm text-muted-foreground pl-6">{formatDate(row.EntryDate)}</TableCell>
                                  <TableCell className="text-center">
                                    {row.AmtCredit > 0 ? (
                                      <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">Repayment</Badge>
                                    ) : (
                                      <Badge className="bg-accent-amber/10 text-accent-amber border-accent-amber/30 text-xs">Draw</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm">{formatCurrency(row.amount)}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={row.Description}>{row.Description}</TableCell>
                                  <TableCell className="text-center">
                                    {confirmation?.status === 'approved' ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-accent-sage">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Approved
                                      </span>
                                    ) : confirmation ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-accent-amber">
                                        <Clock className="h-3.5 w-3.5" />
                                        Draft
                                      </span>
                                    ) : isController && numericToUuid?.has(group.loanId) ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => { e.stopPropagation(); handleConfirmDraw(row, group.loanId); }}
                                        disabled={confirmDraw.isPending}
                                        className="h-7 text-xs border-accent-sage/40 text-accent-sage hover:bg-accent-sage/10"
                                      >
                                        Confirm
                                      </Button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                        <CircleDashed className="h-3.5 w-3.5" />
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Small components ───────────────────────────────────────────

function ConnectorStatusCard({ title, description, data, count, loanCount }: {
  title: string;
  description: string;
  data: { isLoading: boolean; isError: boolean; error: unknown; isFetching: boolean };
  count: number | undefined;
  loanCount: number;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-1">
          {data.isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : data.isError ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-accent-sage" />
          )}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
        {data.isLoading ? (
          <Skeleton className="h-7 w-16" />
        ) : data.isError ? (
          <p className="text-sm text-destructive">{(data.error as Error)?.message?.slice(0, 60)}</p>
        ) : (
          <div className="flex items-baseline gap-3">
            <p className="text-2xl font-bold font-mono">{count ?? 0} <span className="text-sm font-normal text-muted-foreground">rows</span></p>
            <p className="text-sm text-muted-foreground">across <span className="font-medium font-mono">{loanCount}</span> loans</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <div className="mx-auto mb-3 opacity-40">{icon}</div>
      <p>{text}</p>
    </div>
  );
}
