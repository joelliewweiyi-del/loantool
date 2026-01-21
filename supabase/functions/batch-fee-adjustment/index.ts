import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeeAdjustment {
  loan_id: string;
  arrangement_fee: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated and has a role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user has a role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "User has no roles" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { adjustments } = await req.json() as { adjustments: FeeAdjustment[] };

    if (!adjustments || !Array.isArray(adjustments)) {
      return new Response(JSON.stringify({ error: "Invalid adjustments array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const adj of adjustments) {
      try {
        // 1. Find the loan by loan_id
        const { data: loan, error: loanError } = await supabase
          .from("loans")
          .select("id, loan_id, loan_start_date")
          .eq("loan_id", adj.loan_id)
          .single();

        if (loanError || !loan) {
          throw new Error(`Loan ${adj.loan_id} not found`);
        }

        // 2. Find the founding principal_draw event
        const { data: drawEvent, error: drawError } = await supabase
          .from("loan_events")
          .select("*")
          .eq("loan_id", loan.id)
          .eq("event_type", "principal_draw")
          .eq("status", "approved")
          .order("effective_date", { ascending: true })
          .limit(1)
          .single();

        if (drawError || !drawEvent) {
          throw new Error(`No founding principal_draw event found for loan ${adj.loan_id}`);
        }

        const originalAmount = drawEvent.amount || 0;
        if (adj.arrangement_fee >= originalAmount) {
          throw new Error(`Fee (${adj.arrangement_fee}) >= principal (${originalAmount})`);
        }

        const effectiveDate = drawEvent.effective_date;

        // 3. Create a reversing principal_repayment for the fee amount
        const { error: repayError } = await supabase
          .from("loan_events")
          .insert({
            loan_id: loan.id,
            event_type: "principal_repayment",
            effective_date: effectiveDate,
            amount: adj.arrangement_fee,
            status: "approved",
            created_by: user.id,
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            requires_approval: false,
            is_system_generated: true,
            metadata: {
              auto_generated: true,
              description: "Adjustment: Split arrangement fee from principal draw",
              adjustment_type: "fee_split",
              original_draw_id: drawEvent.id,
            },
          });

        if (repayError) throw new Error(repayError.message);

        // 4. Create the fee_invoice event with PIK metadata
        const { error: feeError } = await supabase
          .from("loan_events")
          .insert({
            loan_id: loan.id,
            event_type: "fee_invoice",
            effective_date: effectiveDate,
            amount: adj.arrangement_fee,
            status: "approved",
            created_by: user.id,
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            requires_approval: false,
            is_system_generated: true,
            metadata: {
              auto_generated: true,
              description: "Arrangement fee (afsluitprovisie)",
              fee_type: "arrangement",
              payment_type: "pik",
              adjustment_type: "fee_split",
              original_draw_id: drawEvent.id,
            },
          });

        if (feeError) throw new Error(feeError.message);

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Loan ${adj.loan_id}: ${(error as Error).message}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
