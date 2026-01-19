import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const afasToken = Deno.env.get('AFAS_TOKEN');
    const afasEnvId = Deno.env.get('AFAS_ENVIRONMENT_ID');
    const adminCode = Deno.env.get('AFAS_ADMINISTRATIE_CODE') || '05';

    if (!afasToken || !afasEnvId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing AFAS credentials' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = `https://${afasEnvId}.rest.afas.online/profitrestservices`;
    
    // Test payload for FiEntries UpdateConnector
    // This is a minimal test entry - adjust based on actual schema requirements
    const testPayload = {
      FiEntries: {
        Element: {
          Fields: {
            // AdCd = Administratie code (required)
            AdCd: adminCode,
            // JoCd = Journaalcode (required) - typically 10 for sales invoices
            JoCd: "10",
            // DaJo = Journaaldatum (required)
            DaJo: new Date().toISOString().split('T')[0],
            // DaDu = Vervaldatum
            DaDu: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            // InNu = Factuurnummer (invoice number)
            InNu: `TEST-${Date.now()}`,
            // Ds = Omschrijving (description)
            Ds: "Test entry from Lovable integration",
          },
          Objects: {
            FiEntriesLines: {
              Element: {
                Fields: {
                  // TyNt = Notitie type
                  TyNt: 1,
                  // AcId = Grootboekrekening (GL account)
                  AcId: "8000", // Typical revenue account - adjust as needed
                  // AmVa = Bedrag (amount)
                  AmVa: 0.01, // Minimal test amount
                  // Ds = Omschrijving
                  Ds: "Test line item",
                  // DC = Debit/Credit indicator
                  DC: "C", // Credit
                }
              }
            }
          }
        }
      }
    };

    // Parse request body for custom test data
    let customPayload = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.testPayload) {
          customPayload = body.testPayload;
        }
        // Allow dry-run mode
        if (body.dryRun === true) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Dry run - payload that would be sent:',
              dryRun: true,
              payload: customPayload || testPayload,
              endpoint: `${baseUrl}/connectors/FiEntries`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch {
        // No body or invalid JSON, use default payload
      }
    }

    const updateUrl = `${baseUrl}/connectors/FiEntries`;
    const payloadToSend = customPayload || testPayload;
    
    console.log('Posting to:', updateUrl);
    console.log('Payload:', JSON.stringify(payloadToSend, null, 2));

    const response = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `AfasToken ${btoa(afasToken)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadToSend),
    });

    const responseText = await response.text();
    console.log('Response Status:', response.status);
    console.log('Response Body:', responseText);

    if (response.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Successfully posted test entry to FiEntries',
          status: response.status,
          response: responseText || 'Entry created successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to post entry',
          status: response.status,
          details: responseText,
          payloadSent: payloadToSend
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Error writing to AFAS:', errMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
