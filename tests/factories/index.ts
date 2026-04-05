import { faker } from '@faker-js/faker';

export function fakeWallet(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  return Array.from({ length: 44 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function fakeTweetUrl(): string {
  const handle = faker.internet.username().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) || 'user';
  const tweetId = faker.number.bigInt({ min: 1000000000000000000n }).toString();
  return `https://x.com/${handle}/status/${tweetId}`;
}

export function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    x_user_id: `x_${faker.string.alphanumeric(10)}`,
    x_handle: `@${faker.internet.username().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15)}`,
    x_verified: true,
    trust_score: 0,
    created_at: faker.date.recent({ days: 60 }).toISOString(),
    ...overrides,
  };
}

export function fakeClaim(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    wallet: fakeWallet(),
    tweet_url: fakeTweetUrl(),
    nonce: faker.string.uuid(),
    status: 'submitted',
    claimed_amount: parseFloat(faker.finance.amount({ min: 20, max: 120, dec: 2 })),
    parsed_amount: parseFloat(faker.finance.amount({ min: 20, max: 120, dec: 2 })),
    claim_currency: 'USD',
    risk_score: 0.1,
    decision_reason: null,
    created_at: faker.date.recent({ days: 7 }).toISOString(),
    updated_at: faker.date.recent({ days: 1 }).toISOString(),
    ...overrides,
  };
}

export function fakePayoutJob(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    claim_id: faker.string.uuid(),
    wallet: fakeWallet(),
    amount_sol: parseFloat(faker.finance.amount({ min: 0.01, max: 1.0, dec: 4 })),
    status: 'queued',
    attempts: 0,
    max_attempts: 5,
    next_retry_at: new Date().toISOString(),
    last_error: null,
    ...overrides,
  };
}

export function fakePayout(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    claim_id: faker.string.uuid(),
    wallet: fakeWallet(),
    amount_sol: parseFloat(faker.finance.amount({ min: 0.01, max: 1.0, dec: 4 })),
    tx_hash: faker.string.hexadecimal({ length: 64, casing: 'lower' }),
    status: 'paid',
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function fakeReferral(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    referrer_wallet: fakeWallet(),
    referred_wallet: fakeWallet(),
    status: 'pending',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function fakeAdminUser(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.number.int({ min: 1, max: 9999 }),
    x_user_id: `x_admin_${faker.string.alphanumeric(8)}`,
    x_handle: `@admin_${faker.string.alphanumeric(6)}`,
    role: 'reviewer',
    active: true,
    ...overrides,
  };
}

export function fakeSubmission(overrides: Record<string, unknown> = {}) {
  return fakeClaim({ status: 'approved', ...overrides });
}

export function fakeLeaderboardEntry(overrides: Record<string, unknown> = {}) {
  return {
    wallet_address: fakeWallet(),
    total_submissions: faker.number.int({ min: 1, max: 50 }),
    total_sol_earned: parseFloat(faker.finance.amount({ min: 0.05, max: 10, dec: 4 })),
    last_submission_at: faker.date.recent({ days: 7 }).toISOString(),
    rank: faker.number.int({ min: 1, max: 100 }),
    ...overrides,
  };
}

export function fakeReceiptBuffer(): Buffer {
  // Minimal valid JPEG with EXIF markers for pipeline testing
  const header = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x1C,
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x4D, 0x4D, 0x00, 0x2A, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x01, 0x01, 0x10, 0x00, 0x03,
    0x00, 0x00, 0x00, 0x01, 0x0C, 0x80, 0x00, 0x00,
  ]);
  const body = Buffer.alloc(1024);
  body[0] = 0xFF; body[1] = 0xC0; body[2] = 0x00; body[3] = 0x0B; body[4] = 0x08;
  body[5] = 0x0C; body[6] = 0x80; body[7] = 0x09; body[8] = 0x60;
  for (let i = 9; i < 1024; i++) body[i] = (i * 37 + 127) & 0xFF;
  return Buffer.concat([header, body, Buffer.from([0xFF, 0xD9])]);
}
