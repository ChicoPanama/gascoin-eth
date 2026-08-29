import type { CSSProperties } from 'react';
import type { GasOriginalState, GasGameMode } from '@/lib/project-gas/game-state';
import styles from './gas-ui.module.css';
import local from './GasOriginalPrototype.module.css';

const MODE_COLOR: Record<GasGameMode, string> = {
  CRUISE: 'var(--gas-gauge-cruise)',
  BOOST: 'var(--gas-gauge-boost)',
  REDLINE: 'var(--gas-gauge-redline)',
};

const MODE_ANGLE: Record<GasGameMode, string> = {
  CRUISE: '-42deg',
  BOOST: '8deg',
  REDLINE: '54deg',
};

function gaugePresentation(state: GasOriginalState) {
  if (state.phase === 'result') {
    return {
      stateLabel: state.result.outcome === 'win' ? 'SETTLED · WIN' : state.result.outcome === 'loss' ? 'SETTLED · LOSS' : 'SETTLED · PUSH',
      value: `${state.result.multiplier}×`,
      meta: `${state.result.payoutAmount} ${state.result.payoutAsset}`,
      color: state.result.outcome === 'win' ? 'var(--gas-gauge-result-win)' : state.result.outcome === 'loss' ? 'var(--gas-gauge-result-loss)' : 'var(--gas-gauge-neutral)',
      progress: state.result.outcome === 'win' ? '88%' : state.result.outcome === 'loss' ? '32%' : '58%',
      angle: state.result.outcome === 'win' ? '62deg' : state.result.outcome === 'loss' ? '-52deg' : '0deg',
      mode: state.wager.mode,
      active: false,
    };
  }

  if (state.phase === 'failed') {
    return {
      stateLabel: 'RECONCILE',
      value: 'HOLD',
      meta: state.fundsMoved === 'no' ? 'SAFE STATE' : 'CHECKING WAGER',
      color: 'var(--gas-degraded)',
      progress: '46%',
      angle: '-10deg',
      mode: state.wager?.mode ?? state.draft?.mode ?? 'BOOST',
      active: false,
    };
  }

  if (state.phase === 'resolving') {
    return { stateLabel: 'RANDOMNESS PENDING', value: 'LIVE', meta: state.wager.mode, color: MODE_COLOR[state.wager.mode], progress: '73%', angle: MODE_ANGLE[state.wager.mode], mode: state.wager.mode, active: true };
  }

  if (state.phase === 'locked') {
    return { stateLabel: 'ACKNOWLEDGED', value: 'ON', meta: state.wager.mode, color: MODE_COLOR[state.wager.mode], progress: '66%', angle: MODE_ANGLE[state.wager.mode], mode: state.wager.mode, active: true };
  }

  if (state.phase === 'committing' || state.phase === 'validating') {
    const mode = state.draft.mode;
    return { stateLabel: 'SUBMITTED', value: '•••', meta: mode, color: MODE_COLOR[mode], progress: '58%', angle: MODE_ANGLE[mode], mode, active: true };
  }

  return {
    stateLabel: 'READY',
    value: state.draft.mode,
    meta: 'CHOOSE AMOUNT · IGNITE',
    color: MODE_COLOR[state.draft.mode],
    progress: state.draft.mode === 'CRUISE' ? '47%' : state.draft.mode === 'BOOST' ? '68%' : '86%',
    angle: MODE_ANGLE[state.draft.mode],
    mode: state.draft.mode,
    active: false,
  };
}

export function GasGauge({ state, compact = false }: { state: GasOriginalState; compact?: boolean }) {
  const view = gaugePresentation(state);
  const gaugeStyle = {
    '--gauge-color': view.color,
    '--gauge-progress': view.progress,
    '--gauge-angle': view.angle,
  } as CSSProperties;

  return (
    <div
      className={`${styles.gaugeWrap} ${compact ? local.compactGaugeWrap : ''}`}
      aria-label={`${view.stateLabel}. ${view.value}. ${view.meta}.`}
      aria-live="polite"
      role="status"
    >
      <div
        className={`${styles.gauge} ${compact ? local.compactGauge : ''}`}
        style={gaugeStyle}
        data-mode={view.mode.toLowerCase()}
        data-phase={state.phase}
        data-active={view.active ? 'true' : 'false'}
        aria-hidden="true"
      >
        <span className={styles.gaugeNeedle} />
        <div className={styles.gaugeCenter}>
          <div className={styles.gaugeState}>{view.stateLabel}</div>
          <div className={styles.gaugeValue}>{view.value}</div>
          <div className={styles.gaugeMeta}>{view.meta}</div>
        </div>
      </div>
    </div>
  );
}
