import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Database, FileText, BookOpen, Receipt, AlertCircle, Users, Landmark, Building2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

// Group connectors by category
const CONNECTOR_GROUPS = [
  {
    name: 'Chart of Accounts / GL',
    icon: Landmark,
    connectors: [
      { id: 'Profit_Accounts', name: 'GL Accounts', description: 'Chart of accounts / grootboekrekeningen' },
      { id: 'DDI_Profit_Grootboek', name: 'DDI Grootboek', description: 'Extended GL account info (DDI)' },
      { id: 'Profit_Period_balance', name: 'Period Balances', description: 'GL balances per period' },
      { id: 'Profit_Transactions_Allocated', name: 'Allocated Transactions', description: 'Verbijzonderde grootboekkaart' },
      { id: 'Profit_Balance_Allocated', name: 'Allocated Balances', description: 'Verbijzonderde kolommenbalans' },
    ]
  },
  {
    name: 'Debtor / Creditor',
    icon: Building2,
    connectors: [
      { id: 'Profit_Debtor', name: 'Debtors', description: 'Debtor master data' },
      { id: 'Profit_Creditor', name: 'Creditors', description: 'Creditor master data' },
      { id: 'Profit_Debtor_Invoices', name: 'Debtor Invoices', description: 'Open debtor invoices' },
      { id: 'Profit_Creditor_Invoices', name: 'Creditor Invoices', description: 'Open creditor invoices' },
    ]
  },
  {
    name: 'Financial Transactions',
    icon: FileText,
    connectors: [
      { id: 'Profit_Transactions', name: 'Transactions', description: 'GL transactions' },
      { id: 'Profit_Journals', name: 'Journals', description: 'Journal definitions' },
    ]
  },
  {
    name: 'Dimensions & Cost Centres',
    icon: Users,
    connectors: [
      { id: 'DDI_Profit_Kostenplaatsen', name: 'DDI Kostenplaatsen', description: 'Cost centres (DDI)' },
      { id: 'DDI_Profit_Kostendragers', name: 'DDI Kostendragers', description: 'Cost carriers (DDI)' },
      { id: 'DDI_Profit_Dimensies', name: 'DDI Dimensies', description: 'Dimension 1' },
      { id: 'DDI_Profit_Dimensies_2', name: 'DDI Dimensies 2', description: 'Dimension 2' },
      { id: 'DDI_Profit_Dimensies_3', name: 'DDI Dimensies 3', description: 'Dimension 3' },
      { id: 'Profit_CostCentre', name: 'Cost Centres', description: 'Standard cost centres' },
      { id: 'Profit_CostCarrier', name: 'Cost Carriers', description: 'Standard cost carriers' },
    ]
  },
];

function ConnectorCard({ connectorId, connectorName, description, unitId }: { 
  connectorId: string; 
  connectorName: string; 
  description: string;
  unitId: string | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const [schemaOpen, setSchemaOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery<ConnectorData>({
    queryKey: ['afas-connector', connectorId, unitId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-read', {
        body: { 
          connector: connectorId,
          unitId: unitId === 'all' ? null : unitId
        }
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Handle nested response: data.data.rows or data.data (depending on AFAS response)
  const rawData = data?.data;
  const records: Record<string, unknown>[] = Array.isArray(rawData) 
    ? rawData 
    : ((rawData as AfasRows)?.rows || []);
  const schema = data?.schema?.fields || [];

  const allKeys: string[] = records.length > 0 
    ? [...new Set(records.flatMap(record => Object.keys(record)))]
    : [];

  return (
    <Card className="border-l-4 border-l-primary/30">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent justify-start gap-2">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <div className="text-left">
                  <CardTitle className="text-base">{connectorName}</CardTitle>
                  <CardDescription className="text-xs">{description} • <code className="text-[10px]">{connectorId}</code></CardDescription>
                </div>
              </Button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : data?.success ? (
                <Badge variant="secondary" className="text-xs">{records.length} rows</Badge>
              ) : data?.error?.includes('niet geautoriseerd') || data?.error?.includes('Could not read') ? (
                <Badge variant="outline" className="text-xs text-warning border-warning/50 bg-warning/10">Not Authorized</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Error</Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : error || !data?.success ? (
              data?.error?.includes('niet geautoriseerd') || data?.error?.includes('Could not read') ? (
                <div className="flex items-center gap-2 text-warning p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Connector not authorized. Enable <code className="font-mono bg-warning/20 px-1 rounded">{connectorId}</code> in AFAS for your token.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive p-3 bg-destructive/10 rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{data?.error || (error as Error)?.message || 'Failed to fetch'}</span>
                </div>
              )
            ) : (
              <>
                {/* Schema */}
                {schema.length > 0 && (
                  <Collapsible open={schemaOpen} onOpenChange={setSchemaOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-between h-8 text-xs">
                        <span className="flex items-center gap-2">
                          <Database className="h-3 w-3" />
                          {schema.length} fields
                        </span>
                        <ChevronDown className={`h-3 w-3 transition-transform ${schemaOpen ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 p-2 bg-muted rounded-lg">
                        <div className="flex flex-wrap gap-1">
                          {schema.map((field) => (
                            <Badge key={field.fieldId} variant="outline" className="text-[10px] font-mono">
                              {field.fieldId}
                              <span className="text-muted-foreground ml-1">({field.dataType})</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Data Table */}
                {records.length > 0 ? (
                  <ScrollArea className="h-[250px] rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {allKeys.map((key) => (
                            <TableHead key={key} className="whitespace-nowrap font-mono text-[10px] h-8 px-2">
                              {key}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((record, idx) => (
                          <TableRow key={idx}>
                            {allKeys.map((key) => (
                              <TableCell key={key} className="font-mono text-[11px] whitespace-nowrap max-w-[180px] truncate px-2 py-1">
                                {formatCellValue(record[key])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No records found
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (Math.abs(value) >= 100) {
      return new Intl.NumberFormat('nl-NL', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }).format(value);
    }
    return value.toString();
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function AfasData() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');

  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AFAS Data Explorer</h1>
          <p className="text-muted-foreground">
            All available Profit connectors grouped by category
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select Administration" />
            </SelectTrigger>
            <SelectContent>
              {ADMINISTRATIONS.map((admin) => (
                <SelectItem key={admin.id} value={admin.id}>
                  {admin.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            Env: 36537
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Connector Groups */}
      <div className="space-y-8" key={refreshKey}>
        {CONNECTOR_GROUPS.map((group) => (
          <div key={group.name} className="space-y-3">
            {/* Group Header */}
            <div className="flex items-center gap-2 border-b pb-2">
              <group.icon className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">{group.name}</h2>
              <Badge variant="secondary" className="text-xs">
                {group.connectors.length} connector{group.connectors.length > 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Connectors in Group */}
            <div className="grid gap-3">
              {group.connectors.map((connector) => (
                <ConnectorCard
                  key={`${connector.id}-${selectedUnit}`}
                  connectorId={connector.id}
                  connectorName={connector.name}
                  description={connector.description}
                  unitId={selectedUnit}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Note */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <strong>Matching Strategy:</strong> The <code className="bg-background px-1 rounded text-xs">Description</code> field 
              from Debtor Invoices is parsed to extract loan numbers and periods (e.g., "458 - Rente P12 2025"). 
              The <code className="bg-background px-1 rounded text-xs">verbijzonderingsas</code> dimension field is not available 
              in standard connectors—requires a custom GetConnector from AFAS admin.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
