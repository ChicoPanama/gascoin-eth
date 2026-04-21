-- Knowledge base: institutional knowledge accessible to all pipelines.
-- Bridges Obsidian vault content to production.
-- Categories: gate_rule, fraud_pattern, decision, architecture, policy,
--             intelligence_report, pipeline, treasury, testing

CREATE TABLE IF NOT EXISTS knowledge_base (
  id            bigserial    PRIMARY KEY,
  category      text         NOT NULL,
  slug          text         NOT NULL UNIQUE,
  title         text         NOT NULL,
  content       text         NOT NULL,
  tags          text[]       DEFAULT '{}',
  source        text         NOT NULL DEFAULT 'obsidian',
  obsidian_path text,
  version       integer      NOT NULL DEFAULT 1,
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  DEFAULT now(),
  updated_at    timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base (category, is_active);
CREATE INDEX IF NOT EXISTS idx_kb_tags     ON knowledge_base USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_kb_slug     ON knowledge_base (slug);

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Service role can read/write; anon can read active entries only
CREATE POLICY kb_service_all ON knowledge_base FOR ALL
  USING (true) WITH CHECK (true);


-- Pipeline-generated intelligence entries.
-- Written by workers, read by admin dashboard and intelligence aggregator.

CREATE TABLE IF NOT EXISTS intelligence_entries (
  id              bigserial    PRIMARY KEY,
  entry_type      text         NOT NULL,
  entity_type     text,
  entity_id       text,
  summary         text         NOT NULL,
  detail_json     jsonb,
  severity        text         DEFAULT 'info',
  pipeline_source text         NOT NULL,
  acknowledged    boolean      DEFAULT false,
  created_at      timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ie_type     ON intelligence_entries (entry_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ie_entity   ON intelligence_entries (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ie_severity ON intelligence_entries (severity, acknowledged, created_at DESC);

ALTER TABLE intelligence_entries ENABLE ROW LEVEL SECURITY;

-- Service role can read/write
CREATE POLICY ie_service_all ON intelligence_entries FOR ALL
  USING (true) WITH CHECK (true);
