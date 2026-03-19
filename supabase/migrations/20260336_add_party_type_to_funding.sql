-- Add party_type column to funding_counterparties

CREATE TYPE public.party_type AS ENUM (
  'sponsor',
  'leverage_provider',
  'legal_counsel',
  'advisor'
);

ALTER TABLE public.funding_counterparties
  ADD COLUMN party_type public.party_type;
