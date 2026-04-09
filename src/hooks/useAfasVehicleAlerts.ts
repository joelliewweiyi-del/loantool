import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AFAS_ACCOUNT_VEHICLE } from '@/lib/constants';
import type { Loan } from '@/types/loan';

export interface VehicleAlert {
  type: 'vehicle_transfer' | 'pipeline_activation';
  currentVehicle: string;
  detectedVehicle: string;
  firstTransactionDate: string;
  transactionCount: number;
}

interface AfasRow {
  EntryDate: string;
  AccountNo: number;
  DimAx1: string | null;
}

const DISMISSED_KEY = 'afas-vehicle-alerts-dismissed';

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function setDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

export function useAfasVehicleAlerts(loans: Loan[] | undefined) {
  const { data: afasRows, isLoading } = useQuery({
    queryKey: ['afas-vehicle-detect'],
    queryFn: async () => {
      // Query all journals (not just J50) to catch J90 memorial transfers
      const { data, error } = await supabase.functions.invoke('test-afas-draws', {
        body: {
          filterFieldIds: 'UnitId,AccountNo',
          filterValues: '5,1750..1752',
          operatorTypes: '1,15',
          take: 5000,
        },
      });
      if (error) throw error;
      return (data?.allData?.rows ?? []) as AfasRow[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!loans && loans.length > 0,
  });

  const alerts = useMemo(() => {
    const result = new Map<string, VehicleAlert>();
    if (!afasRows || !loans) return result;

    // Build a map: DimAx1 (loan_id string) → { accounts, minDate, count }
    const afasMap = new Map<string, { accounts: Set<string>; minDate: string; count: number }>();
    for (const row of afasRows) {
      if (!row.DimAx1) continue;
      const loanId = row.DimAx1.trim();
      const acct = String(row.AccountNo);
      if (!AFAS_ACCOUNT_VEHICLE[acct]) continue;

      const existing = afasMap.get(loanId);
      if (existing) {
        existing.accounts.add(acct);
        existing.count++;
        if (row.EntryDate < existing.minDate) existing.minDate = row.EntryDate;
      } else {
        afasMap.set(loanId, { accounts: new Set([acct]), minDate: row.EntryDate, count: 1 });
      }
    }

    const dismissed = getDismissed();

    // Build loan_id → loan lookup
    const loanByNumericId = new Map<string, Loan>();
    for (const loan of loans) {
      const numericId = (loan as any).loan_id;
      if (numericId) loanByNumericId.set(String(numericId), loan);
    }

    // Compare AFAS vehicle vs loan.vehicle
    for (const [dimAx1, info] of afasMap) {
      const loan = loanByNumericId.get(dimAx1);
      if (!loan) continue;
      if (dismissed.has(loan.id)) continue;

      // Derive AFAS vehicle from accounts
      const hasRedIV = info.accounts.has('1750') || info.accounts.has('1751');
      const hasTLF = info.accounts.has('1752');
      const afasVehicle = hasRedIV ? 'RED IV' : hasTLF ? 'TLF' : null;
      if (!afasVehicle) continue;

      const currentVehicle = (loan as any).vehicle as string;

      if (currentVehicle === 'Pipeline') {
        result.set(loan.id, {
          type: 'pipeline_activation',
          currentVehicle,
          detectedVehicle: afasVehicle,
          firstTransactionDate: info.minDate,
          transactionCount: info.count,
        });
      } else if (currentVehicle !== afasVehicle && !(loan as any).facility) {
        // Only suggest vehicle transfer if no facility is set (facility = explicit assignment)
        result.set(loan.id, {
          type: 'vehicle_transfer',
          currentVehicle,
          detectedVehicle: afasVehicle,
          firstTransactionDate: info.minDate,
          transactionCount: info.count,
        });
      }
    }

    return result;
  }, [afasRows, loans]);

  const dismiss = useCallback((loanId: string) => {
    const current = getDismissed();
    current.add(loanId);
    setDismissed(current);
  }, []);

  return { alerts, isLoading, dismiss };
}
