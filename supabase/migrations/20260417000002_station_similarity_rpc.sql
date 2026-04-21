-- Fuzzy receipt-station matching.
-- Replaces the JS-side fetch-100-rows-and-compare loop in detectStationPattern.
-- pg_trgm is already enabled (see 20260416_move_pg_trgm_to_extensions_schema.sql).

CREATE OR REPLACE FUNCTION find_similar_stations(
  p_wallet text,
  p_station_name text,
  p_since timestamptz,
  p_similarity_threshold real DEFAULT 0.6
)
RETURNS TABLE(wallet text) AS $$
  SELECT DISTINCT c.wallet
  FROM claim_receipts cr
  JOIN claims c ON cr.claim_id = c.id
  WHERE c.wallet <> p_wallet
    AND c.created_at > p_since
    AND cr.ocr_text IS NOT NULL
    AND length(cr.ocr_text) > 20
    AND extensions.similarity(
      upper(regexp_replace(split_part(cr.ocr_text, E'\n', 1), '[^A-Z0-9 ]', '', 'g')),
      p_station_name
    ) > p_similarity_threshold
$$ LANGUAGE sql STABLE;
