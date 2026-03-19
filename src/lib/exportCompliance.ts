import * as XLSX from 'xlsx';
import { CovenantType, CovenantStatus } from '@/types/loan';
import { effectiveDueDate } from '@/lib/covenantUtils';

const typeLabels: Record<CovenantType, string> = {
  valuation: 'Valuation',
  rent_roll: 'Rent Roll',
  annual_accounts: 'Annual Accounts',
  insurance: 'Insurance',
  kyc_check: 'KYC / AML',
  financial_covenant: 'Financial Covenant',
};

const statusLabels: Record<CovenantStatus, string> = {
  pending: 'Pending',
  reminder_sent: 'Reminder Sent',
  requested: 'Requested',
  received: 'Received',
  reviewed: 'Reviewed',
  not_applicable: 'N/A',
  breached: 'Breached',
  overdue: 'Overdue',
};

interface ExportLoan {
  id: string;
  loan_id: string;
  borrower_name: string;
  vehicle: string;
}

interface ExportCovenant {
  id: string;
  loan_id: string;
  covenant_type: CovenantType;
  tracking_year: number;
  frequency: string | null;
  threshold_value: number | null;
  threshold_operator: string | null;
  threshold_metric: string | null;
  notes: string | null;
}

interface ExportSubmission {
  id: string;
  covenant_id: string;
  loan_id: string;
  period_label: string;
  due_date: string | null;
  status: CovenantStatus;
  received_at: string | null;
  received_by: string | null;
  notes: string | null;
}

function isActionable(status: CovenantStatus) {
  return ['overdue', 'breached', 'requested', 'pending', 'reminder_sent'].includes(status);
}

function formatThreshold(cov: ExportCovenant): string {
  if (!cov.threshold_value || !cov.threshold_metric) return '';
  const op = cov.threshold_operator === 'lte' ? '≤' : '≥';
  switch (cov.threshold_metric) {
    case 'icr': return `ICR ${op} ${cov.threshold_value}`;
    case 'ltv': return `LTV ${op} ${(cov.threshold_value * 100).toFixed(0)}%`;
    case 'ebitda': return `EBITDA ${op} €${(cov.threshold_value / 1_000_000).toFixed(1)}m`;
    case 'min_rent': return `Rent ${op} €${(cov.threshold_value / 1_000_000).toFixed(1)}m`;
    default: return `${cov.threshold_metric} ${op} ${cov.threshold_value}`;
  }
}

export function exportComplianceExcel(
  loans: ExportLoan[],
  covenants: ExportCovenant[],
  submissions: ExportSubmission[],
  today: string,
  trackingYear: number,
) {
  const wb = XLSX.utils.book_new();

  // Enrich submissions with overdue detection + effective due dates
  const enrichedSubs = submissions.map(sub => {
    const due = effectiveDueDate(sub.due_date, sub.period_label);
    if ((sub.status === 'pending' || sub.status === 'requested') && due && due < today) {
      return { ...sub, due_date: due, status: 'overdue' as CovenantStatus };
    }
    if (!sub.due_date && due) {
      return { ...sub, due_date: due };
    }
    return sub;
  });

  const covMap = new Map(covenants.map(c => [c.id, c]));
  const loanMap = new Map(loans.map(l => [l.id, l]));

  // ── Sheet 1: Portfolio Overview ──
  const overviewRows: Record<string, any>[] = [];

  for (const loan of loans) {
    const loanCovs = covenants.filter(c => c.loan_id === loan.id);
    const loanSubs = enrichedSubs.filter(s => s.loan_id === loan.id);

    // Dedupe: one per covenant type (most urgent actionable)
    const byType = new Map<CovenantType, typeof enrichedSubs>();
    for (const sub of loanSubs) {
      const cov = covMap.get(sub.covenant_id);
      if (!cov) continue;
      const arr = byType.get(cov.covenant_type) ?? [];
      arr.push(sub);
      byType.set(cov.covenant_type, arr);
    }

    const deduped: (typeof enrichedSubs[0] & { covenant_type: CovenantType })[] = [];
    for (const [type, subs] of byType) {
      const actionable = subs
        .filter(s => isActionable(s.status))
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
      if (actionable.length > 0) {
        deduped.push({ ...actionable[0], covenant_type: type });
      } else {
        const completed = subs.filter(s => s.status === 'received' || s.status === 'reviewed');
        if (completed.length > 0) deduped.push({ ...completed[0], covenant_type: type });
        else if (subs.length > 0) deduped.push({ ...subs[0], covenant_type: type });
      }
    }

    const actionCount = deduped.filter(s => isActionable(s.status)).length;
    const overdueCount = deduped.filter(s => s.status === 'overdue' || s.status === 'breached').length;
    const nextDue = deduped
      .filter(s => isActionable(s.status) && s.due_date)
      .sort((a, b) => (a.due_date!).localeCompare(b.due_date!))[0];

    overviewRows.push({
      'Loan': loan.loan_id,
      'Vehicle': loan.vehicle,
      'Covenants': loanCovs.length,
      'Action Items': actionCount,
      'Overdue': overdueCount,
      'Next Due Date': nextDue?.due_date ?? '',
      'Next Due Type': nextDue ? typeLabels[nextDue.covenant_type] : '',
      'Status': nextDue ? statusLabels[nextDue.status] : (actionCount === 0 ? 'All Clear' : ''),
    });
  }

  // Sort: action items descending
  overviewRows.sort((a, b) => b['Action Items'] - a['Action Items']);

  const ws1 = XLSX.utils.json_to_sheet(overviewRows);
  // Set column widths
  ws1['!cols'] = [
    { wch: 8 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Portfolio Overview');

  // ── Sheet 2: Detailed Compliance ──
  const detailRows: Record<string, any>[] = [];

  for (const loan of loans) {
    const loanSubs = enrichedSubs.filter(s => s.loan_id === loan.id);

    // Group by covenant, pick next actionable per type
    const byCovenantId = new Map<string, typeof enrichedSubs>();
    for (const sub of loanSubs) {
      const arr = byCovenantId.get(sub.covenant_id) ?? [];
      arr.push(sub);
      byCovenantId.set(sub.covenant_id, arr);
    }

    for (const [covId, subs] of byCovenantId) {
      const cov = covMap.get(covId);
      if (!cov) continue;

      // Pick the next actionable or most recent completed
      const actionable = subs.filter(s => isActionable(s.status))
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
      const pick = actionable[0] ?? subs.filter(s => s.status === 'received' || s.status === 'reviewed')
        .sort((a, b) => (b.received_at ?? '').localeCompare(a.received_at ?? ''))[0]
        ?? subs[0];

      if (!pick) continue;

      detailRows.push({
        'Loan': loan.loan_id,
        'Vehicle': loan.vehicle,
        'Covenant Type': typeLabels[cov.covenant_type],
        'Year': cov.tracking_year,
        'Frequency': cov.frequency ?? '',
        'Period': pick.period_label,
        'Due Date': pick.due_date ?? '',
        'Status': statusLabels[pick.status],
        'Received': pick.received_at ?? '',
        'Threshold': formatThreshold(cov),
        'Notes': pick.notes ?? '',
      });
    }
  }

  // Sort by loan, then by status priority
  const statusOrder: Record<string, number> = {
    Breached: 0, Overdue: 1, Requested: 2, 'Reminder Sent': 3,
    Pending: 4, Received: 5, Reviewed: 6, 'N/A': 7,
  };
  detailRows.sort((a, b) => {
    const loanCmp = a['Loan'].localeCompare(b['Loan']);
    if (loanCmp !== 0) return loanCmp;
    return (statusOrder[a['Status']] ?? 9) - (statusOrder[b['Status']] ?? 9);
  });

  const ws2 = XLSX.utils.json_to_sheet(detailRows);
  ws2['!cols'] = [
    { wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 6 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
    { wch: 18 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Detailed Compliance');

  // ── Download ──
  const fileName = `RAX_Compliance_${trackingYear}_${today}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
