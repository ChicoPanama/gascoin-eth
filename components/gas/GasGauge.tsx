import type { CSSProperties } from 'react';
import type { GasOriginalState, GasGameMode } from '@/lib/project-gas/game-state';
import styles from './gas-ui.module.css';

const MODE_COLOR: Record<GasGameMode, string> = {
  CRUISE: 'var(--gas-gauge-cruise)',
  BOOST: 'var(--gas-gauge-boost)',
  REDLINE: 'var(--gas-gauge-redline)',
};

function gaugePresentation(state: GasOriginalState) {
  if (state.phase === 'result') {
    return {
      stateLabel: state.result.outcome === 'win' ? 'SETTLED · WIN' : state.result.outcome === 'loss' ? 'SETTLED · LOSS' : 'SETTLED · PUSH',
      value: `${state.result.multiplier}×`,
      meta: `${state.result.payoutAmount} ${state.result.payoutAsset}`,
      color: state.result.outcome === 'win' ? 'var(--gas-gauge-result-win)' : state.result.outcome === 'loss' ? 'var(--gas-gauge-result-loss)' : 'var(--gas-gauge-neutral)',
      progress: state.result.outcome === 'win' ? '88%' : state.result.outcome === 'loss' ? '32%' : '58%',
    };
  }

  if (state.phase === 'failed') {
    return {
      stateLabel: 'RECONCILE',
      value: 'HOLD',
      meta: state.fundsMoved === 'no' ? 'SAFE STATE' : 'CHECKING WAGER',
      color: 'var(--gas-degraded)',
      progress: '46%',
    };
  }

  if (state.phase === 'resolving') {
    return { stateLabel: 'RESOLVING', value: 'LIVE', meta: state.wager.mode, color: MODE_COLOR[state.wager.mode], progress: '73%' };
  }

  if (state.phase === 'locked') {
    return { stateLabel: 'LOCKED', value: 'ON', meta: state.wager.mode, color: MODE_COLOR[state.wager.mode], progress: '66%' };
  }

  if (state.phase === 'committing' || state.phase === 'validating') {
    const mode = state.draft.mode;
    return { stateLabel: 'LOCKING', value: '•••', meta: mode, color: MODE_COLOR[mode], progress: '58%' };
  }

  return {
    stateLabel: 'READY',
    value: state.draft.mode,
    meta: 'CHOOSE AMOUNT · IGNITE',
    color: MODE_COLOR[state.draft.mode],
    progress: state.draft.mode === 'CRUISE' ? '47%' : state.draft.mode === 'BOOST' ? '68%' : '86%',
  };
}

export function GasGauge({ state }: { state: GasOriginalState }) {
  const view = gaugePresentation(state);
  const gaugeStyle = {
    '--gauge-color': view.color,
    '--gauge-progress': view.progress,
  } as CSSProperties;

  return (
    <div className={styles.gaugeWrap} aria-live="polite">
      <div className={styles.gauge} style={gaugeStyle}>
        <div className={styles.gaugeCenter}>
          <div className={styles.gaugeState}>{view.stateLabel}</div>
          <div className={styles.gaugeValue}>{view.value}</div>
          <div className={styles.gaugeMeta}>{view.meta}</div>
        </div>
      </div>
    </div>
  );
}
