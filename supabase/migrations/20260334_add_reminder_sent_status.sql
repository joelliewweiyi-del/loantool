-- Add 'reminder_sent' to the covenant_status enum.
-- Sits between pending and requested: you've sent a reminder but haven't received a response yet.
ALTER TYPE public.covenant_status ADD VALUE IF NOT EXISTS 'reminder_sent' AFTER 'pending';
