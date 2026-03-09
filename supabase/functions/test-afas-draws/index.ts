import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAfasToken, getAfasBaseUrl, buildAfasAuthHeader } from "../_shared/afas-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const afasToken = await getAfasToken();
    const baseUrl = await getAfasBaseUrl();

    if (!afasToken || !baseUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing AFAS credentials',
          details: { hasToken: !!afasToken, hasBaseUrl: !!baseUrl }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = buildAfasAuthHeader(afasToken);

    // Allow overriding take/skip/filters via request body
    let take = 20;
    let skip = 0;
    let filterFieldIds = 'JournalId,AccountNo';
    let filterValues = '50,1750..1751';
    let operatorTypes = '1,15';
    let connector = 'Profit_Transactions_Allocated';
    try {
      const body = await req.json();
      if (body?.take) take = Math.min(parseInt(body.take, 10), 5000);
      if (body?.skip) skip = parseInt(body.skip, 10);
      if (body?.filterFieldIds) filterFieldIds = body.filterFieldIds;
      if (body?.filterValues) filterValues = body.filterValues;
      if (body?.operatorTypes) operatorTypes = body.operatorTypes;
      if (body?.connector) connector = body.connector;
    } catch {
      // No body, use defaults
    }

    const connectorUrl = `${baseUrl}/connectors/${connector}` +
      `?filterfieldids=${encodeURIComponent(filterFieldIds)}` +
      `&filtervalues=${encodeURIComponent(filterValues)}` +
      `&operatortypes=${encodeURIComponent(operatorTypes)}` +
      `&skip=${skip}&take=${take}` +
      `&orderbyfieldids=-EntryDate`;

    console.log('Fetching loan draws from AFAS:', connectorUrl);

    const response = await fetch(connectorUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-language': 'nl-nl',
      },
    });

    const responseText = await response.text();
    console.log('AFAS Response Status:', response.status);
    console.log('AFAS Response:', responseText.substring(0, 1000));

    if (response.ok) {
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }

      // Log the field names from the first row so we can map them
      const rows = data?.rows || [];
      const fieldNames = rows.length > 0 ? Object.keys(rows[0]) : [];

      return new Response(
        JSON.stringify({
          success: true,
          message: `Retrieved ${rows.length} loan draw transactions`,
          totalRows: rows.length,
          fieldNames,
          sampleRows: rows.slice(0, 5),
          allData: data,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'AFAS API returned an error',
        status: response.status,
        details: responseText,
      }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching loan draws:', errMessage);
    return new Response(
      JSON.stringify({ success: false, error: errMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
