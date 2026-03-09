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
          error: 'Missing AFAS credentials'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = buildAfasAuthHeader(afasToken);

    // Get the schema for FiEntries UpdateConnector
    const schemaUrl = `${baseUrl}/metainfo/update/FiEntries`;

    console.log('Fetching FiEntries schema from:', schemaUrl);

    const response = await fetch(schemaUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('Schema Response Status:', response.status);

    if (response.ok) {
      // The response is typically XML (XSD schema)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'FiEntries schema retrieved successfully',
          status: response.status,
          contentType: response.headers.get('content-type'),
          schema: responseText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch schema',
          status: response.status,
          details: responseText
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching schema:', errMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
