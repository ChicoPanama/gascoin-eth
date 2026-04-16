import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { verifyAllTweetGates } from '../../../../lib/gate-verifiers/tweet-gates';
import { parseTweetUrl } from '../../../../lib/tweet-parser';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { getClientIp } from '../../../../lib/ip';

export async function POST(req: NextRequest) {
  // Rate limit: 5 verifications per minute per IP (protects X API quota)
  const rl = await checkRateLimit(`verify_tweet:${getClientIp(req)}`, 5, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited', retryAfterSec: rl.resetSec }, { status: 429 });
  }

  try {
    const { tweet_url, claim_id } = await req.json();

    if (!tweet_url) return NextResponse.json({ error: 'Missing tweet_url' }, { status: 400 });

    const parsed = parseTweetUrl(tweet_url);
    if (!parsed.isValid) return NextResponse.json({ error: 'Invalid tweet URL format' }, { status: 400 });

    const results = await verifyAllTweetGates(tweet_url);

    // Write results to gate_results if claim_id provided
    if (claim_id) {
      const supabase = getSupabaseAdmin();
      for (const r of results) {
        await supabase.from('gate_results').upsert({
          claim_id,
          gate_name: `tweet_gate_${r.gate_id}`,
          passed: r.passed,
          reason_code: r.failure_reason,
          score: r.duration_ms,
        }, { onConflict: 'claim_id,gate_name' });
        if (!r.passed) break;
      }
    }

    const allPassed = results.every((r) => r.passed);
    const last = results[results.length - 1];

    return NextResponse.json({
      passed: allPassed,
      results,
      failed_gate: allPassed ? null : last.gate_id,
      failure_reason: allPassed ? null : last.failure_reason,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'verification_failed' }, { status: 500 });
  }
}
