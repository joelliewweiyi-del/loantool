import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollateralItems, useLoanGuarantors } from '@/hooks/useCollateral';
import { useAuth } from '@/hooks/useAuth';
import { FinancialStrip } from '@/components/loans/FinancialStrip';
import { AddCollateralDialog } from '@/components/loans/AddCollateralDialog';
import { EditCollateralDialog } from '@/components/loans/EditCollateralDialog';
import { AddGuarantorDialog } from '@/components/loans/AddGuarantorDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil } from 'lucide-react';
import { formatCurrency, formatDate, formatOwnershipTypeShort } from '@/lib/format';
import { useIsMobile } from '@/hooks/use-mobile';
import type { CollateralItem, LoanGuarantor } from '@/types/loan';

interface CollateralTabProps {
  loanId: string;
  combinedGuaranteeCap: number | null;
}

function CollateralStatusBadge({ status }: { status: string }) {
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

export function CollateralTab({ loanId, combinedGuaranteeCap }: CollateralTabProps) {
  const { data: items, isLoading: itemsLoading } = useCollateralItems(loanId);
  const { data: guarantors, isLoading: guarantorsLoading } = useLoanGuarantors(loanId);
  const { isPM, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const canEdit = isPM || isAdmin;

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<CollateralItem | null>(null);
  const [guarantorDialogOpen, setGuarantorDialogOpen] = useState(false);
  const [editGuarantor, setEditGuarantor] = useState<LoanGuarantor | undefined>(undefined);

  // Compute summary metrics
  const summary = useMemo(() => {
    if (!items) return { activeParcels: 0, registrationTotal: 0, released: 0 };
    const active = items.filter(i => i.status === 'active');
    const released = items.filter(i => i.status !== 'active');

    // Deduplicate registration amounts by (date, amount) combo
    const seen = new Set<string>();
    let registrationTotal = 0;
    for (const item of active) {
      if (item.registration_amount) {
        const key = `${item.registration_date}|${item.registration_amount}`;
        if (!seen.has(key)) {
          seen.add(key);
          registrationTotal += item.registration_amount;
        }
      }
    }

    return { activeParcels: active.length, registrationTotal, released: released.length };
  }, [items]);

  const activeGuarantors = useMemo(() => {
    return guarantors?.filter(g => g.status === 'active').length ?? 0;
  }, [guarantors]);

  // Sort: active first, then by registration_date
  const sortedItems = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      const dateA = a.registration_date || '';
      const dateB = b.registration_date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.perceelnummer || '').localeCompare(b.perceelnummer || '');
    });
  }, [items]);

  const isLoading = itemsLoading || guarantorsLoading;

  if (isLoading) return <Skeleton className="h-96" />;

  const stripItems = [
    { label: 'Parcels', value: String(summary.activeParcels) },
    { label: 'Registration Total', value: formatCurrency(summary.registrationTotal), accent: 'primary' as const },
    { label: 'Guarantors', value: String(activeGuarantors) },
    ...(combinedGuaranteeCap ? [{ label: 'Combined Cap', value: formatCurrency(combinedGuaranteeCap), accent: 'amber' as const }] : []),
    ...(summary.released > 0 ? [{ label: 'Released', value: String(summary.released), accent: 'destructive' as const }] : []),
  ];

  return (
    <div className="space-y-4">
      <FinancialStrip items={stripItems} />

      {/* Collateral Items */}
      <Card className={isMobile ? 'border-0 shadow-none bg-transparent' : ''}>
        <CardHeader className={isMobile ? 'px-0 pt-0 pb-3' : 'flex flex-row items-center justify-between'}>
          {!isMobile && (
            <div>
              <CardTitle>Collateral Register</CardTitle>
              <CardDescription>Cadastral parcels and security registrations</CardDescription>
            </div>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent className={isMobile ? 'px-0' : ''}>
          {!sortedItems.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No collateral items registered yet
            </div>
          ) : isMobile ? (
            <div className="space-y-2">
              {sortedItems.map(item => (
                <div
                  key={item.id}
                  className={`rounded-xl border bg-card px-4 py-3 ${item.status !== 'active' ? 'opacity-60' : ''}`}
                  onClick={() => canEdit && setEditItem(item)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-medium">
                      {[item.gemeente, item.sectie, item.perceelnummer].filter(Boolean).join(' ')}
                    </span>
                    <CollateralStatusBadge status={item.status} />
                  </div>
                  {item.address && (
                    <p className="text-xs text-foreground-secondary truncate">{item.city ? `${item.city} · ` : ''}{item.address}</p>
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
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kadastrale ref</th>
                  <th>Type</th>
                  <th>City / Address</th>
                  <th className="text-right">Registration</th>
                  <th>Area</th>
                  <th>Status</th>
                  {canEdit && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item, idx) => {
                  // Check if this is a new deed group (different registration_date + amount from previous)
                  const prev = idx > 0 ? sortedItems[idx - 1] : null;
                  const isNewGroup = prev && (
                    prev.registration_date !== item.registration_date ||
                    prev.registration_amount !== item.registration_amount ||
                    prev.status !== item.status
                  );

                  return (
                    <tr
                      key={item.id}
                      className={`${item.status !== 'active' ? 'opacity-50' : ''} ${isNewGroup ? 'border-t-2 border-border' : ''}`}
                    >
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
                          <span className="font-mono text-sm">{item.registration_amount ? formatCurrency(item.registration_amount) : '—'}</span>
                          {item.registration_date && (
                            <div className="text-xs text-foreground-muted">{formatDate(item.registration_date)}</div>
                          )}
                        </div>
                      </td>
                      <td className="font-mono text-sm">{item.kadastrale_grootte || '—'}</td>
                      <td><CollateralStatusBadge status={item.status} /></td>
                      {canEdit && (
                        <td className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setEditItem(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Guarantors */}
      <Card className={isMobile ? 'border-0 shadow-none bg-transparent' : ''}>
        <CardHeader className={isMobile ? 'px-0 pt-0 pb-3' : 'flex flex-row items-center justify-between'}>
          {!isMobile && (
            <div>
              <CardTitle>Guarantors</CardTitle>
            </div>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => { setEditGuarantor(undefined); setGuarantorDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Guarantor
            </Button>
          )}
        </CardHeader>
        <CardContent className={isMobile ? 'px-0' : ''}>
          {!guarantors || guarantors.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No guarantors registered
            </div>
          ) : isMobile ? (
            <div className="space-y-2">
              {guarantors.map(g => (
                <div
                  key={g.id}
                  className={`rounded-xl border bg-card px-4 py-3 ${g.status !== 'active' ? 'opacity-60' : ''}`}
                  onClick={() => canEdit && (() => { setEditGuarantor(g); setGuarantorDialogOpen(true); })()}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{g.guarantor_name}</span>
                    <CollateralStatusBadge status={g.status} />
                  </div>
                  {g.guarantee_cap && (
                    <p className="font-mono text-sm mt-1">{formatCurrency(g.guarantee_cap)}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Guarantor</th>
                  <th className="text-right">Cap</th>
                  <th>Status</th>
                  {canEdit && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {guarantors.map(g => (
                  <tr key={g.id} className={g.status !== 'active' ? 'opacity-50' : ''}>
                    <td className="font-medium">{g.guarantor_name}</td>
                    <td className="text-right font-mono text-sm">{g.guarantee_cap ? formatCurrency(g.guarantee_cap) : '—'}</td>
                    <td><CollateralStatusBadge status={g.status} /></td>
                    {canEdit && (
                      <td className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditGuarantor(g); setGuarantorDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {combinedGuaranteeCap != null && combinedGuaranteeCap > 0 && (
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <span className="ledger-label">Combined Guarantee Cap</span>
              <span className="font-mono font-semibold text-accent-amber">{formatCurrency(combinedGuaranteeCap)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddCollateralDialog open={addOpen} onOpenChange={setAddOpen} loanId={loanId} />
      {editItem && (
        <EditCollateralDialog
          open={!!editItem}
          onOpenChange={open => { if (!open) setEditItem(null); }}
          item={editItem}
          canDelete={isAdmin}
        />
      )}
      <AddGuarantorDialog
        open={guarantorDialogOpen}
        onOpenChange={setGuarantorDialogOpen}
        loanId={loanId}
        existing={editGuarantor}
        canDelete={isAdmin}
      />
    </div>
  );
}
