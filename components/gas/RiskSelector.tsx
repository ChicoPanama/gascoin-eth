import type { CSSProperties } from 'react';
import type { GasGameMode } from '@/lib/project-gas/game-state';
import styles from './gas-ui.module.css';

const MODES: readonly { mode: GasGameMode; hint: string; color: string }[] = [
  { mode: 'CRUISE', hint: 'lower variance', color: 'var(--gas-gauge-cruise)' },
  { mode: 'BOOST', hint: 'balanced', color: 'var(--gas-gauge-boost)' },
  { mode: 'REDLINE', hint: 'extreme', color: 'var(--gas-gauge-redline)' },
];

export function RiskSelector({
  value,
  disabled,
  onChange,
}: {
  value: GasGameMode;
  disabled?: boolean;
  onChange: (mode: GasGameMode) => void;
}) {
  return (
    <div className={styles.modeGrid} role="group" aria-label="GAS risk mode">
      {MODES.map(({ mode, hint, color }) => (
        <button
          key={mode}
          type="button"
          className={styles.segmentButton}
          style={{ '--mode-color': color } as CSSProperties}
          aria-pressed={value === mode}
          disabled={disabled}
          onClick={() => onChange(mode)}
        >
          <span className={styles.segmentName}>{mode}</span>
          <span className={styles.segmentHint}>{hint}</span>
        </button>
      ))}
    </div>
  );
}
