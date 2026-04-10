import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function eur(amount: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(amount);
}

function fmtDate(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const recipients: string[] = body.recipients || [
      'joel@raxfinance.nl',
      'thomas@raxfinance.nl',
      'martijn@raxfinance.nl',
      'yannick@raxfinance.nl',
      'nechemja@raxfinance.nl',
    ];
    const isTest = body.test === true;
    const today = body.date || new Date().toISOString().split('T')[0];
    const todayDate = new Date(today);

    // ── 1. Unpaid Interest — last month's cash-pay periods with no AFAS payment ──
    // Get loan metadata first (needed for filtering)
    const { data: allLoans } = await supabase
      .from('loans')
      .select('id, loan_id, borrower_name, vehicle, interest_type, payment_timing, maturity_date, amortization_amount, amortization_frequency, amortization_start_date, status, outstanding, interest_rate');

    const loanMap = new Map((allLoans || []).map((l: any) => [l.id, l]));
    const activeLoans = (allLoans || []).filter((l: any) => l.status === 'active');

    // Last month's date range
    const lastMonthEndDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0);
    const lastMonthStartDate = new Date(lastMonthEndDate.getFullYear(), lastMonthEndDate.getMonth(), 1);
    const prevMonthStartStr = lastMonthStartDate.toISOString().split('T')[0];
    const prevMonthEndStr = lastMonthEndDate.toISOString().split('T')[0];

    // Current month range (for in-advance loans)
    const curMonthStartStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-01`;
    const curMonthEndDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
    const curMonthEndStr = curMonthEndDate.toISOString().split('T')[0];

    // Fetch last month + current month periods
    const { data: lastMonthAllPeriods } = await supabase
      .from('periods')
      .select('id, loan_id, period_start, period_end, status, payment_date, payment_amount')
      .gte('period_start', prevMonthStartStr)
      .lte('period_end', curMonthEndStr)
      .order('period_end', { ascending: false });

    // Filter to cash-pay loans where payment hasn't been received
    // Include: last month's periods (all) + current month's periods (only in-advance loans)
    const unpaidPeriodsRaw = (lastMonthAllPeriods || []).filter((p: any) => {
      const loan = loanMap.get(p.loan_id);
      if (!loan || loan.interest_type === 'pik') return false;
      if (p.status === 'paid' || p.payment_date) return false;
      const isCurrentMonth = p.period_start >= curMonthStartStr;
      if (isCurrentMonth) {
        // Only include current month if loan pays in advance
        return loan.payment_timing === 'in_advance';
      }
      return true;
    });

    const prevMonthLabel = monthLabel(`${lastMonthEndDate.getFullYear()}-${String(lastMonthEndDate.getMonth() + 1).padStart(2, '0')}`);

    // Get expected interest from accrual_entries for unpaid periods
    const unpaidLoanIds = [...new Set(unpaidPeriodsRaw.map((p: any) => p.loan_id))];
    let accrualsByLoan = new Map<string, number>();
    if (unpaidLoanIds.length > 0) {
      const { data: accrualData } = await supabase
        .from('accrual_entries')
        .select('loan_id, daily_interest')
        .in('loan_id', unpaidLoanIds)
        .gte('date', prevMonthStartStr)
        .lte('date', prevMonthEndStr);

      for (const a of accrualData || []) {
        accrualsByLoan.set(a.loan_id, (accrualsByLoan.get(a.loan_id) ?? 0) + (a.daily_interest ?? 0));
      }
    }

    // Compute expected interest per period using 30E/360 convention
    const unpaidPeriods = unpaidPeriodsRaw.map((p: any) => {
      const loan = loanMap.get(p.loan_id);
      const accrualTotal = accrualsByLoan.get(p.loan_id);
      let expectedInterest = accrualTotal ?? 0;
      if (!accrualTotal && loan) {
        // 30E/360 day count
        const s = new Date(p.period_start);
        const e = new Date(p.period_end);
        let d1 = s.getUTCDate(), m1 = s.getUTCMonth() + 1, y1 = s.getUTCFullYear();
        let d2 = e.getUTCDate(), m2 = e.getUTCMonth() + 1, y2 = e.getUTCFullYear();
        if (d1 === 31) d1 = 30;
        if (d2 === 31) d2 = 30;
        const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1) + 1;
        const rate = loan.interest_rate ?? 0;
        expectedInterest = (loan.outstanding ?? 0) * rate * days / 360;
      }
      return { ...p, expectedInterest };
    });

    // ── 2. Recent Draws (last 30 days) ──
    const thirtyDaysAgo = new Date(todayDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: recentDraws } = await supabase
      .from('loan_events')
      .select('id, loan_id, event_type, effective_date, amount, status, metadata')
      .eq('event_type', 'principal_draw')
      .eq('status', 'approved')
      .gte('effective_date', thirtyDaysAgoStr)
      .order('effective_date', { ascending: false });

    // ── 3. Recent Repayments + New Loans (last 30 days) ──
    const { data: recentRepayments } = await supabase
      .from('loan_events')
      .select('id, loan_id, event_type, effective_date, amount, status, metadata')
      .eq('event_type', 'principal_repayment')
      .eq('status', 'approved')
      .gte('effective_date', thirtyDaysAgoStr)
      .order('effective_date', { ascending: false });

    const { data: newLoans } = await supabase
      .from('loans')
      .select('id, loan_id, borrower_name, vehicle, loan_start_date, outstanding, pipeline_stage')
      .gte('created_at', thirtyDaysAgoStr)
      .order('created_at', { ascending: false });

    // Split into actual new loans vs pipeline
    const actualNewLoans = (newLoans || []).filter((l: any) => !l.pipeline_stage && l.outstanding);
    const pipelineLoans = (newLoans || []).filter((l: any) => l.pipeline_stage || !l.outstanding);

    // ── 3a. Recently Repaid Loans (last 30 days) ──
    const { data: recentlyRepaid } = await supabase
      .from('loans')
      .select('id, loan_id, borrower_name, vehicle, repaid_at')
      .eq('status', 'repaid')
      .not('repaid_at', 'is', null)
      .gte('repaid_at', thirtyDaysAgoStr)
      .order('repaid_at', { ascending: false });

    // ── 3b. Fees Received (last 30 days) ──
    const { data: recentFees } = await supabase
      .from('loan_events')
      .select('id, loan_id, event_type, effective_date, amount, status, metadata')
      .eq('event_type', 'fee_invoice')
      .eq('status', 'approved')
      .gte('effective_date', thirtyDaysAgoStr)
      .order('effective_date', { ascending: false });

    // ── 4. Upcoming Amortization (next 90 days) ──
    const amortLoans = activeLoans.filter((l: any) =>
      l.amortization_amount && l.amortization_frequency && l.amortization_start_date
    );

    interface AmortDue { loan_id: string; borrower: string; amount: number; dueDate: string; frequency: string }
    const upcomingAmort: AmortDue[] = [];

    for (const loan of amortLoans) {
      const monthStep = loan.amortization_frequency === 'monthly' ? 1
        : loan.amortization_frequency === 'quarterly' ? 3
        : loan.amortization_frequency === 'semi_annual' ? 6 : 12;

      const start = new Date(loan.amortization_start_date);
      const end90 = new Date(todayDate);
      end90.setDate(end90.getDate() + 90);

      const dueDate = new Date(start);
      for (let i = 0; i < 600; i++) {
        if (dueDate > end90) break;
        if (dueDate >= todayDate) {
          upcomingAmort.push({
            loan_id: loan.loan_id,
            borrower: loan.borrower_name,
            amount: loan.amortization_amount,
            dueDate: dueDate.toISOString().split('T')[0],
            frequency: loan.amortization_frequency,
          });
        }
        dueDate.setMonth(dueDate.getMonth() + monthStep);
      }
    }
    upcomingAmort.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    // ── 5. Rentenota Readiness (periods ending last month) ──
    const lastMonthEnd = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0);
    const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
    const lmStartStr = lastMonthStart.toISOString().split('T')[0];
    const lmEndStr = lastMonthEnd.toISOString().split('T')[0];

    const { data: lastMonthPeriods } = await supabase
      .from('periods')
      .select('id, loan_id, period_start, period_end, status')
      .gte('period_start', lmStartStr)
      .lte('period_end', lmEndStr)
      .order('status');

    const noticeReady: Array<{ loan_id: string; borrower: string; status: string; ready: boolean }> = [];
    for (const p of lastMonthPeriods || []) {
      const loan = loanMap.get(p.loan_id);
      if (!loan) continue;
      const ready = ['approved', 'sent', 'paid'].includes(p.status);
      noticeReady.push({
        loan_id: loan.loan_id,
        borrower: loan.borrower_name,
        status: p.status,
        ready,
      });
    }
    noticeReady.sort((a, b) => (a.ready === b.ready ? 0 : a.ready ? 1 : -1));

    // ── 6. Recent Activity (last 48 hours) ──
    const twoDaysAgo = new Date(todayDate);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: recentActivity } = await supabase
      .from('loan_activity_log')
      .select('id, loan_id, activity_type, title, created_at, created_by_name')
      .gte('created_at', twoDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    // ── 7. Maturity Watch (next 90 days) ──
    const end90 = new Date(todayDate);
    end90.setDate(end90.getDate() + 90);
    const end90Str = end90.toISOString().split('T')[0];

    const maturing = activeLoans
      .filter((l: any) => l.maturity_date && l.maturity_date <= end90Str && l.maturity_date >= today)
      .sort((a: any, b: any) => a.maturity_date.localeCompare(b.maturity_date));

    // ── Build HTML ──
    const sections: string[] = [];

    const sectionHeader = (title: string, count: number) =>
      `<h3 style="color: #003B5C; border-bottom: 2px solid #003B5C; padding-bottom: 6px; margin-top: 28px; margin-bottom: 12px;">${title} <span style="color: #999; font-weight: normal; font-size: 13px;">(${count})</span></h3>`;

    const tableStart = (cols: string[]) =>
      `<table style="width: 100%; border-collapse: collapse; font-size: 13px;"><thead><tr style="background: #f5f4f0;">${cols.map(c => `<th style="text-align: left; padding: 6px 8px;">${c}</th>`).join('')}</tr></thead><tbody>`;

    const tableEnd = '</tbody></table>';

    const row = (cells: string[], idx: number) => {
      const bg = idx % 2 === 1 ? ' background: #fafaf7;' : '';
      return `<tr style="border-bottom: 1px solid #eee;${bg}">${cells.map(c => `<td style="padding: 6px 8px;">${c}</td>`).join('')}</tr>`;
    };

    const mono = (s: string) => `<span style="font-family: IBM Plex Mono, monospace;">${s}</span>`;
    const bold = (s: string) => `<span style="font-weight: 600;">${s}</span>`;
    const muted = (s: string) => `<span style="color: #999;">${s}</span>`;
    const amber = (s: string) => `<span style="color: #c8850a; font-weight: 600;">${s}</span>`;
    const sage = (s: string) => `<span style="color: #2d8a5e; font-weight: 600;">${s}</span>`;

    // 1. Unpaid Interest — last month's cash periods with no bank payment
    const unpaidCount = unpaidPeriods.length;
    const paidCount = (lastMonthAllPeriods || []).filter((p: any) => {
      const loan = loanMap.get(p.loan_id);
      return loan && loan.interest_type !== 'pik' && (p.status === 'paid' || p.payment_date);
    }).length;
    const totalCashPeriods = paidCount + unpaidCount;

    const totalUnpaidInterest = unpaidPeriods.reduce((s: number, p: any) => s + (p.expectedInterest ?? 0), 0);
    const hasInAdvance = unpaidPeriods.some((p: any) => p.period_start >= curMonthStartStr);
    const unpaidTitle = hasInAdvance
      ? `Unpaid Interest — ${prevMonthLabel} + In-Advance`
      : `Unpaid Interest — ${prevMonthLabel}`;
    sections.push(sectionHeader(unpaidTitle, unpaidCount));
    if (unpaidCount > 0) {
      sections.push(`<p style="font-size: 13px; color: #666; margin-top: -8px; margin-bottom: 12px;">${sage(String(paidCount))} of ${totalCashPeriods} received; ${amber(String(unpaidCount))} pending — total outstanding ${amber(eur(totalUnpaidInterest))}</p>`);
      sections.push(tableStart(['Loan', 'Expected Interest', 'Status']));
      unpaidPeriods.forEach((p: any, idx: number) => {
        const loan = loanMap.get(p.loan_id);
        if (!loan) return;
        const statusLabel = p.status === 'sent' ? amber('Sent — no payment')
          : p.status === 'approved' ? amber('Approved — no payment')
          : amber('Open — no payment');
        sections.push(row([
          `${bold('#' + loan.loan_id)} ${muted(loan.borrower_name)}`,
          mono(eur(p.expectedInterest)),
          statusLabel,
        ], idx));
      });
      sections.push(tableEnd);
    } else {
      sections.push(`<p style="font-size: 13px; color: #2d8a5e;">All ${totalCashPeriods} cash interest payments for ${prevMonthLabel} received.</p>`);
    }

    // 2. Recent Draws (grouped by loan)
    const drawsFiltered = (recentDraws || []).filter((e: any) => {
      const meta = e.metadata as Record<string, unknown> | null;
      return !meta?.founding_event && !meta?.auto_generated;
    });

    const drawsByLoan = new Map<string, { loan: any; total: number; count: number; latestDate: string }>();
    for (const e of drawsFiltered) {
      const loan = loanMap.get(e.loan_id);
      const key = e.loan_id;
      const existing = drawsByLoan.get(key);
      if (existing) {
        existing.total += e.amount ?? 0;
        existing.count += 1;
        if (e.effective_date > existing.latestDate) existing.latestDate = e.effective_date;
      } else {
        drawsByLoan.set(key, { loan, total: e.amount ?? 0, count: 1, latestDate: e.effective_date });
      }
    }
    const groupedDraws = [...drawsByLoan.values()].sort((a, b) => b.latestDate.localeCompare(a.latestDate));

    if (groupedDraws.length > 0) {
      sections.push(sectionHeader('Draws (Last 30 Days)', groupedDraws.length));
      sections.push(tableStart(['Loan', 'Date', 'Amount']));
      groupedDraws.forEach((g, idx) => {
        const countLabel = g.count > 1 ? muted(` (${g.count} draws)`) : '';
        sections.push(row([
          `${bold('#' + (g.loan?.loan_id || '?'))} ${muted(g.loan?.borrower_name || '')}${countLabel}`,
          mono(fmtDate(g.latestDate)),
          mono(eur(g.total)),
        ], idx));
      });
      sections.push(tableEnd);
    }

    // 3. Repayments + New Loans (group repayments by loan)
    const repaymentsFiltered = (recentRepayments || []).filter((e: any) => {
      const meta = e.metadata as Record<string, unknown> | null;
      return meta?.adjustment_type !== 'fee_split';
    });

    // Group repayments by loan_id
    const repaymentsByLoan = new Map<string, { loan: any; total: number; count: number; latestDate: string }>();
    for (const e of repaymentsFiltered) {
      const loan = loanMap.get(e.loan_id);
      const key = e.loan_id;
      const existing = repaymentsByLoan.get(key);
      if (existing) {
        existing.total += e.amount ?? 0;
        existing.count += 1;
        if (e.effective_date > existing.latestDate) existing.latestDate = e.effective_date;
      } else {
        repaymentsByLoan.set(key, { loan, total: e.amount ?? 0, count: 1, latestDate: e.effective_date });
      }
    }
    const groupedRepayments = [...repaymentsByLoan.values()].sort((a, b) => b.latestDate.localeCompare(a.latestDate));

    if (groupedRepayments.length > 0 || (newLoans || []).length > 0) {
      const total = groupedRepayments.length + (newLoans || []).length;
      sections.push(sectionHeader('Repayments & New Loans (Last 30 Days)', total));

      if (groupedRepayments.length > 0) {
        sections.push(tableStart(['Loan', 'Date', 'Repayment Amount']));
        groupedRepayments.forEach((g, idx) => {
          const countLabel = g.count > 1 ? muted(` (${g.count} payments)`) : '';
          sections.push(row([
            `${bold('#' + (g.loan?.loan_id || '?'))} ${muted(g.loan?.borrower_name || '')}${countLabel}`,
            mono(fmtDate(g.latestDate)),
            mono(eur(g.total)),
          ], idx));
        });
        sections.push(tableEnd);
      }

      if (actualNewLoans.length > 0) {
        sections.push(`<p style="font-size: 13px; margin-top: 12px; font-weight: 600; color: #003B5C;">New Loans</p>`);
        sections.push(tableStart(['Loan', 'Start Date', 'Outstanding']));
        actualNewLoans.forEach((l: any, idx: number) => {
          sections.push(row([
            `${bold('#' + l.loan_id)} ${muted(l.borrower_name)}`,
            mono(fmtDate(l.loan_start_date)),
            mono(eur(l.outstanding)),
          ], idx));
        });
        sections.push(tableEnd);
      }
    }

    // Pipeline loans (prospect, signed, etc.)
    if (pipelineLoans.length > 0) {
      sections.push(sectionHeader('Pipeline (Last 30 Days)', pipelineLoans.length));
      sections.push(tableStart(['Loan', 'Stage', 'Start Date']));
      pipelineLoans.forEach((l: any, idx: number) => {
        const stage = (l.pipeline_stage || 'new').replace(/_/g, ' ');
        sections.push(row([
          `${bold('#' + l.loan_id)} ${muted(l.borrower_name)}`,
          stage,
          l.loan_start_date ? mono(fmtDate(l.loan_start_date)) : muted('\u2014'),
        ], idx));
      });
      sections.push(tableEnd);
    }

    // 3a. Recently Repaid Loans
    if ((recentlyRepaid || []).length > 0) {
      sections.push(sectionHeader('Loans Fully Repaid (Last 30 Days)', recentlyRepaid!.length));
      sections.push(tableStart(['Loan', 'Repaid Date', 'Vehicle']));
      (recentlyRepaid || []).forEach((l: any, idx: number) => {
        sections.push(row([
          `${bold('#' + l.loan_id)} ${muted(l.borrower_name)}`,
          mono(fmtDate(l.repaid_at)),
          l.vehicle || '—',
        ], idx));
      });
      sections.push(tableEnd);
    }

    // 3b. Fees (last 30 days)
    const feesFiltered = (recentFees || []).filter((e: any) => {
      const meta = e.metadata as Record<string, unknown> | null;
      return !meta?.correction;
    });
    if (feesFiltered.length > 0) {
      const totalFees = feesFiltered.reduce((s: number, e: any) => s + (e.amount ?? 0), 0);
      sections.push(sectionHeader('Fees Received (Last 30 Days)', feesFiltered.length));
      sections.push(`<p style="font-size: 13px; color: #666; margin-top: -8px; margin-bottom: 12px;">Total: ${bold(eur(totalFees))}</p>`);
      sections.push(tableStart(['Loan', 'Date', 'Amount', 'Fee Type']));
      feesFiltered.forEach((e: any, idx: number) => {
        const loan = loanMap.get(e.loan_id);
        const meta = e.metadata as Record<string, unknown> | null;
        const feeType = (meta?.fee_type as string || 'fee').replace(/_/g, ' ');
        const paymentType = meta?.payment_type === 'pik' ? muted(' (PIK)') : '';
        sections.push(row([
          `${bold('#' + (loan?.loan_id || '?'))} ${muted(loan?.borrower_name || '')}`,
          mono(fmtDate(e.effective_date)),
          mono(eur(e.amount)),
          `${feeType}${paymentType}`,
        ], idx));
      });
      sections.push(tableEnd);
    }

    // 4. Upcoming Amortization
    if (upcomingAmort.length > 0) {
      sections.push(sectionHeader('Upcoming Amortization (Next 90 Days)', upcomingAmort.length));
      sections.push(tableStart(['Loan', 'Due Date', 'Amount', 'Frequency']));
      upcomingAmort.forEach((a, idx) => {
        const daysUntil = Math.ceil((new Date(a.dueDate).getTime() - todayDate.getTime()) / 86400000);
        const urgency = daysUntil <= 7 ? amber(`${daysUntil}d`) : muted(`${daysUntil}d`);
        sections.push(row([
          `${bold('#' + a.loan_id)} ${muted(a.borrower)}`,
          `${mono(fmtDate(a.dueDate))} ${urgency}`,
          mono(eur(a.amount)),
          a.frequency,
        ], idx));
      });
      sections.push(tableEnd);
    }

    // 5. Rentenota Readiness
    if (noticeReady.length > 0) {
      const readyCount = noticeReady.filter(n => n.ready).length;
      const lastMonth = monthLabel(`${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}`);
      sections.push(sectionHeader(`Rentenota Readiness — ${lastMonth}`, noticeReady.length));
      sections.push(`<p style="font-size: 13px; color: #666; margin-top: -8px; margin-bottom: 12px;">${sage(String(readyCount))} of ${noticeReady.length} ready to send</p>`);
      sections.push(tableStart(['Loan', 'Status', 'Ready']));
      noticeReady.forEach((n, idx) => {
        const statusDisplay = n.ready ? sage(n.status) : amber(n.status);
        const readyIcon = n.ready ? '✓' : '✗';
        const readyColor = n.ready ? 'color: #2d8a5e;' : 'color: #c8850a;';
        sections.push(row([
          `${bold('#' + n.loan_id)} ${muted(n.borrower)}`,
          statusDisplay,
          `<span style="${readyColor} font-weight: 600;">${readyIcon}</span>`,
        ], idx));
      });
      sections.push(tableEnd);
    }

    // 6. Recent Activity
    if ((recentActivity || []).length > 0) {
      sections.push(sectionHeader('Activity Log (Last 48h)', recentActivity!.length));
      sections.push(tableStart(['Loan', 'Type', 'Title', 'By']));
      (recentActivity || []).forEach((a: any, idx: number) => {
        const loan = loanMap.get(a.loan_id);
        const typeLabel = (a.activity_type || '').replace(/_/g, ' ');
        sections.push(row([
          loan ? `${bold('#' + loan.loan_id)} ${muted(loan.borrower_name)}` : muted('—'),
          typeLabel,
          a.title || '—',
          muted(a.created_by_name || '—'),
        ], idx));
      });
      sections.push(tableEnd);
    } else {
      sections.push(sectionHeader('Activity Log (Last 48h)', 0));
      sections.push(`<p style="font-size: 13px; color: #999;">No new activity.</p>`);
    }

    // 7. Maturity Watch
    if (maturing.length > 0) {
      sections.push(sectionHeader('Maturity Watch (Next 90 Days)', maturing.length));
      sections.push(tableStart(['Loan', 'Maturity Date', 'Days Left', 'Outstanding']));
      maturing.forEach((l: any, idx: number) => {
        const daysLeft = Math.ceil((new Date(l.maturity_date).getTime() - todayDate.getTime()) / 86400000);
        const urgency = daysLeft <= 30 ? `<span style="color: #c43e3e; font-weight: 600;">${daysLeft}d</span>` :
                        daysLeft <= 60 ? amber(`${daysLeft}d`) : muted(`${daysLeft}d`);
        sections.push(row([
          `${bold('#' + l.loan_id)} ${muted(l.borrower_name)}`,
          mono(fmtDate(l.maturity_date)),
          urgency,
          mono(eur(l.outstanding)),
        ], idx));
      });
      sections.push(tableEnd);
    } else {
      sections.push(sectionHeader('Maturity Watch (Next 90 Days)', 0));
      sections.push(`<p style="font-size: 13px; color: #2d8a5e;">No loans maturing in the next 90 days.</p>`);
    }

    // ── Assemble email ──
    const testBanner = isTest ? `<p style="background: #fff3cd; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #856404; margin-bottom: 16px;">⚠ TEST — This is a test of the daily digest.</p>` : '';

    const html = `
      <div style="font-family: 'IBM Plex Sans', -apple-system, sans-serif; max-width: 700px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #003B5C; margin-bottom: 4px;">Daily Portfolio Digest</h2>
        <p style="color: #666; font-size: 13px; margin-top: 0;">${fmtDate(today)} — RAX Loan Tool</p>
        ${testBanner}

        ${sections.join('\n')}

        <p style="margin-top: 24px;">
          <a href="https://rax-lms.vercel.app/loans"
             style="display: inline-block; padding: 12px 24px; background: #003B5C; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Open RAX Loan Tool
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Automated daily digest from RAX Loan Tool.</p>
      </div>
    `;

    const senderDomain = Deno.env.get('RESEND_SENDER_DOMAIN') || 'onboarding@resend.dev';
    const fromAddress = senderDomain.includes('@') ? `RAX Loan Tool <${senderDomain}>` : `RAX Loan Tool <noreply@${senderDomain}>`;

    const subjectPrefix = isTest ? '[TEST] ' : '';
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject: `${subjectPrefix}[RAX Loan Tool] Daily Portfolio Digest — ${fmtDate(today)}`,
        html,
      }),
    });

    const emailResult = await emailRes.json();

    if (!emailRes.ok) {
      console.error('Resend error:', emailResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: recipients,
        resend_id: emailResult.id,
        sections: {
          unpaid_periods: unpaidCount,
          draws: drawsFiltered.length,
          repayments: repaymentsFiltered.length,
          recently_repaid: (recentlyRepaid || []).length,
          new_loans: (newLoans || []).length,
          upcoming_amortization: upcomingAmort.length,
          notice_readiness: noticeReady.length,
          recent_activity: (recentActivity || []).length,
          maturing: maturing.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Daily digest error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
