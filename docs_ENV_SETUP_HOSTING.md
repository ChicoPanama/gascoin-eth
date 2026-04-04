# Hosting Env Setup (Item #2)

## What I prepared
- Production env template: `.env.production.example`
- Env validator script: `scripts/check-prod-env.mjs`

## Current local status
Run:
```bash
node scripts/check-prod-env.mjs .env.local
```
Missing right now:
- NEXT_PUBLIC_PRIVY_APP_ID
- PRIVY_APP_SECRET
- X_BEARER_TOKEN
- X_STRICT_MODE
- SOLANA_RPC_URL
- GASCOIN_MINT
- GASCOIN_TREASURY_WALLET
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

## Vercel setup commands
From `GASCOIN/platform`:
```bash
vercel link
```
Then set envs (production):
```bash
vercel env add NEXT_PUBLIC_BASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_PRIVY_APP_ID production
vercel env add PRIVY_APP_SECRET production
vercel env add X_BEARER_TOKEN production
vercel env add X_STRICT_MODE production
vercel env add SOLANA_RPC_URL production
vercel env add GASCOIN_MINT production
vercel env add GASCOIN_TREASURY_WALLET production
vercel env add ENABLE_LIVE_PAYOUT production
vercel env add TREASURY_PRIVATE_KEY_B58 production
vercel env add REVIEWER_API_TOKEN production
vercel env add NEXT_PUBLIC_REVIEWER_TOKEN production
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

## Note from this session
Direct `vercel projects ls` was blocked by CLI scope authorization mismatch in this environment, so I prepared validated setup artifacts and exact commands. Once link/auth is fixed, run the commands above and deploy.
