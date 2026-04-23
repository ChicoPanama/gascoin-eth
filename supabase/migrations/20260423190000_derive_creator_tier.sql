-- Gas Network — canonical composite → creator band bridge.
--
-- Exposes derive_creator_tier(numeric) as a SECURITY INVOKER function so
-- the Marketplace brief filter, the creator view, and any future public
-- API surface all gate by the same thresholds that lib/perks-ladder.ts
-- uses in the UI. If you change the band thresholds here, update
-- COMPOSITE_BANDS in lib/perks-ladder.ts in the same PR.
--
-- Band thresholds (must match lib/perks-ladder.ts):
--   new           0 .. 39
--   rising       40 .. 69
--   established  70 .. 84
--   elite        85 .. 100

CREATE OR REPLACE FUNCTION public.derive_creator_tier(composite numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN composite IS NULL THEN 'new'
    WHEN composite >= 85   THEN 'elite'
    WHEN composite >= 70   THEN 'established'
    WHEN composite >= 40   THEN 'rising'
    ELSE                        'new'
  END;
$$;

COMMENT ON FUNCTION public.derive_creator_tier(numeric) IS
  'Canonical Composite Influence Score → creator band. Shared between the /standing UI, /api/me/ladder, the Marketplace brief filter, and the public standing API. Must stay in lockstep with lib/perks-ladder.ts::COMPOSITE_BANDS.';

-- Order matters: comparator first (integer via band_rank), then name.
CREATE OR REPLACE FUNCTION public.creator_tier_rank(tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE tier
    WHEN 'new'         THEN 0
    WHEN 'rising'      THEN 1
    WHEN 'established' THEN 2
    WHEN 'elite'       THEN 3
    ELSE 0
  END;
$$;

COMMENT ON FUNCTION public.creator_tier_rank(text) IS
  'Ordinal rank of a creator band. Use to compare: a creator with derive_creator_tier(composite) rank >= brief.min_creator_tier rank qualifies for the brief.';

-- Extend creator_public_view to surface the derived band alongside the
-- existing freetext creator_tier column (which stays as fallback).
-- SECURITY INVOKER so the view honors RLS on underlying tables.
CREATE OR REPLACE VIEW public.creator_public_view
WITH (security_invoker = true) AS
SELECT
  cp.handle,
  cp.wallet,
  cp.is_verified,
  cp.creator_tier AS creator_tier_override,
  public.derive_creator_tier(cs.composite) AS creator_tier_derived,
  COALESCE(cp.creator_tier, public.derive_creator_tier(cs.composite)) AS creator_tier,
  cs.composite AS composite_score,
  cp.engagement_consistency,
  cp.audience_growth_rate,
  cp.content_authenticity,
  cp.first_seen_at,
  wxl.profile_image_url,
  wxl.avg_quality_score,
  wxl.bio,
  wxl.x_location,
  wxl.linked_at,
  wxl.x_account_created_at,
  (SELECT COALESCE(SUM(st.impressions), 0) FROM scored_tweets st WHERE st.wallet = cp.wallet)    AS total_impressions,
  (SELECT COUNT(*)                          FROM scored_tweets st WHERE st.wallet = cp.wallet)    AS total_posts,
  (SELECT COALESCE(SUM(p.amount_eth), 0)    FROM payouts p         WHERE p.wallet = cp.wallet AND p.status = 'paid')  AS total_eth_earned,
  (SELECT COUNT(*)                          FROM payouts p         WHERE p.wallet = cp.wallet AND p.status = 'paid')  AS total_paid_claims
FROM creator_profiles cp
LEFT JOIN wallet_x_links wxl ON LOWER(wxl.x_handle) = cp.handle
LEFT JOIN composite_scores cs ON cs.wallet = cp.wallet;

GRANT SELECT ON public.creator_public_view TO anon, authenticated;
