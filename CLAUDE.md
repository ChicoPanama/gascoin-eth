# GASCOIN Platform — Claude Code Context

## Project
GASCOIN is an Ethereum-based community gas refund protocol. Users buy gas, post proof on X, submit receipts, and receive ETH refunds.

## Stack
- **Frontend**: Next.js 16 (App Router), deployed on Vercel
- **Database**: Supabase (PostgreSQL + Storage)
- **Blockchain**: Ethereum (Alchemy RPC, viem), GASCOIN ERC-20 token
- **Auth**: Privy (X/Twitter OAuth + wallet linking)
- **AI Engines**: Gemini Vision (OCR), Grok/xAI (reasoning), Claude (oversight)
- **Cache**: Upstash Redis (mature-dingo-96190)
- **APIs**: X API v2, OpenRouter, Anthropic, xAI

## Memory (mem0)

### Session Start
Always call search_memories with "GASCOIN" at the start of every session before asking me anything.

### Save memories when you learn:
- Smart contract addresses or program IDs
- Ethereum contract structure or ABI layouts
- Vercel deployment config or env var names
- Supabase schema changes or table structures
- Treasury dashboard logic or leaderboard rules
- Submission portal validation gate details (all 12 gates)
- X/Twitter API integration specifics
- Test suite state (Vitest, current pass rate)
- Any bug root causes or fixes
- Any decisions I make on tokenomics, referral engine, or admin dashboard
- AI engine configuration (models, thresholds, scoring weights)
- Redis cache keys and TTLs
- Cron job schedules and worker logic

### Update memories when:
- A contract is redeployed
- Schema changes
- A gate rule changes
- A prior fix gets refactored
- Token tier thresholds change
- New AI engines are added or swapped

When in doubt, save it.

## Key Architecture

```
Gemini Vision (sees) → Grok (thinks) → Claude (decides) → ETH Payout

12 automated gates · 5 verification layers · 225 stress tests
Token tiers: Standard(1) · Commuter(100K) · Road Warrior(5M) · Fleet(10M)
Cooldowns: 7d · 7d · 3.5d · 1.75d
```

## Testing
- Framework: Vitest
- Test files: 12
- Total tests: 225
- Run: `npx vitest run`
- Build: `npx next build`
