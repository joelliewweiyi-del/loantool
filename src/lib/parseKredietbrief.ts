import { supabase } from '@/integrations/supabase/client';

export interface ParsedDocumentResult {
  /** Fields keyed by LoanFormData field name */
  fields: Record<string, string>;
  /** Warnings about fields that could not be parsed */
  warnings: string[];
  /** Which document type was detected */
  documentType: 'kredietbrief' | 'credit_proposal' | 'unknown';
}

/**
 * Clean a Dutch borrower name: truncate after B.V. (or variations like BV, B.V, b.v.)
 * and normalize the suffix to "B.V."
 */
export function cleanBorrowerName(name: string): string {
  const bvMatch = name.match(/B\s*\.?\s*V\s*\.?/i);
  if (bvMatch) {
    const prefix = name.slice(0, bvMatch.index!).trim();
    return `${prefix} B.V.`;
  }
  return name.trim();
}

/**
 * Parse a loan document using AI (Claude via Supabase Edge Function).
 * Sends the extracted PDF text to the `parse-loan-document` Edge Function,
 * which calls Claude to extract structured loan fields.
 */
export async function parseLoanDocument(rawText: string): Promise<ParsedDocumentResult> {
  const { data, error } = await supabase.functions.invoke('parse-loan-document', {
    body: { text: rawText },
  });

  if (error) {
    // When the Edge Function returns a non-2xx status, the Supabase client
    // sets `error` but the response body (with the real error) may be in `data`.
    const detail = data?.error || error.message;
    console.error('AI document parsing failed:', detail, { error, data });
    return {
      fields: {},
      warnings: [`AI parsing failed: ${detail}`],
      documentType: 'unknown',
    };
  }

  if (!data?.success) {
    return {
      fields: {},
      warnings: [data?.error || 'AI parsing returned no results'],
      documentType: 'unknown',
    };
  }

  const fields: Record<string, string> = data.fields || {};

  // Post-process: normalize borrower name
  if (fields.borrower_name) {
    fields.borrower_name = cleanBorrowerName(fields.borrower_name);
  }

  return {
    fields,
    warnings: [],
    documentType: data.documentType || 'unknown',
  };
}
