import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Database, Landmark, Building2, FileText, AlertCircle, Scale, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

// Administration books available in AFAS (1-10)
const ADMINISTRATIONS = [
  { id: 'all', label: 'All Administrations' },
  { id: '1', label: '01 - Administration 1' },
  { id: '2', label: '02 - Administration 2' },
  { id: '3', label: '03 - Administration 3' },
  { id: '4', label: '04 - Administration 4' },
  { id: '5', label: '05 - RAX RED IV B.V.' },
  { id: '6', label: '06 - Administration 6' },
  { id: '7', label: '07 - Administration 7' },
  { id: '8', label: '08 - Administration 8' },
  { id: '9', label: '09 - Administration 9' },
  { id: '10', label: '10 - Administration 10' },
];

interface AfasRows {
  rows?: Record<string, unknown>[];
  skip?: number;
  take?: number;
}

interface ConnectorData {
  success: boolean;
  connector?: string;
  data?: AfasRows | Record<string, unknown>[];
  schema?: { fields?: { fieldId: string; dataType: string; label?: string }[] };
  error?: string;
  count?: number;
}

interface Loan {
  id: string;
  external_loan_id: string | null;
  loan_name: string | null;
  borrower_name: string;
  total_commitment: number | null;
  outstanding: number | null;
  status: string;
}

interface LoanBalance {
  loanId: string;
  externalLoanId: string;
  borrowerName: string;
  afasCredits: number;
  afasDebits: number;
  afasNet: number;
  commitment: number;
  afasOutstanding: number; // commitment - afasNet
  outstanding: number;
  difference: number; // outstanding - afasOutstanding
  status: 'matched' | 'variance' | 'missing_in_app' | 'missing_afas';
  transactionCount: number;
}

const CONNECTORS = [
  { 
    id: 'Profit_Transactions_Allocated', 
    name: 'Allocated Transactions', 
    description: 'Verbijzonderde grootboekkaart - GL transactions with cost allocation',
    icon: FileText
  },
  { 
    id: 'Profit_Balance_Allocated', 
    name: 'Allocated Balances', 
    description: 'Verbijzonderde kolommenbalans - GL balances with dimensions',
    icon: Landmark
  },
  { 
    id: 'Profit_Debtor', 
    name: 'Debtors', 
    description: 'Debtor master data',
    icon: Building2
  },
];

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(';'),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(';')
    )
  ];
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadReconciliationCSV(data: LoanBalance[], filename: string) {
  if (data.length === 0) return;
  
  const headers = [
    'Loan ID', 'External ID', 'Borrower', 
    'AFAS Credits', 'AFAS Debits', 'AFAS Net (Commitment Remaining)',
    'Commitment', 'AFAS Outstanding', 'Outstanding', 'Delta', 'Status', 'Tx Count'
  ];
  
  const csvRows = [
    headers.join(';'),
    ...data.map(row => [
      row.loanId,
      row.externalLoanId,
      `"${row.borrowerName.replace(/"/g, '""')}"`,
      row.afasCredits.toFixed(2),
      row.afasDebits.toFixed(2),
      row.afasNet.toFixed(2),
      row.commitment.toFixed(2),
      row.afasOutstanding.toFixed(2),
      row.outstanding.toFixed(2),
      row.difference.toFixed(2),
      row.status,
      row.transactionCount
    ].join(';'))
  ];
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ConnectorPanel({ 
  connectorId, 
  connectorName, 
  description, 
  icon: Icon,
  data,
  isLoading,
  error,
  refetch,
  isFetching
}: { 
  connectorId: string; 
  connectorName: string; 
  description: string;
  icon: React.ElementType;
  data: ConnectorData | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
}) {
  const [schemaOpen, setSchemaOpen] = useState(false);

  const rawData = data?.data;
  const records: Record<string, unknown>[] = Array.isArray(rawData) 
    ? rawData 
    : ((rawData as AfasRows)?.rows || []);
  const schema = data?.schema?.fields || [];

  const allKeys: string[] = records.length > 0 
    ? [...new Set(records.flatMap(record => Object.keys(record)))]
    : [];

  const isNotAuthorized = data?.error?.includes('niet geautoriseerd') || data?.error?.includes('Could not read');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{connectorName}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-5 w-16" />
            ) : data?.success ? (
              <Badge variant="secondary" className="text-xs">{records.length.toLocaleString()} rows</Badge>
            ) : isNotAuthorized ? (
              <Badge variant="outline" className="text-xs text-warning border-warning/50 bg-warning/10">Not Authorized</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">Error</Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => downloadCSV(records, connectorId)}
              disabled={records.length === 0}
            >
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col gap-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : error || !data?.success ? (
          isNotAuthorized ? (
            <div className="flex items-center gap-2 text-warning p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Connector not authorized. Enable <code className="font-mono bg-warning/20 px-1 rounded">{connectorId}</code> in AFAS for your token.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive p-3 bg-destructive/10 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{data?.error || error?.message || 'Failed to fetch'}</span>
            </div>
          )
        ) : (
          <>
            {schema.length > 0 && (
              <Collapsible open={schemaOpen} onOpenChange={setSchemaOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    {schemaOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                    Schema ({schema.length} fields)
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded text-xs max-h-32 overflow-auto">
                    {schema.map((field) => (
                      <Badge key={field.fieldId} variant="outline" className="text-[10px]">
                        {field.fieldId} <span className="text-muted-foreground">({field.dataType})</span>
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {allKeys.map((key) => (
                      <TableHead key={key} className="text-xs whitespace-nowrap px-2 py-1 bg-muted/50">
                        {key}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 500).map((record, idx) => (
                    <TableRow key={idx}>
                      {allKeys.map((key) => (
                        <TableCell key={key} className="text-xs whitespace-nowrap px-2 py-1 max-w-[200px] truncate">
                          {record[key] !== null && record[key] !== undefined 
                            ? String(record[key]) 
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            {records.length > 500 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing 500 of {records.length.toLocaleString()} rows. Download CSV for full data.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LoanReconciliationPanel({
  afasData,
  afasLoading,
  afasFetching,
  refetchAfas,
  loans,
  loansLoading,
  refetchLoans
}: {
  afasData: ConnectorData | undefined;
  afasLoading: boolean;
  afasFetching: boolean;
  refetchAfas: () => void;
  loans: Loan[] | undefined;
  loansLoading: boolean;
  refetchLoans: () => void;
}) {
  // Process and reconcile data
  const reconciliationData = useMemo(() => {
    const rawData = afasData?.data;
    const records: Record<string, unknown>[] = Array.isArray(rawData) 
      ? rawData 
      : ((rawData as AfasRows)?.rows || []);
    
    // Group AFAS transactions by DimAx1 (loan ID), filtered to AccountNo 1751 only
    const afasGrouped = new Map<string, { credits: number; debits: number; net: number; count: number }>();
    
    for (const tx of records) {
      // Filter to only include AccountNo 1751 (loan receivables)
      const accountNo = String(tx.AccountNo || tx.AccNo || '');
      if (accountNo !== '1751') continue;
      
      const loanId = tx.DimAx1 as string | undefined;
      if (!loanId || loanId === '' || loanId === '0') continue;
      
      const existing = afasGrouped.get(loanId) || { credits: 0, debits: 0, net: 0, count: 0 };
      const credit = Number(tx.AmtCredit) || 0;
      const debit = Number(tx.AmtDebit) || 0;
      
      existing.credits += credit;
      existing.debits += debit;
      existing.net = existing.credits - existing.debits;
      existing.count += 1;
      
      afasGrouped.set(loanId, existing);
    }

    // Create loan lookup by external_loan_id AND loan_name (fallback)
    const loanLookupByExternal = new Map<string, Loan>();
    const loanLookupByName = new Map<string, Loan>();
    for (const loan of (loans || [])) {
      if (loan.external_loan_id) {
        loanLookupByExternal.set(loan.external_loan_id, loan);
      }
      // Also allow matching by loan_name (e.g., "484")
      if (loan.loan_name) {
        loanLookupByName.set(loan.loan_name, loan);
      }
    }

    // Build reconciliation records
    const results: LoanBalance[] = [];
    const processedLoanIds = new Set<string>();

    // Process all AFAS entries
    for (const [externalId, afasBalance] of afasGrouped) {
      // Try to match by external_loan_id first, then by loan_name
      const matchedLoan = loanLookupByExternal.get(externalId) || loanLookupByName.get(externalId);
      
      if (matchedLoan) {
        processedLoanIds.add(matchedLoan.id);
        const commitment = matchedLoan.total_commitment || 0;
        // Use outstanding directly from loans table (auto-synced when events are approved)
        const outstanding = matchedLoan.outstanding || 0;
        // AFAS Outstanding = Commitment - AFAS Net (commitment remaining)
        const afasOutstanding = commitment - afasBalance.net;
        // Delta = Outstanding - AFAS Outstanding
        const difference = outstanding - afasOutstanding;
        
        results.push({
          loanId: matchedLoan.id,
          externalLoanId: externalId,
          borrowerName: matchedLoan.borrower_name,
          afasCredits: afasBalance.credits,
          afasDebits: afasBalance.debits,
          afasNet: afasBalance.net,
          commitment,
          afasOutstanding,
          outstanding,
          difference,
          status: Math.abs(difference) < 0.01 ? 'matched' : 'variance',
          transactionCount: afasBalance.count
        });
      } else {
        // In AFAS but not in App - can't calculate afasOutstanding without commitment
        results.push({
          loanId: '',
          externalLoanId: externalId,
          borrowerName: '(Not in App)',
          afasCredits: afasBalance.credits,
          afasDebits: afasBalance.debits,
          afasNet: afasBalance.net,
          commitment: 0,
          afasOutstanding: 0,
          outstanding: 0,
          difference: 0,
          status: 'missing_in_app',
          transactionCount: afasBalance.count
        });
      }
    }

    // Add App loans not in AFAS (show ALL loans, even without external_loan_id)
    for (const loan of (loans || [])) {
      if (!processedLoanIds.has(loan.id)) {
        const outstanding = loan.outstanding || 0;
        const commitment = loan.total_commitment || 0;
        const displayId = loan.external_loan_id || loan.loan_name || loan.id.slice(0, 8);
        // No AFAS data, so afasOutstanding = 0, difference = outstanding - 0 = outstanding
        results.push({
          loanId: loan.id,
          externalLoanId: displayId,
          borrowerName: loan.borrower_name,
          afasCredits: 0,
          afasDebits: 0,
          afasNet: 0,
          commitment,
          afasOutstanding: 0,
          outstanding,
          difference: outstanding,
          status: 'missing_afas',
          transactionCount: 0
        });
      }
    }

    // Sort by status priority, then by absolute difference
    return results.sort((a, b) => {
      const statusOrder = { variance: 0, missing_in_app: 1, missing_afas: 2, matched: 3 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return Math.abs(b.difference) - Math.abs(a.difference);
    });
  }, [afasData, loans]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const matched = reconciliationData.filter(r => r.status === 'matched').length;
    const variance = reconciliationData.filter(r => r.status === 'variance').length;
    const missingInApp = reconciliationData.filter(r => r.status === 'missing_in_app').length;
    const missingAfas = reconciliationData.filter(r => r.status === 'missing_afas').length;
    const totalAfas = reconciliationData.reduce((sum, r) => sum + r.afasNet, 0);
    const totalOutstanding = reconciliationData.reduce((sum, r) => sum + r.outstanding, 0);
    
    return { matched, variance, missingInApp, missingAfas, totalAfas, totalOutstanding };
  }, [reconciliationData]);

  const isLoading = afasLoading || loansLoading;
  const isFetching = afasFetching;

  const handleRefresh = () => {
    refetchAfas();
    refetchLoans();
  };

  const getStatusBadge = (status: LoanBalance['status']) => {
    switch (status) {
      case 'matched':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30"><CheckCircle2 className="h-3 w-3 mr-1" />Matched</Badge>;
      case 'variance':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30"><AlertTriangle className="h-3 w-3 mr-1" />Variance</Badge>;
      case 'missing_in_app':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Not in App</Badge>;
      case 'missing_afas':
        return <Badge variant="outline" className="bg-secondary/50 text-secondary-foreground border-secondary"><XCircle className="h-3 w-3 mr-1" />Not in AFAS</Badge>;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="text-lg">Loan Balance Reconciliation</CardTitle>
              <CardDescription className="text-xs">
                AFAS DimAx1 balances vs loan commitment tracking
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono bg-muted">
              Filtered: GL 1751
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => downloadReconciliationCSV(reconciliationData, 'loan_reconciliation')}
              disabled={reconciliationData.length === 0}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-6 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Matched</p>
            <p className="text-xl font-bold text-primary">{stats.matched}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Variance</p>
            <p className="text-xl font-bold text-warning">{stats.variance}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Not in App</p>
            <p className="text-xl font-bold text-destructive">{stats.missingInApp}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Not in AFAS</p>
            <p className="text-xl font-bold text-muted-foreground">{stats.missingAfas}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">AFAS Total</p>
            <p className="text-lg font-semibold">{formatCurrency(stats.totalAfas)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Outstanding Total</p>
            <p className="text-lg font-semibold">{formatCurrency(stats.totalOutstanding)}</p>
          </Card>
        </div>

        {/* Reconciliation Table */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <ScrollArea className="flex-1 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0">Status</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0">Loan ID</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">AFAS Credit</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">AFAS Debit</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">AFAS Net (Commitment Remaining)</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">Commitment</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">AFAS Outstanding</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">Outstanding</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">Delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliationData.map((row, idx) => (
                  <TableRow key={`${row.externalLoanId}-${idx}`} className={row.status === 'variance' ? 'bg-warning/5' : row.status === 'missing_in_app' ? 'bg-destructive/5' : row.status === 'missing_afas' ? 'bg-muted/30' : ''}>
                    <TableCell className="px-2 py-1">{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="px-2 py-1 font-mono text-xs">{row.externalLoanId}</TableCell>
                    <TableCell className="px-2 py-1 text-xs text-right font-mono">{formatCurrency(row.afasCredits)}</TableCell>
                    <TableCell className="px-2 py-1 text-xs text-right font-mono">{formatCurrency(row.afasDebits)}</TableCell>
                    <TableCell className="px-2 py-1 text-xs text-right font-mono font-semibold">{formatCurrency(row.afasNet)}</TableCell>
                    <TableCell className="px-2 py-1 text-xs text-right font-mono">{formatCurrency(row.commitment)}</TableCell>
                    <TableCell className="px-2 py-1 text-xs text-right font-mono font-semibold">{formatCurrency(row.afasOutstanding)}</TableCell>
                    <TableCell className="px-2 py-1 text-xs text-right font-mono">{formatCurrency(row.outstanding)}</TableCell>
                    <TableCell className={`px-2 py-1 text-xs text-right font-mono font-semibold ${row.difference !== 0 ? (row.difference > 0 ? 'text-primary' : 'text-destructive') : ''}`}>
                      {row.difference !== 0 ? (row.difference > 0 ? '+' : '') + formatCurrency(row.difference) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {reconciliationData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No reconciliation data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default function AfasGLExplorer() {
  const [unitId, setUnitId] = useState('5');
  const [activeTab, setActiveTab] = useState('reconciliation');

  // Fetch all connector data at parent level - single source of truth
  const balanceQuery = useQuery<ConnectorData>({
    queryKey: ['afas-gl-explorer', 'Profit_Balance_Allocated', unitId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-read', {
        body: { 
          connector: 'Profit_Balance_Allocated',
          unitId: unitId === 'all' ? null : unitId,
          take: 10000
        }
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const transactionsQuery = useQuery<ConnectorData>({
    queryKey: ['afas-gl-explorer', 'Profit_Transactions_Allocated', unitId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-read', {
        body: { 
          connector: 'Profit_Transactions_Allocated',
          unitId: unitId === 'all' ? null : unitId,
          take: 10000
        }
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const debtorQuery = useQuery<ConnectorData>({
    queryKey: ['afas-gl-explorer', 'Profit_Debtor', unitId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-read', {
        body: { 
          connector: 'Profit_Debtor',
          unitId: unitId === 'all' ? null : unitId,
          take: 10000
        }
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch loans - outstanding is already auto-synced when events are approved
  const loansQuery = useQuery({
    queryKey: ['loans-for-reconciliation'],
    queryFn: async () => {
      const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('id, external_loan_id, loan_name, borrower_name, total_commitment, outstanding, status')
        .eq('status', 'active');
      if (loansError) throw loansError;
      return loans as Loan[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const connectorQueries: Record<string, typeof balanceQuery> = {
    'Profit_Balance_Allocated': balanceQuery,
    'Profit_Transactions_Allocated': transactionsQuery,
    'Profit_Debtor': debtorQuery,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            AFAS GL Explorer
          </h1>
          <p className="text-muted-foreground text-sm">
            Explore allocated transactions, balances, and debtor data with full export
          </p>
        </div>
        <Select value={unitId} onValueChange={setUnitId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select administration" />
          </SelectTrigger>
          <SelectContent>
            {ADMINISTRATIONS.map((admin) => (
              <SelectItem key={admin.id} value={admin.id}>
                {admin.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="reconciliation" className="gap-2">
            <Scale className="h-4 w-4" />
            Loan Reconciliation
          </TabsTrigger>
          {CONNECTORS.map((connector) => {
            const Icon = connector.icon;
            return (
              <TabsTrigger key={connector.id} value={connector.id} className="gap-2">
                <Icon className="h-4 w-4" />
                {connector.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="reconciliation" className="h-[calc(100vh-280px)]">
          <LoanReconciliationPanel
            afasData={transactionsQuery.data}
            afasLoading={transactionsQuery.isLoading}
            afasFetching={transactionsQuery.isFetching}
            refetchAfas={transactionsQuery.refetch}
            loans={loansQuery.data}
            loansLoading={loansQuery.isLoading}
            refetchLoans={loansQuery.refetch}
          />
        </TabsContent>

        {CONNECTORS.map((connector) => {
          const query = connectorQueries[connector.id];
          return (
            <TabsContent key={connector.id} value={connector.id} className="h-[calc(100vh-280px)]">
              <ConnectorPanel
                connectorId={connector.id}
                connectorName={connector.name}
                description={connector.description}
                icon={connector.icon}
                data={query?.data}
                isLoading={query?.isLoading || false}
                error={query?.error || null}
                refetch={query?.refetch || (() => {})}
                isFetching={query?.isFetching || false}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
