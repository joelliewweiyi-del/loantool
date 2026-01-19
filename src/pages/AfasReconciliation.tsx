import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AfasInvoiceSync {
  id: string;
  afas_invoice_nr: string;
  afas_debtor_id: string | null;
  afas_invoice_date: string | null;
  afas_amount: number;
  afas_open_amount: number | null;
  afas_description: string | null;
  loan_id: string | null;
  period_id: string | null;
  parsed_loan_number: string | null;
  parsed_period_month: string | null;
  match_status: string;
  match_notes: string | null;
  tmo_expected_amount: number | null;
  amount_difference: number | null;
  is_paid: boolean;
  synced_at: string;
  loans?: { borrower_name: string; external_loan_id: string | null } | null;
}

interface AfasSyncRun {
  id: string;
  sync_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  invoices_fetched: number;
  invoices_matched: number;
  invoices_unmatched: number;
  error_message: string | null;
}

interface SyncResponse {
  success: boolean;
  error?: string;
  total_fetched?: number;
  matched?: number;
  unmatched?: number;
}

export default function AfasReconciliation() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch synced invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["afas-invoices", activeTab],
    queryFn: async () => {
      let query = supabase
        .from("afas_invoice_sync")
        .select(`
          *,
          loans:loan_id (borrower_name, external_loan_id)
        `)
        .order("afas_invoice_date", { ascending: false });

      if (activeTab === "matched") {
        query = query.eq("match_status", "matched");
      } else if (activeTab === "unmatched") {
        query = query.eq("match_status", "unmatched");
      } else if (activeTab === "discrepancies") {
        query = query.neq("amount_difference", 0);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as AfasInvoiceSync[];
    },
  });

  // Fetch sync runs
  const { data: syncRuns, isLoading: syncRunsLoading } = useQuery({
    queryKey: ["afas-sync-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("afas_sync_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as AfasSyncRun[];
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<SyncResponse>("sync-afas-invoices");
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || "Sync failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Sync complete: ${data?.matched || 0} matched, ${data?.unmatched || 0} unmatched`);
      queryClient.invalidateQueries({ queryKey: ["afas-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["afas-sync-runs"] });
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  // Calculate summary stats
  const stats = {
    total: invoices?.length || 0,
    matched: invoices?.filter((i) => i.match_status === "matched").length || 0,
    unmatched: invoices?.filter((i) => i.match_status === "unmatched").length || 0,
    totalAfasAmount: invoices?.reduce((sum, i) => sum + (i.afas_amount || 0), 0) || 0,
    totalTmoExpected: invoices?.reduce((sum, i) => sum + (i.tmo_expected_amount || 0), 0) || 0,
    totalDifference: invoices?.reduce((sum, i) => sum + Math.abs(i.amount_difference || 0), 0) || 0,
    discrepancies: invoices?.filter((i) => i.amount_difference && Math.abs(i.amount_difference) > 0.01).length || 0,
  };

  const lastSync = syncRuns?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AFAS Reconciliation</h1>
          <p className="text-muted-foreground">
            Compare interest income between TMO and AFAS
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Syncing..." : "Sync from AFAS"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>AFAS Invoiced</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.totalAfasAmount)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.total} invoices synced
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>TMO Expected</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.totalTmoExpected)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Based on approved periods
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Match Rate</CardDescription>
            <CardTitle className="text-2xl">
              {stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.matched} matched, {stats.unmatched} unmatched
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Discrepancies</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {stats.discrepancies}
              {stats.discrepancies > 0 && (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Total diff: {formatCurrency(stats.totalDifference)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Last Sync Info */}
      {lastSync && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last sync:</span>
              <span className="flex items-center gap-2">
                {lastSync.status === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : lastSync.status === "failed" ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                )}
                {formatDate(lastSync.started_at)} - {lastSync.invoices_fetched} fetched,{" "}
                {lastSync.invoices_matched} matched
                {lastSync.error_message && (
                  <span className="text-red-500 ml-2">{lastSync.error_message}</span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Table */}
      <Card>
        <CardHeader>
          <CardTitle>Interest Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="matched">Matched ({stats.matched})</TabsTrigger>
              <TabsTrigger value="unmatched">Unmatched ({stats.unmatched})</TabsTrigger>
              <TabsTrigger value="discrepancies">Discrepancies ({stats.discrepancies})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {invoicesLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : invoices && invoices.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice Nr</TableHead>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">AFAS Amount</TableHead>
                        <TableHead className="text-right">TMO Expected</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm">
                            {invoice.afas_invoice_nr}
                          </TableCell>
                          <TableCell>
                            {invoice.loans?.borrower_name || (
                              <span className="text-muted-foreground italic">
                                {invoice.parsed_loan_number
                                  ? `Loan #${invoice.parsed_loan_number}`
                                  : "Unknown"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {invoice.afas_invoice_date
                              ? formatDate(invoice.afas_invoice_date)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(invoice.afas_amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {invoice.tmo_expected_amount !== null
                              ? formatCurrency(invoice.tmo_expected_amount)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {invoice.amount_difference !== null &&
                            Math.abs(invoice.amount_difference) > 0.01 ? (
                              <span
                                className={`flex items-center justify-end gap-1 ${
                                  invoice.amount_difference > 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {invoice.amount_difference > 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {formatCurrency(Math.abs(invoice.amount_difference))}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                invoice.match_status === "matched"
                                  ? "default"
                                  : invoice.match_status === "unmatched"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {invoice.match_status}
                            </Badge>
                            {invoice.match_notes && (
                              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                                {invoice.match_notes}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No invoices synced yet. Click "Sync from AFAS" to fetch invoices.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
