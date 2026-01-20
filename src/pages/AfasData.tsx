import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Database, FileText, BookOpen, Receipt, AlertCircle, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ConnectorData {
  success: boolean;
  connector?: string;
  data?: Record<string, unknown>[];
  schema?: { fields?: { fieldId: string; dataType: string; label?: string }[] };
  error?: string;
  count?: number;
}

// Group connectors by category
const CONNECTOR_GROUPS = [
  {
    name: 'Debtor / Invoicing',
    icon: Receipt,
    connectors: [
      { id: 'Profit_Debtor_Invoices', name: 'Debtor Invoices', description: 'Open debtor invoices' },
    ]
  },
  {
    name: 'Financial Transactions',
    icon: FileText,
    connectors: [
      { id: 'profit_transactions', name: 'Transactions', description: 'GL transactions' },
      { id: 'profit_journals', name: 'Journals', description: 'Journal definitions' },
    ]
  },
  {
    name: 'Master Data',
    icon: Users,
    connectors: [
      { id: 'profit_costcentre', name: 'Cost Centres', description: 'HR cost centres (not GL dimensions)' },
    ]
  },
];

function ConnectorCard({ connectorId, connectorName, description }: { 
  connectorId: string; 
  connectorName: string; 
  description: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [schemaOpen, setSchemaOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery<ConnectorData>({
    queryKey: ['afas-connector', connectorId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('test-afas-read', {
        body: { connector: connectorId }
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const records = data?.data || [];
  const schema = data?.schema?.fields || [];

  const allKeys = records.length > 0 
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
              <div className="flex items-center gap-2 text-destructive p-3 bg-destructive/10 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{data?.error || (error as Error)?.message || 'Failed to fetch'}</span>
              </div>
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
        <div className="flex items-center gap-2">
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
                  key={connector.id}
                  connectorId={connector.id}
                  connectorName={connector.name}
                  description={connector.description}
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
