-- Populate bank details for cash-pay interest notices (RAX RED IV BV at ING Bank).
UPDATE app_config SET value = 'ING Bank' WHERE key = 'bank_name';
UPDATE app_config SET value = 'NL81 INGB 0112 3138 92' WHERE key = 'bank_iban';
UPDATE app_config SET value = 'INGBNL2A' WHERE key = 'bank_bic';
UPDATE app_config SET value = 'RAX RED IV BV' WHERE key = 'bank_account_name';
