import { formatUnits, type Address } from 'viem';

export type ProjectGasReadStatus = 'loading' | 'ready' | 'stale' | 'degraded' | 'unavailable';
export type ProjectGasAssetSymbol = 'GAS' | 'USDC';

export interface ProjectGasIdentityState {
  status: ProjectGasReadStatus;
  authority: 'privy' | 'unavailable';
  userId?: string;
  label?: string;
  message?: string;
}

export interface ProjectGasWalletRelationship {
  address: Address;
  clientType: string;
  kind: 'embedded' | 'external';
  active: boolean;
}

export interface ProjectGasActiveWalletState {
  status: ProjectGasReadStatus;
  authority: 'privy-wagmi' | 'unavailable';
  address?: Address;
  chainId?: number;
  message?: string;
}

export interface ProjectGasAssetBalanceState {
  asset: ProjectGasAssetSymbol;
  status: ProjectGasReadStatus;
  authority: 'wallet-chain' | 'unavailable';
  chainId: number;
  contractAddress?: Address;
  amount?: string;
  rawAmount?: string;
  decimals?: number;
  updatedAt?: string;
  message?: string;
}

export interface ProjectGasUnavailableMoneyState {
  status: 'unavailable';
  authority: 'unavailable';
  message: string;
}

export interface ProjectGasAccountReadModel {
  version: 1;
  identity: ProjectGasIdentityState;
  activeWallet: ProjectGasActiveWalletState;
  wallets: readonly ProjectGasWalletRelationship[];
  spendable: {
    gas: ProjectGasAssetBalanceState;
    usdc: ProjectGasAssetBalanceState;
  };
  lockedWagers: ProjectGasUnavailableMoneyState;
  pendingActions: ProjectGasUnavailableMoneyState;
}

export interface BuildAssetBalanceInput {
  asset: ProjectGasAssetSymbol;
  chainId: number;
  contractAddress?: Address;
  walletAddress?: Address;
  walletChainId?: number;
  readStatus: 'idle' | 'pending' | 'success' | 'error';
  rawAmount?: bigint;
  decimals?: number;
  updatedAtMs?: number;
  stale?: boolean;
  errorMessage?: string;
  chainEnabled: boolean;
}

function validDecimals(value: number | undefined): value is number {
  return Number.isInteger(value) && value !== undefined && value >= 0 && value <= 255;
}

export function buildProjectGasAssetBalance(input: BuildAssetBalanceInput): ProjectGasAssetBalanceState {
  const base = {
    asset: input.asset,
    chainId: input.chainId,
    contractAddress: input.contractAddress,
  } as const;

  if (!input.contractAddress) {
    return {
      ...base,
      status: 'unavailable',
      authority: 'unavailable',
      message: `${input.asset} contract is not configured for Project GAS.`,
    };
  }

  if (!input.chainEnabled) {
    return {
      ...base,
      status: 'unavailable',
      authority: 'unavailable',
      message: `Configured Project GAS chain ${input.chainId} is not enabled in this build.`,
    };
  }

  if (!input.walletAddress) {
    return {
      ...base,
      status: 'unavailable',
      authority: 'unavailable',
      message: 'Connect or activate a wallet to read spendable balance.',
    };
  }

  if (input.walletChainId !== input.chainId) {
    return {
      ...base,
      status: 'degraded',
      authority: 'wallet-chain',
      message: `Active wallet is not on the configured Project GAS chain (${input.chainId}).`,
    };
  }

  if (input.readStatus === 'pending' || input.readStatus === 'idle') {
    return {
      ...base,
      status: 'loading',
      authority: 'wallet-chain',
      message: `Reading ${input.asset} from the active wallet.`,
    };
  }

  if (input.readStatus === 'error') {
    return {
      ...base,
      status: 'degraded',
      authority: 'wallet-chain',
      message: input.errorMessage || `${input.asset} balance could not be read from the configured contract.`,
    };
  }

  if (typeof input.rawAmount !== 'bigint' || !validDecimals(input.decimals)) {
    return {
      ...base,
      status: 'degraded',
      authority: 'wallet-chain',
      message: `${input.asset} balance response was incomplete.`,
    };
  }

  return {
    ...base,
    status: input.stale ? 'stale' : 'ready',
    authority: 'wallet-chain',
    amount: formatUnits(input.rawAmount, input.decimals),
    rawAmount: input.rawAmount.toString(),
    decimals: input.decimals,
    updatedAt: input.updatedAtMs ? new Date(input.updatedAtMs).toISOString() : undefined,
    message: input.stale ? `${input.asset} balance is cached and may be stale.` : undefined,
  };
}

export function hasAuthoritativeSpendableBalance(state: ProjectGasAssetBalanceState): boolean {
  return state.authority === 'wallet-chain' && (state.status === 'ready' || state.status === 'stale') && state.amount !== undefined;
}

export function formatProjectGasBalanceForDisplay(state: ProjectGasAssetBalanceState, maximumFractionDigits = 4): string {
  if (!hasAuthoritativeSpendableBalance(state) || state.amount === undefined) return `— ${state.asset}`;

  const numeric = Number(state.amount);
  if (!Number.isFinite(numeric)) return `${state.amount} ${state.asset}`;

  return `${numeric.toLocaleString(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  })} ${state.asset}`;
}

export function projectGasAccountAuthorityLabel(model: ProjectGasAccountReadModel): string {
  const balances = [model.spendable.gas, model.spendable.usdc];
  if (balances.some((balance) => balance.status === 'loading')) return 'Reading wallet';
  if (balances.some((balance) => balance.status === 'degraded')) return 'Check wallet state';
  if (balances.some((balance) => hasAuthoritativeSpendableBalance(balance))) return 'Wallet state';
  if (model.identity.status === 'ready') return 'Account ready';
  if (model.identity.status === 'loading') return 'Account loading';
  return 'Not connected';
}
