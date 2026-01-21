import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { event_id, new_amount, update_metadata } = await req.json();

    if (!event_id) {
      return new Response(JSON.stringify({ error: 'Missing event_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to bypass trigger
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let error = null;

    // Update amount if provided
    if (new_amount !== undefined) {
      const { error: amountError } = await supabase.rpc('admin_correct_event_amount', {
        p_event_id: event_id,
        p_new_amount: new_amount
      });
      if (amountError) error = amountError;
    }

    // Update metadata if provided
    if (update_metadata && !error) {
      const { error: metaError } = await supabase.rpc('admin_correct_event_metadata', {
        p_event_id: event_id,
        p_new_metadata: update_metadata
      });
      if (metaError) error = metaError;
    }

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
