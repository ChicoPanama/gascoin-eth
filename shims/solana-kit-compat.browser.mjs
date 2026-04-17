// Compat shim: re-exports @solana/kit@2.3.0 and adds sequentialInstructionPlan
// which was removed in 2.3.0 but is still imported by @solana-program/token@0.9.0.
// Physical path avoids circular alias resolution.
export * from '../node_modules/.pnpm/@solana+kit@2.3.0_fastestsmallesttextencoderdecoder@1.0.22_typescript@5.9.3_ws@8.20.0_b_3a6cb9dc4ea59b87e3a7294f5fbcb76c/node_modules/@solana/kit/dist/index.browser.mjs';
export function sequentialInstructionPlan(plans) { return plans; }
