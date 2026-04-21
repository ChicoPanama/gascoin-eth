-- Add location + receipt metadata columns to claims table
-- Supports both US (city/state) and international (city/country)
alter table claims add column if not exists city text;
alter table claims add column if not exists state text;
alter table claims add column if not exists country text;
alter table claims add column if not exists is_featured boolean default false;

-- Add redaction flag to claim_receipts
alter table claim_receipts add column if not exists is_image_redacted boolean default false;
-- TODO: build automated PII detection in submission portal upload step
