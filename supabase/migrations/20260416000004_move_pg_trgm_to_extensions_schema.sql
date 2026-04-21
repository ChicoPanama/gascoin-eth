-- Move pg_trgm to the extensions schema (Supabase convention)
-- Clears the extension_in_public advisor warning.
alter extension pg_trgm set schema extensions;
