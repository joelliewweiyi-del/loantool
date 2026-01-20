import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/format';

interface AfasTransaction {
  DimAx1?: string;
  Deb?: number;
  Crd?: number;
  BalSd?: number;
  GlAc?: string;
  GlAcDe?: string;
  [key: string]: unknown;
}

interface AfasRows {
  rows?: AfasTransaction[];
}

interface ConnectorData {
  success: boolean;
  data?: AfasRows | AfasTransaction[];
  error?: string;
}

interface Loan {
  id: string;
  external_loan_id: string | null;
  borrower_name: string;
  total_commitment: number | null;
  initial_principal: number | null;
  status: string;
}

interface LoanBalance {
  loanId: string;
  externalLoanId: string;
  borrowerName: string;
  afasCredits: number;
  afasDebits: number;
  afasNet: number;
  tmoCommitment: number;
  tmoPrincipal: number;
  difference: number;
  status: 'matched' | 'variance' | 'missing_tmo' | 'missing_afas';
  transactionCount: number;
}

function downloadCSV(data: LoanBalance[], filename: string) {
  if (data.length === 0) return;
  
  const headers = [
    'Loan ID', 'External ID', 'Borrower', 
    'AFAS Credits', 'AFAS Debits', 'AFAS Net',
    'TMO Commitment', 'TMO Principal', 'Difference', 'Status', 'Tx Count'
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
      row.tmoCommitment.toFixed(2),
      row.tmoPrincipal.toFixed(2),
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

export function LoanReconciliationTab({ unitId }: { unitId: string }) {
  // Fetch AFAS allocated balances
  const { data: afasData, isLoading: afasLoading, refetch: refetchAfas, isFetching: afasFetching } = useQuery<ConnectorData>({
    queryKey: ['afas-reconciliation', 'Profit_Balance_Allocated', unitId],
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

  // Fetch TMO loans
  const { data: loans, isLoading: loansLoading, refetch: refetchLoans } = useQuery({
    queryKey: ['loans-for-reconciliation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('id, external_loan_id, borrower_name, total_commitment, initial_principal, status')
        .eq('status', 'active');
      if (error) throw error;
      return data as Loan[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Process and reconcile data
  const reconciliationData = useMemo(() => {
    const rawData = afasData?.data;
    const records: AfasTransaction[] = Array.isArray(rawData) 
      ? rawData 
      : ((rawData as AfasRows)?.rows || []);
    
    // Group AFAS transactions by DimAx1 (loan ID)
    const afasGrouped = new Map<string, { credits: number; debits: number; net: number; count: number }>();
    
    for (const tx of records) {
      const loanId = tx.DimAx1;
      if (!loanId || loanId === '' || loanId === '0') continue;
      
      const existing = afasGrouped.get(loanId) || { credits: 0, debits: 0, net: 0, count: 0 };
      const credit = Number(tx.Crd) || 0;
      const debit = Number(tx.Deb) || 0;
      
      existing.credits += credit;
      existing.debits += debit;
      existing.net = existing.credits - existing.debits;
      existing.count += 1;
      
      afasGrouped.set(loanId, existing);
    }

    // Create loan lookup by external_loan_id
    const loanLookup = new Map<string, Loan>();
    for (const loan of (loans || [])) {
      if (loan.external_loan_id) {
        loanLookup.set(loan.external_loan_id, loan);
      }
    }

    // Build reconciliation records
    const results: LoanBalance[] = [];
    const processedTmoIds = new Set<string>();

    // Process all AFAS entries
    for (const [externalId, afasBalance] of afasGrouped) {
      const tmoLoan = loanLookup.get(externalId);
      
      if (tmoLoan) {
        processedTmoIds.add(tmoLoan.id);
        const tmoCommitment = tmoLoan.total_commitment || 0;
        const tmoPrincipal = tmoLoan.initial_principal || 0;
        const difference = afasBalance.net - tmoCommitment;
        
        results.push({
          loanId: tmoLoan.id,
          externalLoanId: externalId,
          borrowerName: tmoLoan.borrower_name,
          afasCredits: afasBalance.credits,
          afasDebits: afasBalance.debits,
          afasNet: afasBalance.net,
          tmoCommitment,
          tmoPrincipal,
          difference,
          status: Math.abs(difference) < 0.01 ? 'matched' : 'variance',
          transactionCount: afasBalance.count
        });
      } else {
        // In AFAS but not in TMO
        results.push({
          loanId: '',
          externalLoanId: externalId,
          borrowerName: '(Not in TMO)',
          afasCredits: afasBalance.credits,
          afasDebits: afasBalance.debits,
          afasNet: afasBalance.net,
          tmoCommitment: 0,
          tmoPrincipal: 0,
          difference: afasBalance.net,
          status: 'missing_tmo',
          transactionCount: afasBalance.count
        });
      }
    }

    // Add TMO loans not in AFAS
    for (const loan of (loans || [])) {
      if (!processedTmoIds.has(loan.id) && loan.external_loan_id) {
        results.push({
          loanId: loan.id,
          externalLoanId: loan.external_loan_id,
          borrowerName: loan.borrower_name,
          afasCredits: 0,
          afasDebits: 0,
          afasNet: 0,
          tmoCommitment: loan.total_commitment || 0,
          tmoPrincipal: loan.initial_principal || 0,
          difference: -(loan.total_commitment || 0),
          status: 'missing_afas',
          transactionCount: 0
        });
      }
    }

    // Sort by status priority, then by absolute difference
    return results.sort((a, b) => {
      const statusOrder = { variance: 0, missing_tmo: 1, missing_afas: 2, matched: 3 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return Math.abs(b.difference) - Math.abs(a.difference);
    });
  }, [afasData, loans]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const matched = reconciliationData.filter(r => r.status === 'matched').length;
    const variance = reconciliationData.filter(r => r.status === 'variance').length;
    const missingTmo = reconciliationData.filter(r => r.status === 'missing_tmo').length;
    const missingAfas = reconciliationData.filter(r => r.status === 'missing_afas').length;
    const totalAfas = reconciliationData.reduce((sum, r) => sum + r.afasNet, 0);
    const totalTmo = reconciliationData.reduce((sum, r) => sum + r.tmoCommitment, 0);
    
    return { matched, variance, missingTmo, missingAfas, totalAfas, totalTmo };
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
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Matched</Badge>;
      case 'variance':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30"><AlertTriangle className="h-3 w-3 mr-1" />Variance</Badge>;
      case 'missing_tmo':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Not in TMO</Badge>;
      case 'missing_afas':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><XCircle className="h-3 w-3 mr-1" />Not in AFAS</Badge>;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Loan Balance Reconciliation</CardTitle>
            <CardDescription className="text-xs">
              AFAS DimAx1 balances vs TMO commitment tracking
            </CardDescription>
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
              onClick={() => downloadCSV(reconciliationData, 'loan_reconciliation')}
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
            <p className="text-xl font-bold text-green-600">{stats.matched}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Variance</p>
            <p className="text-xl font-bold text-amber-600">{stats.variance}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Not in TMO</p>
            <p className="text-xl font-bold text-red-600">{stats.missingTmo}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Not in AFAS</p>
            <p className="text-xl font-bold text-blue-600">{stats.missingAfas}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">AFAS Total</p>
            <p className="text-lg font-semibold">{formatCurrency(stats.totalAfas)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">TMO Total</p>
            <p className="text-lg font-semibold">{formatCurrency(stats.totalTmo)}</p>
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
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0">Borrower</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">AFAS Credits</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">AFAS Debits</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">AFAS Net</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">TMO Commitment</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">Difference</TableHead>
                  <TableHead className="text-xs px-2 py-1 bg-muted/50 sticky top-0 text-right">Tx #</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliationData.map((row, idx) => (
                  <TableRow key={`${row.externalLoanId}-${idx}`} className={row.status === 'variance' ? 'bg-amber-500/5' : row.status === 'missing_tmo' ? 'bg-red-500/5' : row.status === 'missing_afas' ? 'bg-blue-500/5' : ''}>
                    <TableCell className="px-2 py-1">{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="px-2 py-1 font-mono text-xs">{row.externalLoanId}</TableCell>
                    <TableCell className="px-2 py-1 text-xs max-w-[200px] truncate">{row.borrowerName}</TableCell>
                    <TableCell className="px-2 py-1 text-xs text-right font-mono">{formatCurrency(row.afasCredits)}</TableCell>
                    <TableCell className="px-2 py-1 text-xs text-right font-mono">{formatCurrency(row.afasDebits)}</TableCell>
                    <TableCell className="px-2 py-1 text-xs text-right font-mono font-semibold">{formatCurrency(row.afasNet)}</TableCell>
                    <TableCell className="px-2 py-1 text-xs text-right font-mono">{formatCurrency(row.tmoCommitment)}</TableCell>
                    <TableCell className={`px-2 py-1 text-xs text-right font-mono font-semibold ${row.difference !== 0 ? (row.difference > 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                      {row.difference !== 0 ? (row.difference > 0 ? '+' : '') + formatCurrency(row.difference) : '—'}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-xs text-right text-muted-foreground">{row.transactionCount}</TableCell>
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
