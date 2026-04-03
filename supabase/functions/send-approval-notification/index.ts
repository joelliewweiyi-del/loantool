import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  item_type: 'event_approval' | 'draw_confirmation' | 'payment_confirmation' | 'period_approval' | 'pik_rollup';
  item_id: string;
  loan_id?: string;
  loan_numeric_id?: string;
  borrower_name?: string;
  event_type?: string;
  amount?: number;
  effective_date?: string;
  created_by?: string;
}

const typeLabels: Record<string, string> = {
  event_approval: 'Event Approval',
  draw_confirmation: 'Draw Confirmation',
  payment_confirmation: 'Payment Confirmation',
  period_approval: 'Period Approval',
  pik_rollup: 'PIK Roll-Up',
};

const recipientRole: Record<string, string> = {
  event_approval: 'controller',
  draw_confirmation: 'pm',
  payment_confirmation: 'controller',
  period_approval: 'controller',
  pik_rollup: 'pm',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body: NotificationRequest = await req.json();
    const { item_type, item_id, loan_id, loan_numeric_id, borrower_name, event_type, amount, effective_date } = body;

    // Check if notification was already sent for this item
    const { data: existing } = await supabase
      .from('approval_notifications')
      .select('id')
      .eq('item_type', item_type)
      .eq('item_id', item_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ message: 'Notification already sent', id: existing.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine recipient role and fetch their emails
    const targetRole = recipientRole[item_type] ?? 'controller';
    const { data: roleUsers, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', targetRole);

    if (roleError) throw roleError;

    // Get email addresses from auth.users
    const emails: string[] = [];
    for (const ru of roleUsers ?? []) {
      const { data: userData } = await supabase.auth.admin.getUserById(ru.user_id);
      if (userData?.user?.email) {
        emails.push(userData.user.email);
      }
    }

    if (emails.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recipients found for role: ' + targetRole }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build email content
    const label = typeLabels[item_type] || item_type;
    const loanRef = loan_numeric_id ? `#${loan_numeric_id}` : '';
    const borrower = borrower_name || '';
    const amountStr = amount != null
      ? new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
      : '';

    const subject = `[RAX Loan Tool] Action needed: ${label}${loanRef ? ` ${loanRef}` : ''}${amountStr ? ` (${amountStr})` : ''}`;

    const htmlBody = `
      <div style="font-family: 'IBM Plex Sans', -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>A new item requires your approval in the RAX Loan Management System.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 120px;">Type</td>
            <td style="padding: 8px 0; font-weight: 600;">${label}${event_type ? ` — ${event_type.replace(/_/g, ' ')}` : ''}</td>
          </tr>
          ${loanRef ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">Loan</td>
            <td style="padding: 8px 0; font-weight: 600;">${loanRef} — ${borrower}</td>
          </tr>` : ''}
          ${amountStr ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">Amount</td>
            <td style="padding: 8px 0; font-family: 'IBM Plex Mono', monospace; font-weight: 600;">${amountStr}</td>
          </tr>` : ''}
          ${effective_date ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">Date</td>
            <td style="padding: 8px 0;">${effective_date}</td>
          </tr>` : ''}
        </table>
        <p>
          <a href="https://rax-lms.vercel.app/approvals"
             style="display: inline-block; padding: 10px 20px; background: #003B5C; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Review in RAX Loan Tool
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">This is an automated message from RAX Loan Management System.</p>
      </div>
    `;

    // Send via Resend
    const senderDomain = Deno.env.get('RESEND_SENDER_DOMAIN') || 'onboarding@resend.dev';
    const fromAddress = senderDomain.includes('@') ? `RAX Loan Tool <${senderDomain}>` : `RAX Loan Tool <noreply@${senderDomain}>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: emails,
        subject,
        html: htmlBody,
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

    // Record notification to prevent duplicates
    await supabase
      .from('approval_notifications')
      .insert({
        item_type,
        item_id,
        loan_id: loan_id || null,
        notified_role: targetRole,
        email_sent_to: emails,
        metadata: {
          resend_id: emailResult.id,
          loan_numeric_id,
          borrower_name,
          event_type,
          amount,
          effective_date,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: emails,
        resend_id: emailResult.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
