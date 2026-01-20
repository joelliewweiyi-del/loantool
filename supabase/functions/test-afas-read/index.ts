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

    if (!afasToken || !afasEnvId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing AFAS credentials' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body for custom connector name
    let connectorName = 'Profit_Debtor_Invoices';
    try {
      const body = await req.json();
      if (body?.connector) {
        connectorName = body.connector;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    const baseUrl = `https://${afasEnvId}.rest.afas.online/profitrestservices`;
    
    // First, get the connector's metainfo to understand available fields
    const metaUrl = `${baseUrl}/metainfo/get/${connectorName}`;
    console.log('Fetching metainfo:', metaUrl);
    
    const metaResponse = await fetch(metaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `AfasToken ${btoa(afasToken)}`,
        'Content-Type': 'application/json',
      },
    });
    
    let schema = null;
    let primaryField = null;
    
    if (metaResponse.ok) {
      const metaText = await metaResponse.text();
      try {
        schema = JSON.parse(metaText);
        // Find a suitable field for sorting - prefer date fields or the first indexed field
        if (schema.fields && schema.fields.length > 0) {
          // Look for a date field first (better for chronological sorting)
          const dateField = schema.fields.find((f: { dataType: string; fieldId: string }) => f.dataType === 'date');
          // Or use the first string/int field (avoid decimal fields for sorting)
          const sortableField = schema.fields.find((f: { dataType: string; fieldId: string }) => 
            f.dataType === 'string' || f.dataType === 'int' || f.dataType === 'date'
          );
          primaryField = dateField?.fieldId || sortableField?.fieldId || schema.fields[0].fieldId;
        }
      } catch {
        schema = metaText;
      }
    }
    
    console.log('Schema:', JSON.stringify(schema)?.substring(0, 500));
    console.log('Primary field for sorting:', primaryField);
    
    // Build filters - try without pagination first (orderbyfieldids requires indexable fields in AFAS)
    const filters = [
      '', // No filter - just get all data (AFAS returns max 100 by default)
      '?take=10', // Try take without orderby
    ];
    
    const attempts: Array<{filter: string, status: number, response: string}> = [];
    let successData = null;
    
    for (const filter of filters) {
      const getUrl = `${baseUrl}/connectors/${connectorName}${filter}`;
      console.log('Trying:', getUrl);
      
      const testResponse = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'Authorization': `AfasToken ${btoa(afasToken)}`,
          'Content-Type': 'application/json',
        },
      });
      
      const testText = await testResponse.text();
      console.log('Response:', testResponse.status, testText.substring(0, 300));
      
      attempts.push({ filter: filter || '(no filter)', status: testResponse.status, response: testText.substring(0, 500) });
      
      if (testResponse.ok) {
        try {
          successData = JSON.parse(testText);
        } catch {
          successData = testText;
        }
        break;
      }
    }
    
    if (successData) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully retrieved data from ${connectorName}`,
          data: successData,
          schema: schema,
          attempts: attempts
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Could not read from ${connectorName}`,
        attempts: attempts,
        connectorSchema: schema,
        hint: 'The connector may have a configuration issue in AFAS. Check the profitLogReference in AFAS logs.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Error reading from AFAS:', errMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
