import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd());
const required = [
  'app/page.tsx',
  'app/submit/page.tsx',
  'app/community/page.tsx',
  'app/dashboard/page.tsx',
  'app/admin/page.tsx',
  'app/api/claims/submit/route.ts',
  'app/api/admin/queue/route.ts',
  'app/api/public/claims/route.ts',
  'app/api/public/treasury/route.ts',
  'app/api/public/market/route.ts',
  'app/api/public/gas-prices/route.ts',
  'lib/policy.ts',
  'db/schema.sql',
  'lib/integrations/privy.ts',
  'lib/integrations/x.ts',
  'lib/integrations/ocr.ts',
  'lib/integrations/fraud.ts',
  'lib/integrations/pricing.ts',
  'lib/integrations/solana.ts',
  'app/api/auth/session/route.ts',
  'app/api/workers/process-claims/route.ts',
  'app/api/workers/payout/route.ts',
  'app/api/claims/[id]/review/route.ts',
  'lib/supabase.ts',
  'lib/idempotency.ts',
  'lib/payout-worker.ts',
  'lib/reviewer-auth.ts',
  'lib/rate-limit.ts'
];

const missing = required.filter(f => !fs.existsSync(path.join(root, f)));
const policy = fs.readFileSync(path.join(root, 'lib/policy.ts'), 'utf8');
const checks = {
  hasGascoinTweetGate: policy.includes('tweet_hashtag') && policy.includes('#gascoin'),
  hasGascoinReceiptGate: policy.includes('receipt_hashtag'),
  hasWalletReceiptMatch: policy.includes('wallet_match'),
  hasOneDollarGate: policy.includes('>=1') || policy.includes('>= 1'),
  hasAiTamperChecks: policy.includes('ai_image_check') && policy.includes('tamper_check')
};

const payoutWorker = fs.readFileSync(path.join(root, 'app/api/workers/payout/route.ts'), 'utf8');
const payoutLib = fs.readFileSync(path.join(root, 'lib/payout-worker.ts'), 'utf8');
const claimsWorker = fs.readFileSync(path.join(root, 'app/api/workers/process-claims/route.ts'), 'utf8');
const submitRoute = fs.readFileSync(path.join(root, 'app/api/claims/submit/route.ts'), 'utf8');
const reviewRoute = fs.readFileSync(path.join(root, 'app/api/claims/[id]/review/route.ts'), 'utf8');
const reviewerAuth = fs.readFileSync(path.join(root, 'lib/reviewer-auth.ts'), 'utf8');
const rateLimitLib = fs.readFileSync(path.join(root, 'lib/rate-limit.ts'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'db/schema.sql'), 'utf8');
const phase2Checks = {
  hasPrePayoutMinGascoinCheck: payoutLib.includes('hasMinimumGascoinUsd') && payoutLib.includes('min_gascoin_not_met'),
  hasPayoutSenderHook: payoutLib.includes('sendEthPayout'),
  persistsClaimsToSupabase: submitRoute.includes("from('claims')") && submitRoute.includes('.insert({') && submitRoute.includes("from('gate_results')"),
  persistsReceiptHashes: submitRoute.includes('hash_sha256') && submitRoute.includes('phash'),
  hasReviewActions: reviewRoute.includes('claim_approve') || (reviewRoute.includes('claim_') && reviewRoute.includes('ban')),
  hasImmutableAuditGuard: schema.includes('prevent_audit_log_mutation'),
  hasSubmitRateLimit: submitRoute.includes('rate_limited') && submitRoute.includes('SUBMIT_MAX_PER_WINDOW'),
  uploadsReceiptsToStorage: submitRoute.includes(".storage") && submitRoute.includes("receipts-private") && submitRoute.includes('receipt_upload_failed'),
  hasReviewerAuthGuard: reviewRoute.includes('unauthorized_reviewer') && reviewerAuth.includes("from('admin_users')"),
  hasRlsEnabled: schema.includes('enable row level security'),
  hasSubmitIdempotency: submitRoute.includes("scope', 'claim_submit") && submitRoute.includes('idempotency_key_reused_with_different_payload'),
  hasPayoutIdempotency: payoutWorker.includes("scope', 'payout_request") && payoutWorker.includes('idempotency_key_reused_with_different_payload'),
  hasPayoutRetryQueue: schema.includes('payout_jobs') && payoutLib.includes('retry_scheduled'),
  hasStrictXMode: submitRoute.includes('verifyTweetProof') && fs.readFileSync(path.join(root, 'lib/integrations/x.ts'), 'utf8').includes('X_STRICT_MODE'),
  hasClaimsWorkerPayoutProcessing: claimsWorker.includes('processQueuedPayout')
  ,hasDistributedRateLimitPath: submitRoute.includes('checkRateLimit') && rateLimitLib.includes('UPSTASH_REDIS_REST_URL')
};

const pass = missing.length === 0 && Object.values(checks).every(Boolean) && Object.values(phase2Checks).every(Boolean);
const report = { pass, missing, checks, phase2Checks, timestamp: new Date().toISOString() };

fs.writeFileSync(path.join(root, 'POST_AUDIT_REPORT.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!pass) process.exit(1);
