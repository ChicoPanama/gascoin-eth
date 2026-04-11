/**
 * Obsidian Vault → Supabase Knowledge Base Sync
 *
 * Reads all .md files from ~/Documents/GASCOIN-Vault and upserts
 * them into the knowledge_base table. Run manually after editing vault notes.
 *
 * Usage: npm run sync:obsidian
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { readdir, readFile } from 'fs/promises';
import { join, relative, basename, extname } from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const VAULT_ROOT = join(process.env.HOME || '', 'Documents', 'GASCOIN-Vault');

const CATEGORY_MAP: Record<string, string> = {
  'Gates': 'gate_rule',
  'Architecture': 'architecture',
  'AI-Pipeline': 'pipeline',
  'Decisions': 'decision',
  'Security': 'policy',
  'Treasury': 'treasury',
  'Workers': 'architecture',
  'Referral-Engine': 'architecture',
  'Points-System': 'architecture',
  'Token-Tiers': 'policy',
  'Tests': 'testing',
  'Admin': 'architecture',
  'API-Routes': 'architecture',
  'Community': 'architecture',
  'Integrations': 'pipeline',
  'Supabase': 'architecture',
};

function slugify(filePath: string): string {
  const rel = relative(VAULT_ROOT, filePath);
  return rel
    .replace(extname(rel), '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-\/]/g, '')
    .toLowerCase();
}

function getCategory(filePath: string): string {
  const rel = relative(VAULT_ROOT, filePath);
  const folder = rel.split('/')[0] || '';
  return CATEGORY_MAP[folder] || 'architecture';
}

function extractTags(content: string): string[] {
  const tags: string[] = [];
  // Extract YAML frontmatter tags
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const tagLine = frontmatterMatch[1].match(/tags:\s*\[([^\]]*)\]/);
    if (tagLine) {
      tags.push(...tagLine[1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(Boolean));
    }
  }
  // Auto-tag based on content keywords
  const lower = content.toLowerCase();
  if (lower.includes('fraud') || lower.includes('tamper')) tags.push('fraud');
  if (lower.includes('referral') || lower.includes('ring')) tags.push('referral');
  if (lower.includes('payout') || lower.includes('treasury')) tags.push('treasury');
  if (lower.includes('gate') || lower.includes('threshold')) tags.push('gates');
  return [...new Set(tags)];
}

async function getMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getMarkdownFiles(fullPath));
    } else if (entry.isFile() && extname(entry.name) === '.md') {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Scanning vault: ${VAULT_ROOT}`);
  const files = await getMarkdownFiles(VAULT_ROOT);
  console.log(`Found ${files.length} markdown files`);

  let upserted = 0;
  let errors = 0;

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf-8');
    const slug = slugify(filePath);
    const title = basename(filePath, '.md');
    const category = getCategory(filePath);
    const tags = extractTags(content);
    const obsidianPath = relative(VAULT_ROOT, filePath);

    const { error } = await supabase.from('knowledge_base').upsert({
      slug,
      title,
      content,
      category,
      tags,
      source: 'obsidian',
      obsidian_path: obsidianPath,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slug' });

    if (error) {
      console.error(`  ERROR: ${obsidianPath} — ${error.message}`);
      errors++;
    } else {
      console.log(`  OK: ${obsidianPath} → ${category}/${slug}`);
      upserted++;
    }
  }

  console.log(`\nSync complete: ${upserted} upserted, ${errors} errors`);
}

main().catch(console.error);
