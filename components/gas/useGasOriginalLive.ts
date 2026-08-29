'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  parseCreateGameIntentInput,
  parseSubmitGameIntentResult,
  createGameIntentId,
  type AcceptedGameIntent,
  type CreateGameIntentInput,
} from '@/lib/project-gas/game-adapter';
import { createProjectGasGameHttpAdapter } from '@/lib/project-gas/game-http-adapter';
import {
  beginCommit,
  beginResolution,
  beginValidation,
  canBlindRetry,
  canIgnite,
  createReadyState,
  failAfterLock,
  failBeforeSubmission,
  failRejectedSubmission,
  failUnknownSubmission,
  isActionPending,
  lockWager,
  repeatSameConfiguration,
  resolveRound,
  updateReadyDraft,
  type CommittedWager,
  type GasGameMode,
  type GasOriginalState,
  type PresentationMode,
  type ReadyState,
  type WagerDraft,
} from '@/lib/project-gas/game-state';

const STORAGE_KEY = 'project-gas:pending-game-intent:v1';
const ROUND_POLL_MS = 2_000;

interface PersistedGameOperation {
  version: 1;
  intent: CreateGameIntentInput;
  accepted?: AcceptedGameIntent;
}

function readPersistedOperation(): PersistedGameOperation | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Record<string, unknown>;
    const intent = parseCreateGameIntentInput(value.intent);
    if (value.version !== 1 || !intent) return undefined;
    if (value.accepted === undefined) return { version: 1, intent };

    const accepted = parseSubmitGameIntentResult(value.accepted, intent.intentId);
    return accepted?.status === 'accepted'
      ? { version: 1, intent, accepted }
      : undefined;
  } catch {
    return undefined;
  }
}

function persistOperation(operation: PersistedGameOperation) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(operation));
  } catch {
    // The in-memory operation remains authoritative for this tab. If storage is
    // unavailable, ambiguous state still never becomes a blind retry.
  }
}

function clearPersistedOperation() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else should be submitted from the current state machine anyway.
  }
}

function draftForState(state: GasOriginalState): WagerDraft {
  if (state.phase === 'ready' || state.phase === 'validating' || state.phase === 'committing') return state.draft;
  if (state.phase === 'locked' || state.phase === 'resolving' || state.phase === 'result') return state.wager;
  if (state.draft) return state.draft;
  if (state.wager) return state.wager;
  return createReadyState().draft;
}

function resultDelta(state: Extract<GasOriginalState, { phase: 'result' }>) {
  const wager = Number(state.wager.wagerAmount);
  const payout = Number(state.result.payoutAmount);
  const delta = payout - wager;
  if (!Number.isFinite(delta)) return '—';
  return `${delta > 0 ? '+' : ''}${delta.toFixed(2)} GAS`;
}

export function useGasOriginalLive(enabled: boolean) {
  const { getAccessToken } = usePrivy();
  const getAccessTokenRef = useRef(getAccessToken);
  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  }, [getAccessToken]);
  const adapter = useMemo(
    () => createProjectGasGameHttpAdapter(() => getAccessTokenRef.current()),
    [],
  );
  const [state, setState] = useState<GasOriginalState>(() => createReadyState());
  const [presentation, setPresentation] = useState<PresentationMode>('cinematic');
  const [copyLabel, setCopyLabel] = useState('Copy result');
  const mounted = useRef(true);
  const operationVersion = useRef(0);
  const activeIntent = useRef<CreateGameIntentInput | undefined>(undefined);
  const timers = useRef(new Set<number>());

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  const schedule = useCallback((callback: () => void, delayMs: number) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delayMs);
    timers.current.add(timer);
  }, []);

  const pollCommittedWager = useCallback((wager: CommittedWager, version: number) => {
    const poll = async () => {
      const round = await adapter.resolveRound(wager);
      if (!mounted.current || version !== operationVersion.current) return;

      if (round.status === 'settled') {
        clearPersistedOperation();
        activeIntent.current = undefined;
        setState(resolveRound(beginResolution({ phase: 'locked', wager }), round.result));
        return;
      }
      if (round.status === 'failed') {
        setState(failAfterLock(beginResolution({ phase: 'locked', wager }), round.code, round.message));
        return;
      }

      setState(beginResolution({ phase: 'locked', wager }));
      schedule(() => { void poll(); }, ROUND_POLL_MS);
    };

    void poll();
  }, [adapter, schedule]);

  const acceptIntent = useCallback((
    input: CreateGameIntentInput,
    accepted: AcceptedGameIntent,
    version: number,
  ) => {
    const committing = beginCommit(
      beginValidation(createReadyState(input.wager)),
      input.intentId,
      input.createdAt,
      input.expiresAt,
    );
    const locked = lockWager(committing, {
      roundId: accepted.roundId,
      submittedAt: accepted.acceptedAt,
      wagerAmount: accepted.wagerAmount,
      txHash: accepted.txHash,
    });

    persistOperation({ version: 1, intent: input, accepted });
    setState(beginResolution(locked));
    pollCommittedWager(locked.wager, version);
  }, [pollCommittedWager]);

  const reconcileIntent = useCallback(async (input: CreateGameIntentInput, version: number) => {
    activeIntent.current = input;
    const committing = beginCommit(
      beginValidation(createReadyState(input.wager)),
      input.intentId,
      input.createdAt,
      input.expiresAt,
    );
    setState(failUnknownSubmission(committing, 'Checking the authoritative wager status. Do not resubmit.'));

    const reconciled = await adapter.reconcileIntent(input.intentId);
    if (!mounted.current || version !== operationVersion.current) return;

    if (reconciled.status === 'accepted') {
      acceptIntent(input, reconciled.intent, version);
      return;
    }
    if (reconciled.status === 'not-found') {
      clearPersistedOperation();
      activeIntent.current = undefined;
      setState(failRejectedSubmission(committing, 'transaction-failed', reconciled.message));
      return;
    }
    setState(failUnknownSubmission(committing, reconciled.message));
  }, [acceptIntent, adapter]);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return () => { mounted.current = false; };

    const pending = readPersistedOperation();
    if (pending) {
      activeIntent.current = pending.intent;
      operationVersion.current += 1;
      const version = operationVersion.current;
      if (pending.accepted) acceptIntent(pending.intent, pending.accepted, version);
      else void reconcileIntent(pending.intent, version);
    }

    return () => {
      mounted.current = false;
      operationVersion.current += 1;
      clearTimers();
    };
  }, [acceptIntent, clearTimers, enabled, reconcileIntent]);

  const startRound = useCallback(async (readyState: ReadyState) => {
    if (!canIgnite(readyState)) {
      setState(failBeforeSubmission(readyState.draft, 'validation-failed', 'Enter a USDC amount greater than zero.'));
      return;
    }

    clearTimers();
    operationVersion.current += 1;
    const version = operationVersion.current;
    const createdAt = new Date();
    const input: CreateGameIntentInput = {
      intentId: createGameIntentId(),
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 90_000).toISOString(),
      wager: { ...readyState.draft },
    };
    const validating = beginValidation(readyState);
    const committing = beginCommit(validating, input.intentId, input.createdAt, input.expiresAt);

    activeIntent.current = input;
    setState(validating);
    persistOperation({ version: 1, intent: input });
    setState(committing);

    const submitted = await adapter.submitIntent(input);
    if (!mounted.current || version !== operationVersion.current) return;

    if (submitted.status === 'accepted') {
      acceptIntent(input, submitted, version);
      return;
    }
    if (submitted.status === 'rejected') {
      clearPersistedOperation();
      activeIntent.current = undefined;
      setState(failRejectedSubmission(committing, submitted.code, submitted.message));
      return;
    }
    setState(failUnknownSubmission(committing, submitted.message));
  }, [acceptIntent, adapter, clearTimers]);

  const handlePrimary = useCallback(() => {
    if (state.phase === 'ready') {
      void startRound(state);
      return;
    }
    if (state.phase === 'result') {
      void startRound(repeatSameConfiguration(state));
      return;
    }
    if (state.phase === 'failed' && canBlindRetry(state)) {
      void startRound(createReadyState(state.draft));
      return;
    }
    if (state.phase === 'failed' && state.wager) {
      clearTimers();
      operationVersion.current += 1;
      setState(beginResolution({ phase: 'locked', wager: state.wager }));
      pollCommittedWager(state.wager, operationVersion.current);
      return;
    }
    if (state.phase === 'failed') {
      const input = activeIntent.current ?? readPersistedOperation()?.intent;
      if (input) {
        clearTimers();
        operationVersion.current += 1;
        void reconcileIntent(input, operationVersion.current);
      }
    }
  }, [clearTimers, pollCommittedWager, reconcileIntent, startRound, state]);

  const updateDraft = useCallback((patch: Partial<Pick<WagerDraft, 'mode' | 'entryAmount'>>) => {
    setState((current) => {
      if (current.phase === 'ready') return updateReadyDraft(current, patch);
      if (current.phase === 'result') return updateReadyDraft(repeatSameConfiguration(current), patch);
      if (current.phase === 'failed' && canBlindRetry(current)) {
        return updateReadyDraft(createReadyState(current.draft), patch);
      }
      return current;
    });
  }, []);

  const copyLiveResult = useCallback(async () => {
    if (state.phase !== 'result') return;
    const text = `GAS Original — ${state.wager.mode} · ${state.result.outcome.toUpperCase()} · ${state.result.multiplier}× · ${state.result.verificationHref}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel('Copied');
      schedule(() => setCopyLabel('Copy result'), 1_400);
    } catch {
      setCopyLabel('Copy unavailable');
    }
  }, [schedule, state]);

  const draft = draftForState(state);
  const pending = isActionPending(state);
  const editable = state.phase === 'ready'
    || state.phase === 'result'
    || (state.phase === 'failed' && canBlindRetry(state));
  const primaryDisabled = pending;
  const primaryLabel = state.phase === 'result'
    ? 'IGNITION AGAIN'
    : state.phase === 'failed'
      ? canBlindRetry(state) ? 'TRY AGAIN' : 'CHECK STATUS'
      : state.phase === 'ready'
        ? 'IGNITION'
        : state.phase === 'resolving'
          ? 'RESOLVING'
          : 'LOCKING';

  return {
    state,
    draft,
    pending,
    editable,
    primaryDisabled,
    primaryLabel,
    presentation,
    setPresentation,
    copyLabel,
    copyPrototypeResult: copyLiveResult,
    resultDelta: state.phase === 'result' ? resultDelta(state) : null,
    handlePrimary,
    handleModeChange: (mode: GasGameMode) => updateDraft({ mode }),
    handleAmountChange: (entryAmount: string) => updateDraft({ entryAmount }),
  };
}
