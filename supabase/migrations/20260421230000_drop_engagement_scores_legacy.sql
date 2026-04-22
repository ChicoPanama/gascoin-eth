-- Remove engagement_scores + engagement_totals view.
-- Superseded by engagement_points (20260404_engagement_points.sql) which is
-- the source of truth for all point accrual. Zero rows, zero writers in code.
-- CASCADE drops the view too.

DROP VIEW IF EXISTS engagement_totals CASCADE;
DROP TABLE IF EXISTS engagement_scores;
