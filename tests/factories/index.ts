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

export function fakeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    wallet_address: fakeWallet(),
    status: 'approved',
    sol_amount: parseFloat(faker.finance.amount({ min: 0.01, max: 0.2, dec: 4 })),
    receipt_storage_path: `receipts/${fakeWallet()}/${faker.string.uuid()}.jpg`,
    gas_station_city: faker.location.city(),
    gas_station_state: faker.location.state({ abbreviated: true }),
    receipt_total_usd: parseFloat(faker.finance.amount({ min: 20, max: 120, dec: 2 })),
    receipt_date: faker.date.recent({ days: 7 }).toISOString().split('T')[0],
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    updated_at: faker.date.recent({ days: 1 }).toISOString(),
    gates_passed: 10,
    rejection_reason: null,
    ...overrides,
  };
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
