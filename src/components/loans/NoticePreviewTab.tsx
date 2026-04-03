import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatAmountBare, formatDate, formatPercent, formatEventType } from '@/lib/format';
import { PeriodAccrual, AccrualsSummary } from '@/lib/loanCalculations';
import { Loan, LoanEvent, PeriodStatus } from '@/types/loan';
import { PeriodPipeline } from './PeriodPipeline';
import { ChevronRight, AlertTriangle, Download, Printer, Loader2 } from 'lucide-react';
import raxLogo from '@/assets/rax-logo.png';
import { useAppConfig } from '@/hooks/useAppConfig';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/** Single source of truth for the RAX navy hex — needed in inline styles for html2canvas compatibility */
const RAX_NAVY = '#003B5C';

/** Create a white version of the logo for dark backgrounds (html2canvas doesn't support CSS filters) */
function useWhiteLogo(src: string) {
  const [whiteLogo, setWhiteLogo] = useState<string>(src);
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      setWhiteLogo(c.toDataURL('image/png'));
    };
    img.src = src;
  }, [src]);
  return whiteLogo;
}

interface NoticePreviewTabProps {
  loan: Loan;
  periodAccruals: PeriodAccrual[];
  summary: AccrualsSummary;
  isLoading: boolean;
  events?: LoanEvent[];
}

export function NoticePreviewTab({ loan, periodAccruals, summary, isLoading, events = [] }: NoticePreviewTabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodAccrual | null>(
    periodAccruals.length > 0 ? periodAccruals[periodAccruals.length - 1] : null
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const { data: bankConfig } = useAppConfig(['bank_iban']);
  const bankIncomplete = !bankConfig?.bank_iban;
  const whiteLogo = useWhiteLogo(raxLogo);

  const generatePdf = useCallback(async () => {
    if (!noticeRef.current || !selectedPeriod) return;
    setIsGeneratingPdf(true);
    try {
      const pages = noticeRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pdfWidth - margin * 2;

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        // If the page content exceeds A4 height, scale it to fit
        if (imgHeight > pdfHeight - margin * 2) {
          const fitScale = (pdfHeight - margin * 2) / imgHeight;
          const fitWidth = contentWidth * fitScale;
          const fitHeight = imgHeight * fitScale;
          const xOffset = margin + (contentWidth - fitWidth) / 2;
          pdf.addImage(imgData, 'JPEG', xOffset, margin, fitWidth, fitHeight);
        } else {
          pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, imgHeight);
        }
      }

      const loanId = (loan as any).loan_id || loan.id;
      const periodMonth = String(new Date(selectedPeriod.periodEnd).getMonth() + 1).padStart(2, '0');
      const year = new Date(selectedPeriod.periodEnd).getFullYear();
      pdf.save(`RAX Finance Interest Notice - ${loanId} - P${periodMonth} ${year}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [selectedPeriod, loan]);

  const handlePrint = useCallback(() => {
    if (!noticeRef.current) return;
    window.print();
  }, []);

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-muted rounded-lg" />;
  }

  // Sort periods oldest to newest
  const sortedPeriods = [...periodAccruals].sort(
    (a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
  );

  // Get events for selected period
  const periodEvents = selectedPeriod 
    ? events.filter(e => {
        const eventDate = new Date(e.effective_date);
        const start = new Date(selectedPeriod.periodStart);
        const end = new Date(selectedPeriod.periodEnd);
        return eventDate >= start && eventDate <= end && e.status === 'approved';
      })
    : [];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Period List Sidebar */}
      <div className="col-span-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Interest Periods</CardTitle>
            <CardDescription>Select a period to preview notice</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {sortedPeriods.map((period) => (
                <button
                  key={period.periodId}
                  onClick={() => setSelectedPeriod(period)}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between ${
                    selectedPeriod?.periodId === period.periodId ? 'bg-muted' : ''
                  }`}
                >
                  <div>
                    <div className="text-sm">
                      {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <NoticeStatusBadge status={period.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(period.interestAccrued + period.commitmentFeeAccrued)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workflow Pipeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notice Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPeriod ? (
              <PeriodPipeline
                current={selectedPeriod.status as PeriodStatus}
                variant="vertical"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Select a period</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notice Preview */}
      <div className="col-span-8">
        {selectedPeriod ? (
          <Card className="overflow-hidden">
            {/* Notice Header Actions */}
            <div className="bg-muted/50 border-b px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Interest Notice Preview</span>
                <NoticeStatusBadge status={selectedPeriod.status} />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-1" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={generatePdf} disabled={isGeneratingPdf}>
                  {isGeneratingPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                </Button>
                {selectedPeriod.status === 'approved' && (
                  <Button size="sm">
                    Send to Borrower
                  </Button>
                )}
              </div>
            </div>

            {/* Notice Document */}
            <CardContent className="p-8 bg-white dark:bg-background">
              <div ref={noticeRef}>
              <NoticeDocument
                loan={loan}
                period={selectedPeriod}
                summary={summary}
                events={periodEvents}
                bankConfig={bankConfig}
                bankIncomplete={bankIncomplete}
                whiteLogo={whiteLogo}
              />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground py-12">
              <p>Select a period to preview its interest notice</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

interface NoticeDocumentProps {
  loan: Loan;
  period: PeriodAccrual;
  summary: AccrualsSummary;
  events: LoanEvent[];
  bankConfig?: Record<string, string>;
  bankIncomplete: boolean;
  whiteLogo: string;
}

function NoticeDocument({ loan, period, summary, events, bankConfig, bankIncomplete, whiteLogo }: NoticeDocumentProps) {
  const endDate = new Date(period.periodEnd);
  const startDate = new Date(period.periodStart);
  const isInAdvance = loan.payment_timing === 'in_advance';
  // In advance: due at start of period. In arrears: due first of next month.
  const paymentDueDate = isInAdvance
    ? new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    : new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);

  // CRITICAL: Use period accrual totals (derived from event ledger) for consistency
  const totalDraws = period.principalDrawn;
  const totalRepayments = period.principalRepaid;
  const totalFees = period.feesInvoiced;
  const interestCharge = period.interestAccrued + period.commitmentFeeAccrued;
  const isPik = loan.interest_type === 'pik';
  const netPrincipalChange = period.closingPrincipal - period.openingPrincipal;

  const loanId = (loan as any).loan_id || loan.id;
  const invoiceRef = `INT-${loanId}-${period.periodEnd}`;
  const periodMonth = String(new Date(period.periodEnd).getMonth() + 1).padStart(2, '0');
  const periodYear = new Date(period.periodEnd).getFullYear();
  const paymentRef = `${loanId}_P${periodMonth}_${periodYear}`;

  return (
    <div className="text-[13px] leading-relaxed text-foreground" style={{ fontFamily: "'Barlow', sans-serif" }}>

      {/* ═══════════════════════════════════════════════════════════
          PAGE 1 — FORMAL LETTER (ING-style)
          ═══════════════════════════════════════════════════════════ */}
      <div data-pdf-page="1" className="max-w-[640px] mx-auto">

        {/* ── Header bar ── */}
        <div className="flex justify-between items-center px-5 py-4" style={{ backgroundColor: RAX_NAVY }}>
          <img src={whiteLogo} alt="RAX Finance" className="h-8" />
          <div className="text-right text-[11px] leading-[1.5] text-white/70">
            <p className="font-semibold text-white">RAX Finance B.V.</p>
            <p>J.J. Viottastraat 29, 1071 JP Amsterdam</p>
            <p>The Netherlands</p>
          </div>
        </div>

        {/* ── Letter body with consistent px-5 inner padding ── */}
        <div className="px-5 pt-6 pb-8 space-y-5">

          {/* Recipient */}
          <p className="font-semibold leading-tight">{loan.borrower_name}</p>

          {/* Metadata row: Date | Phone */}
          <div className="flex">
            <div className="w-[140px]">
              <p className="font-semibold text-foreground mb-0.5">Date</p>
              <p>{formatDate(period.periodEnd)}</p>
            </div>
            <div className="w-[140px]">
              <p className="font-semibold text-foreground mb-0.5">Phone</p>
              <p>+31 (0)20 575 46 45</p>
            </div>
          </div>

          {/* Subject block */}
          <div>
            <p><span className="font-semibold">Reference:</span> {paymentRef}</p>
            <p>{loan.borrower_name}</p>
            <p>Loan number: {loanId}</p>
          </div>

          {/* Salutation + body */}
          <div>
            <p className="mb-2">Dear Sir / Madam,</p>
            <p>
              We hereby provide you with a statement of the outstanding amounts for the current period
              regarding the above-mentioned loan.
            </p>
          </div>

          {/* ── Charges block ── */}
          <div>
            {/* Interest lines */}
            <div className="mb-1">
              {period.interestSegments.map((segment, idx) => (
                <p key={idx}>
                  Interest {formatPercent(segment.rate)}, {segment.days} day(s) ({formatDate(segment.startDate)} – {formatDate(segment.endDate)})
                </p>
              ))}
              <div className="flex justify-between items-baseline">
                <span>over EUR {formatAmountBare(period.openingPrincipal)} (30/360)</span>
                <span className="tabular-nums text-right">EUR{'\u00A0\u00A0\u00A0\u00A0'}{formatAmountBare(period.interestAccrued)}</span>
              </div>
            </div>

            {/* Commitment fee */}
            {period.commitmentFeeAccrued > 0 && (
              <div className="mb-1">
                {period.commitmentFeeSegments.map((segment, idx) => (
                  <p key={idx}>
                    Commitment fee {formatPercent(segment.feeRate)}, {segment.days} day(s)
                  </p>
                ))}
                <div className="flex justify-between items-baseline">
                  <span>over EUR {formatAmountBare(period.commitmentFeeSegments[0]?.undrawn || 0)} undrawn (30/360)</span>
                  <span className="tabular-nums text-right">EUR{'\u00A0\u00A0\u00A0\u00A0'}{formatAmountBare(period.commitmentFeeAccrued)}</span>
                </div>
              </div>
            )}

            {/* Fees invoiced */}
            {period.feesInvoiced > 0 && (
              <div className="mb-1">
                <div className="flex justify-between items-baseline">
                  <span>Fees invoiced</span>
                  <span className="tabular-nums text-right">EUR{'\u00A0\u00A0\u00A0\u00A0'}{formatAmountBare(period.feesInvoiced)}</span>
                </div>
              </div>
            )}

            {/* Scheduled amortization */}
            {period.amortizationDue > 0 && (
              <div className="mb-1">
                <div className="flex justify-between items-baseline">
                  <span>Scheduled repayment</span>
                  <span className="tabular-nums text-right">EUR{'\u00A0\u00A0\u00A0\u00A0'}{formatAmountBare(period.amortizationDue)}</span>
                </div>
              </div>
            )}

            {/* Total amount due */}
            <div className="flex justify-between items-baseline mt-3 py-2.5 px-3 -mx-3" style={{ backgroundColor: `${RAX_NAVY}0D` }}>
              <span className="font-semibold">{isPik ? 'Total interest capitalised' : 'Total amount due'}</span>
              <span className="tabular-nums text-right font-semibold">EUR{'\u00A0\u00A0\u00A0\u00A0'}{formatAmountBare(period.totalDue)}</span>
            </div>
          </div>

          {/* ── Payment instructions (cash-pay) ── */}
          {!isPik && (
            <div>
              {bankIncomplete && (
                <div className="flex items-start gap-2 text-xs text-foreground-secondary border border-border rounded-sm px-3 py-2 mb-3 print:hidden">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>Bank details not configured. Update bank_iban in app_config before sending.</span>
                </div>
              )}

              <p className="mb-3">
                On {formatDate(paymentDueDate.toISOString())}, the amount due will be debited from your
                account via automatic direct debit:
              </p>

              <table className="border-collapse w-auto" style={{ border: `1px solid ${RAX_NAVY}20` }}>
                <tbody>
                  <tr>
                    <td className="pr-8 py-1.5 pl-2 text-foreground-secondary" style={{ borderBottom: `1px solid ${RAX_NAVY}15` }}>Account:</td>
                    <td className="py-1.5 pr-2" style={{ borderBottom: `1px solid ${RAX_NAVY}15` }}>RAX RED IV B.V.</td>
                  </tr>
                  <tr>
                    <td className="pr-8 py-1.5 pl-2 text-foreground-secondary" style={{ borderBottom: `1px solid ${RAX_NAVY}15` }}>IBAN:</td>
                    <td className="py-1.5 pr-2 tabular-nums" style={{ borderBottom: `1px solid ${RAX_NAVY}15` }}>{bankConfig?.bank_iban || 'NL81 INGB 0112 3138 92'}</td>
                  </tr>
                  <tr>
                    <td className="pr-8 py-1.5 pl-2 text-foreground-secondary">Reference:</td>
                    <td className="py-1.5 pr-2 tabular-nums">{paymentRef}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}


          {/* Closing */}
          <div>
            <p className="mb-2">Kind regards,</p>
            <p className="font-semibold">Martijn Louwerse</p>
          </div>
        </div>

        {/* ── Page 1 footer ── */}
        <div className="mt-auto text-[11px] text-white/70 px-5 py-2 text-center" style={{ backgroundColor: RAX_NAVY }}>
          <p>RAX Finance B.V. — J.J. Viottastraat 29, 1071 JP Amsterdam, The Netherlands</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          PAGE BREAK — visual separator for on-screen preview
          ═══════════════════════════════════════════════════════════ */}
      <div className="my-10 flex items-center gap-3 print:hidden">
        <div className="flex-1 border-t border-dashed border-foreground/15" />
        <span className="text-[11px] text-foreground-muted tracking-widest uppercase">Page 2 — Calculation Detail</span>
        <div className="flex-1 border-t border-dashed border-foreground/15" />
      </div>
      <div data-pdf-page="2" className="max-w-[640px] mx-auto break-before-page" style={{ pageBreakBefore: 'always' }}>

          {/* ── Page 2 header bar ── */}
          <div className="flex justify-between items-center px-5 py-4" style={{ backgroundColor: RAX_NAVY }}>
            <img src={whiteLogo} alt="RAX Finance" className="h-8" />
            <div className="text-right text-[11px] text-white/70">
              <p className="font-medium text-white">Calculation Detail</p>
              <p className="tabular-nums">{loan.borrower_name} — {loanId}</p>
              <p className="tabular-nums">{formatDate(period.periodStart)} – {formatDate(period.periodEnd)}</p>
            </div>
          </div>

          {/* ── Page 2 body ── */}
          <div className="px-5 pt-5 pb-8 space-y-5">

          {/* ── Principal Summary ── */}
          <div>
            <p className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3 pl-2" style={{ borderLeft: `3px solid ${RAX_NAVY}`, color: RAX_NAVY }}>
              Principal Summary
            </p>
            <table className="w-full text-[11px]">
              <tbody>
                <tr>
                  <td className="py-1 text-foreground-secondary">Opening balance</td>
                  <td className="py-1 text-right tabular-nums">{formatCurrency(period.openingPrincipal)}</td>
                </tr>
                {totalDraws > 0 && (
                  <tr>
                    <td className="py-1 text-foreground-tertiary pl-4">Drawdowns</td>
                    <td className="py-1 text-right tabular-nums text-foreground-secondary">+{formatCurrency(totalDraws)}</td>
                  </tr>
                )}
                {totalRepayments > 0 && (
                  <tr>
                    <td className="py-1 text-foreground-tertiary pl-4">Repayments</td>
                    <td className="py-1 text-right tabular-nums text-foreground-secondary">–{formatCurrency(totalRepayments)}</td>
                  </tr>
                )}
                {totalFees > 0 && isPik && (
                  <tr>
                    <td className="py-1 text-foreground-tertiary pl-4">Fees capitalised</td>
                    <td className="py-1 text-right tabular-nums text-foreground-secondary">+{formatCurrency(totalFees)}</td>
                  </tr>
                )}
                {isPik && interestCharge > 0 && (
                  <tr>
                    <td className="py-1 text-foreground-tertiary pl-4">Interest capitalised</td>
                    <td className="py-1 text-right tabular-nums text-foreground-secondary">+{formatCurrency(interestCharge)}</td>
                  </tr>
                )}
                {totalDraws === 0 && totalRepayments === 0 && totalFees === 0 && (!isPik || interestCharge === 0) && (
                  <tr>
                    <td className="py-1 text-foreground-muted pl-4" colSpan={2}>No movements this period</td>
                  </tr>
                )}
                <tr className="border-t border-border/60">
                  <td className="pt-1.5 pb-1 font-semibold">Closing balance</td>
                  <td className="pt-1.5 pb-1 text-right tabular-nums font-semibold">{formatCurrency(period.closingPrincipal)}</td>
                </tr>
                {netPrincipalChange !== 0 && (
                  <tr>
                    <td className="text-[11px] text-foreground-muted">Net change</td>
                    <td className={`text-right tabular-nums text-[11px] ${netPrincipalChange > 0 ? 'text-accent-sage' : 'text-destructive'}`}>
                      {netPrincipalChange > 0 ? '+' : ''}{formatCurrency(netPrincipalChange)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Period Transactions ── */}
          {events.length > 0 && (
            <div>
              <p className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3 pl-2" style={{ borderLeft: `3px solid ${RAX_NAVY}`, color: RAX_NAVY }}>
                Transactions
              </p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ backgroundColor: `${RAX_NAVY}0D` }}>
                    <th scope="col" className="text-left py-1.5 pl-2 font-medium text-foreground-secondary">Date</th>
                    <th scope="col" className="text-left py-1.5 font-medium text-foreground-secondary">Type</th>
                    <th scope="col" className="text-left py-1.5 font-medium text-foreground-secondary">Description</th>
                    <th scope="col" className="text-right py-1.5 pr-2 font-medium text-foreground-secondary">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {events
                    .filter(e => {
                      if (e.event_type === 'cash_received') return false;
                      const meta = e.metadata as Record<string, unknown>;
                      if (e.event_type === 'principal_repayment' && meta?.adjustment_type === 'fee_split') return false;
                      return true;
                    })
                    .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime())
                    .map((event) => {
                      const meta = event.metadata as Record<string, unknown>;
                      const getEventDescription = () => {
                        if (event.event_type === 'fee_invoice') {
                          const feeType = meta?.fee_type as string | undefined;
                          const paymentType = meta?.payment_type as string | undefined;
                          if (feeType?.includes('arrangement') || meta?.adjustment_type === 'fee_split') {
                            return 'Arrangement fee (withheld from borrower)';
                          }
                          if (meta?.description) return meta.description as string;
                          if (feeType) return `${feeType} fee`;
                        }
                        if (meta?.description) return meta.description as string;
                        if (meta?.period_id) return 'Period interest';
                        return null;
                      };
                      const description = getEventDescription();
                      return (
                        <tr key={event.id}>
                          <td className="py-1 tabular-nums text-foreground-tertiary">{formatDate(event.effective_date)}</td>
                          <td className="py-1">{formatEventType(event.event_type)}</td>
                          <td className="py-1 text-foreground-tertiary">{description || '—'}</td>
                          <td className="text-right tabular-nums py-1">
                            {event.amount ? (
                              <span>{event.event_type === 'principal_repayment' ? '–' : ''}{formatCurrency(event.amount)}</span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Interest Calculation ── */}
          <div>
            <p className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3 pl-2" style={{ borderLeft: `3px solid ${RAX_NAVY}`, color: RAX_NAVY }}>
              Interest Calculation
            </p>
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ backgroundColor: `${RAX_NAVY}0D` }}>
                  <th scope="col" className="text-left py-1.5 pl-2 font-medium text-foreground-secondary">Period</th>
                  <th scope="col" className="text-right py-1.5 font-medium text-foreground-secondary w-12">Days</th>
                  <th scope="col" className="text-right py-1.5 font-medium text-foreground-secondary">Principal</th>
                  <th scope="col" className="text-right py-1.5 font-medium text-foreground-secondary w-16">Rate</th>
                  <th scope="col" className="text-right py-1.5 pr-2 font-medium text-foreground-secondary">Interest</th>
                </tr>
              </thead>
              <tbody>
                {period.interestSegments.map((segment, idx) => (
                  <tr key={idx}>
                    <td className="py-1 tabular-nums text-foreground-tertiary">
                      {formatDate(segment.startDate)} – {formatDate(segment.endDate)}
                    </td>
                    <td className="text-right tabular-nums py-1">{segment.days}</td>
                    <td className="text-right tabular-nums py-1">{formatCurrency(segment.principal)}</td>
                    <td className="text-right tabular-nums py-1 text-foreground-tertiary">{formatPercent(segment.rate)}</td>
                    <td className="text-right tabular-nums py-1">{formatCurrency(segment.interest)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/60">
                  <td className="pt-1.5 font-semibold">Interest subtotal</td>
                  <td className="text-right tabular-nums pt-1.5 text-foreground-tertiary">{period.days}</td>
                  <td></td>
                  <td></td>
                  <td className="text-right tabular-nums pt-1.5 font-semibold">{formatCurrency(period.interestAccrued)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── Commitment Fee ── */}
          {period.commitmentFeeAccrued > 0 && (
            <div>
              <p className="text-[11px] tracking-[0.12em] uppercase font-medium mb-3 pl-2" style={{ borderLeft: `3px solid ${RAX_NAVY}`, color: RAX_NAVY }}>
                Commitment Fee
              </p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ backgroundColor: `${RAX_NAVY}0D` }}>
                    <th scope="col" className="text-left py-1.5 pl-2 font-medium text-foreground-secondary">Period</th>
                    <th scope="col" className="text-right py-1.5 font-medium text-foreground-secondary w-12">Days</th>
                    <th scope="col" className="text-right py-1.5 font-medium text-foreground-secondary">Undrawn</th>
                    <th scope="col" className="text-right py-1.5 font-medium text-foreground-secondary w-16">Rate</th>
                    <th scope="col" className="text-right py-1.5 pr-2 font-medium text-foreground-secondary">Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {period.commitmentFeeSegments.map((segment, idx) => (
                    <tr key={idx}>
                      <td className="py-1 tabular-nums text-foreground-tertiary">
                        {formatDate(segment.startDate)} – {formatDate(segment.endDate)}
                      </td>
                      <td className="text-right tabular-nums py-1">{segment.days}</td>
                      <td className="text-right tabular-nums py-1">{formatCurrency(segment.undrawn)}</td>
                      <td className="text-right tabular-nums py-1 text-foreground-tertiary">{formatPercent(segment.feeRate)}</td>
                      <td className="text-right tabular-nums py-1">{formatCurrency(segment.fee)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/60">
                    <td className="pt-1.5 font-semibold">Fee subtotal</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="text-right tabular-nums pt-1.5 font-semibold">{formatCurrency(period.commitmentFeeAccrued)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ── Charge Summary ── */}
          <div className="pt-4 px-4 pb-4" style={{ backgroundColor: `${RAX_NAVY}0D` }}>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-foreground-tertiary">Interest accrued</span>
                <span className="tabular-nums text-foreground-secondary">{formatCurrency(period.interestAccrued)}</span>
              </div>
              {period.commitmentFeeAccrued > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground-tertiary">Commitment fee</span>
                  <span className="tabular-nums text-foreground-secondary">{formatCurrency(period.commitmentFeeAccrued)}</span>
                </div>
              )}
              {period.feesInvoiced > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground-tertiary">Fees invoiced</span>
                  <span className="tabular-nums text-foreground-secondary">{formatCurrency(period.feesInvoiced)}</span>
                </div>
              )}
              {period.amortizationDue > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground-tertiary">Scheduled repayment</span>
                  <span className="tabular-nums text-foreground-secondary">{formatCurrency(period.amortizationDue)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 text-[13px] font-semibold">
                <span>{isPik ? 'Total capitalised' : 'Total due'}</span>
                <span className="tabular-nums text-primary">
                  {formatCurrency(period.totalDue)}
                </span>
              </div>
            </div>
          </div>

          </div>

          {/* ── Page 2 footer ── */}
          <div className="mt-auto text-[11px] text-white/70 px-5 py-2 text-center" style={{ backgroundColor: RAX_NAVY }}>
            <p>RAX Finance B.V. — J.J. Viottastraat 29, 1071 JP Amsterdam, The Netherlands</p>
          </div>
      </div>
    </div>
  );
}

function NoticeStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'sent':
      return <Badge className="status-done text-xs">Sent</Badge>;
    case 'approved':
      return <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-xs border-0">Ready</Badge>;
    case 'submitted':
      return <Badge variant="secondary" className="text-xs">Pending</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Draft</Badge>;
  }
}
