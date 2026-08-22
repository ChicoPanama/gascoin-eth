import {
  parseReconcileGameIntentResult,
  parseResolveGameRoundResult,
  parseSubmitGameIntentResult,
  type CreateGameIntentInput,
  type GasOriginalAdapter,
  type ReconcileGameIntentResult,
  type ResolveGameRoundResult,
  type SubmitGameIntentResult,
} from './game-adapter';
import type { CommittedWager } from './game-state';

type AccessTokenReader = () => Promise<string | null>;

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json() as unknown;
  } catch {
    return undefined;
  }
}

export function createProjectGasGameHttpAdapter(getAccessToken: AccessTokenReader): GasOriginalAdapter {
  return {
    descriptor: {
      authority: 'backend',
      label: 'Authoritative Base execution',
      movesFunds: true,
      liveRng: true,
      verification: 'canonical',
    },

    async submitIntent(input: CreateGameIntentInput): Promise<SubmitGameIntentResult> {
      let token: string | null;
      try {
        token = await getAccessToken();
      } catch {
        token = null;
      }
      if (!token) {
        return {
          status: 'rejected',
          intentId: input.intentId,
          code: 'authorization-required',
          message: 'Sign in again before submitting this wager.',
          retrySafe: true,
          fundsMoved: false,
        };
      }

      try {
        const response = await fetch('/api/project-gas/game/intents', {
          method: 'POST',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': input.intentId,
          },
          body: JSON.stringify(input),
        });
        const parsed = parseSubmitGameIntentResult(await responseJson(response), input.intentId);
        if (parsed) return parsed;
      } catch {
        // A browser network error does not prove the POST missed the source.
      }

      return {
        status: 'unknown',
        intentId: input.intentId,
        message: 'The wager response is unknown. Check status before retrying.',
        fundsMoved: 'unknown',
      };
    },

    async reconcileIntent(intentId: string): Promise<ReconcileGameIntentResult> {
      let token: string | null;
      try {
        token = await getAccessToken();
      } catch {
        token = null;
      }
      if (!token) {
        return {
          status: 'unknown',
          intentId,
          retrySafe: false,
          message: 'Sign in again to reconcile this wager.',
        };
      }

      try {
        const response = await fetch(`/api/project-gas/game/intents/${encodeURIComponent(intentId)}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Authorization: `Bearer ${token}` },
        });
        const parsed = parseReconcileGameIntentResult(await responseJson(response), intentId);
        if (parsed) return parsed;
      } catch {
        // The existing intent remains the only safe recovery target.
      }

      return {
        status: 'unknown',
        intentId,
        retrySafe: false,
        message: 'The wager status could not be reconciled. Do not resubmit.',
      };
    },

    async resolveRound(wager: CommittedWager): Promise<ResolveGameRoundResult> {
      try {
        const params = new URLSearchParams({ intentId: wager.requestId });
        const response = await fetch(
          `/api/project-gas/game/rounds/${encodeURIComponent(wager.roundId)}?${params.toString()}`,
          { method: 'GET', cache: 'no-store', credentials: 'same-origin' },
        );
        const parsed = parseResolveGameRoundResult(await responseJson(response), wager.requestId, wager.roundId);
        if (parsed) return parsed;
      } catch {
        // A committed wager must remain in recovery instead of being replaced.
      }

      return {
        status: 'failed',
        intentId: wager.requestId,
        roundId: wager.roundId,
        code: 'network-degraded',
        message: 'Round state could not be reconciled. Do not submit a replacement wager.',
      };
    },
  };
}
