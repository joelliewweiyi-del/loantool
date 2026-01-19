import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, FileText, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface AfasInvoice {
  InvoiceNr?: string;
  DebtorId?: string;
  Description?: string;
  NookPieceDate?: string; // Invoice date
  ExpDate?: string; // Due date
  AmtInvoice?: number; // Invoice amount
  Balance?: number; // Open amount
  UnitId?: number;
  CurrencyId?: string | null;
  [key: string]: unknown;
}

interface AfasResponse {
  success: boolean;
  total_in_afas: number;
  filtered_count: number;
  available_fields: string[];
  invoices: AfasInvoice[];
  error?: string;
}

export default function AfasInvoices() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<AfasResponse>({
    queryKey: ['afas-invoices'],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-afas-invoices`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch AFAS invoices');
      }
      
      return response.json();
    },
  });

  const totalAmount = data?.invoices?.reduce((sum, inv) => sum + (inv.AmtInvoice || 0), 0) || 0;
  const totalOpen = data?.invoices?.reduce((sum, inv) => sum + (inv.Balance || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AFAS Invoices</h1>
          <p className="text-muted-foreground">
            Direct view of open debtor invoices in AFAS Profit
          </p>
        </div>
        <Button onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoices</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? <Skeleton className="h-8 w-16" /> : data?.filtered_count || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {data?.total_in_afas ? `of ${data.total_in_afas} total in AFAS` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Invoiced</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(totalAmount)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Open</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(totalOpen)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Available Fields Debug Info */}
      {data?.available_fields && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Available AFAS Fields
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {data.available_fields.map((field) => (
                <Badge key={field} variant="outline" className="text-xs">
                  {field}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Loading AFAS Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Open Debtor Invoices</CardTitle>
          <CardDescription>
            All open invoices from AFAS Profit_Debtor_Invoices connector
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.invoices && data.invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Nr</TableHead>
                    <TableHead>Debtor ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.invoices.map((invoice, idx) => (
                    <TableRow key={invoice.InvoiceNr || idx}>
                      <TableCell className="font-mono">{invoice.InvoiceNr || '-'}</TableCell>
                      <TableCell className="font-medium">{invoice.DebtorId || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate" title={invoice.Description}>
                        {invoice.Description || '-'}
                      </TableCell>
                      <TableCell>{invoice.NookPieceDate?.substring(0, 10) || '-'}</TableCell>
                      <TableCell>{invoice.ExpDate?.substring(0, 10) || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(invoice.AmtInvoice || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(invoice.Balance || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found in AFAS</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
