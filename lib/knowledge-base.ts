/**
 * Knowledge Base Client
 *
 * Reads institutional knowledge from Supabase `knowledge_base` table
 * (synced from Obsidian vault). Writes pipeline intelligence to
 * `intelligence_entries` table.
 *
 * Used by Claude review to inject relevant gate rules, fraud patterns,
 * and recent decisions into the oversight prompt.
 */

import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from './supabase';
import { cacheGetOrFetch } from './cache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KBEntry {
  slug: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  updated_at: string;
}

export interface IntelligenceEntry {
  entry_type: string;
  entity_type?: string;
  entity_id?: string;
  summary: string;
  detail_json?: unknown;
  severity?: string;
  pipeline_source: string;
}

// ---------------------------------------------------------------------------
// Read operations (cached)
// ---------------------------------------------------------------------------

/**
 * Get knowledge base entries by category.
 * Cached 5 minutes in Redis.
 */
export async function getKBEntries(category: string): Promise<KBEntry[]> {
  return cacheGetOrFetch(`kb:cat:${category}`, async () => {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('knowledge_base')
        .select('slug, title, content, category, tags, updated_at')
        .eq('category', category)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(50);
      return (data as KBEntry[]) || [];
    } catch {
      return [];
    }
  }, 300);
}

/**
 * Get a single knowledge base entry by slug.
 * Cached 5 minutes in Redis.
 */
export async function getKBEntry(slug: string): Promise<KBEntry | null> {
  return cacheGetOrFetch(`kb:slug:${slug}`, async () => {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('knowledge_base')
        .select('slug, title, content, category, tags, updated_at')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      return (data as KBEntry | null) || null;
    } catch {
      return null;
    }
  }, 300);
}

/**
 * Search knowledge base entries by tags.
 * Cached 2 minutes in Redis.
 */
export async function searchKB(tags: string[]): Promise<KBEntry[]> {
  const key = `kb:tags:${tags.sort().join(',')}`;
  return cacheGetOrFetch(key, async () => {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from('knowledge_base')
        .select('slug, title, content, category, tags, updated_at')
        .eq('is_active', true)
        .overlaps('tags', tags)
        .order('updated_at', { ascending: false })
        .limit(20);
      return (data as KBEntry[]) || [];
    } catch {
      return [];
    }
  }, 120);
}

// ---------------------------------------------------------------------------
// Claude context builder
// ---------------------------------------------------------------------------

const MAX_CONTEXT_CHARS = 2000; // ~500 tokens — increased to fit Fleet-tier claims with 5+ failed gates

/**
 * Build compressed Claude context from the knowledge base.
 * Selectively includes entries based on claim signals to minimize token spend.
 *
 * Always includes: policy thresholds
 * Conditionally includes: fraud patterns (high risk), gate rules (failed gates),
 * ring patterns (referral flags)
 */
/**
 * Composed KB context for Claude oversight. Wrapped in Next.js unstable_cache
 * (Vercel Data Cache) — framework-level caching layered on top of Upstash.
 *
 * Cache key is derived from the signal shape (risk bucket + fraud level +
 * failed-gate set + referral flag), so identical claim postures share cache
 * entries. Revalidate with `revalidateTag('kb:context')` whenever the KB
 * itself is edited (admin UI or Obsidian sync).
 */
export const buildClaudeKBContext = unstable_cache(
  buildClaudeKBContextImpl,
  ['gc:kb:claude-context'],
  { revalidate: 3600, tags: ['kb:context'] },
);

async function buildClaudeKBContextImpl(signals: {
  riskScore: number;
  failedGates: string[];
  fraudRisk: string;
  hasReferralFlags: boolean;
}): Promise<string> {
  const sections: string[] = [];
  let charBudget = MAX_CONTEXT_CHARS;

  const t0 = Date.now();

  // Always fetch policy thresholds (small, foundational)
  const policyEntries = await getKBEntries('policy');
  for (const entry of policyEntries.slice(0, 2)) {
    const line = `[${entry.title}] ${entry.content.slice(0, 200)}`;
    if (line.length <= charBudget) {
      sections.push(line);
      charBudget -= line.length;
    }
  }

  // If high risk or high fraud, include fraud patterns
  if ((signals.riskScore > 0.5 || signals.fraudRisk === 'high') && charBudget > 100) {
    const fraudEntries = await getKBEntries('fraud_pattern');
    for (const entry of fraudEntries.slice(0, 2)) {
      const line = `[FRAUD: ${entry.title}] ${entry.content.slice(0, 200)}`;
      if (line.length <= charBudget) {
        sections.push(line);
        charBudget -= line.length;
      }
    }
  }

  // If specific gates failed, fetch matching gate rules
  if (signals.failedGates.length > 0 && charBudget > 100) {
    for (const gate of signals.failedGates.slice(0, 3)) {
      const slug = `gates/${gate.replace(/_/g, '-')}`;
      const entry = await getKBEntry(slug);
      if (entry) {
        const line = `[Gate: ${entry.title}] ${entry.content.slice(0, 160)}`;
        if (line.length <= charBudget) {
          sections.push(line);
          charBudget -= line.length;
        }
      }
    }
  }

  // If referral flags, include ring detection rules
  if (signals.hasReferralFlags && charBudget > 100) {
    const ringEntries = await searchKB(['referral', 'ring']);
    for (const entry of ringEntries.slice(0, 1)) {
      const line = `[Referral: ${entry.title}] ${entry.content.slice(0, 200)}`;
      if (line.length <= charBudget) {
        sections.push(line);
        charBudget -= line.length;
      }
    }
  }

  console.log(JSON.stringify({
    event: 'kb_context_built',
    durationMs: Date.now() - t0,
    sections: sections.length,
    charsUsed: MAX_CONTEXT_CHARS - charBudget,
  }));

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Write a pipeline intelligence entry to Supabase.
 * Fire-and-forget safe — never throws.
 */
export async function writeIntelligence(entry: IntelligenceEntry): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('intelligence_entries').insert({
      entry_type: entry.entry_type,
      entity_type: entry.entity_type || null,
      entity_id: entry.entity_id || null,
      summary: entry.summary,
      detail_json: entry.detail_json || null,
      severity: entry.severity || 'info',
      pipeline_source: entry.pipeline_source,
    });
  } catch {
    // Silent failure — never block a pipeline
  }
}
