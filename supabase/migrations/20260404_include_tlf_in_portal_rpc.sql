-- Include TLF loans in get_loans_for_portal() alongside RED IV.
-- Use lps.facility (e.g. TLFJAN26A) instead of lps.vehicle for the Facility column.

CREATE OR REPLACE FUNCTION public.get_loans_for_portal()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      lps.loan_id                                        AS "Loan ID",
      COALESCE(NULLIF(lps.facility, ''), lps.vehicle)     AS "Facility",
      lps.city                                           AS "City",
      lps.category                                       AS "Category",
      REPLACE(TO_CHAR(ROUND(lps.effective_commitment, 2), 'FM999999999990D00'), '.', ',')
                                                         AS "Total Commitment",
      REPLACE(TO_CHAR(ROUND(lps.outstanding, 2), 'FM999999999990D00'), '.', ',')
                                                         AS "Outstanding Loan Amount",
      REPLACE(TO_CHAR(ROUND(lps.undrawn, 2), 'FM999999999990D00'), '.', ',')
                                                         AS "Undrawn Amount",
      REPLACE(TO_CHAR(ROUND(lps.current_rate * 100, 2), 'FM990D00'), '.', ',') || '%'
                                                         AS "Interest Rate",
      REPLACE(TO_CHAR(ROUND(lps.ltv * 100, 2), 'FM990D00'), '.', ',') || '%'
                                                         AS "LTV",
      TO_CHAR(lps.loan_start_date, 'DD/MM/YYYY')        AS "Start Date",
      TO_CHAR(lps.maturity_date, 'DD/MM/YYYY')           AS "Maturity",
      CASE
        WHEN lps.maturity_date IS NOT NULL AND lps.loan_start_date IS NOT NULL
        THEN REPLACE(
          TO_CHAR(
            ROUND((lps.maturity_date - lps.loan_start_date)::numeric / 365.25, 2),
            'FM990D00'
          ), '.', ','
        )
        ELSE NULL
      END                                                AS "Duration",
      REPLACE(TO_CHAR(ROUND(lps.valuation, 2), 'FM999999999990D00'), '.', ',')
                                                         AS "Valuation (as-is)",
      REPLACE(TO_CHAR(ROUND(lps.rental_income, 2), 'FM999999999990D00'), '.', ',')
                                                         AS "Rental Income",
      lps.remarks                                        AS "Remarks",
      UPPER(COALESCE(lps.earmarked, false)::text)        AS "Earmarked",
      l.google_maps_url                                  AS "google_maps",
      l.kadastrale_kaart_url                             AS "kadastralekaart",
      l.photo_url                                        AS "Photo",
      l.additional_info                                  AS "Additional Information"
    FROM loan_portfolio_summary lps
    JOIN loans l ON l.id = lps.id
    WHERE lps.vehicle IN ('RED IV', 'TLF')
      AND lps.loan_status = 'active'
    ORDER BY lps.loan_id
  ) t;
$$;
