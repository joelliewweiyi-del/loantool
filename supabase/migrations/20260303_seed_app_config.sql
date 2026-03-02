-- Seed app_config with default AFAS and bank configuration values.
-- Empty bank values force explicit configuration before notices can be sent.
INSERT INTO app_config (key, value) VALUES
  ('afas_gl_interest_pik',    '9350'),
  ('afas_gl_interest_cash',   '9351'),
  ('afas_journal_code',       '70'),
  ('afas_admin_code',         '05'),
  ('afas_payment_terms_days', '30'),
  ('bank_name',               ''),
  ('bank_iban',               ''),
  ('bank_bic',                ''),
  ('bank_account_name',       'RAX Loan Management System')
ON CONFLICT (key) DO NOTHING;
