import type { WagerAsset, WagerDraft } from '@/lib/project-gas/game-state';
import styles from './gas-ui.module.css';
import local from './GasOriginalPrototype.module.css';

const PRESETS = ['10', '25', '50', '100'] as const;

export function WagerComposer({
  draft,
  disabled,
  compact = false,
  onAmountChange,
  onAssetChange,
}: {
  draft: WagerDraft;
  disabled?: boolean;
  compact?: boolean;
  onAmountChange: (amount: string) => void;
  onAssetChange: (asset: WagerAsset) => void;
}) {
  const nextAsset: WagerAsset = draft.asset === 'GAS' ? 'USDC' : 'GAS';

  return (
    <div className={`${styles.wagerPanel} ${compact ? local.compactWagerPanel : ''}`}>
      <label className={styles.eyebrow} htmlFor="gas-wager-amount">Wager amount</label>
      <div className={styles.wagerTop}>
        <div className={`${styles.amountField} ${compact ? local.compactAmountField : ''}`}>
          <input
            id="gas-wager-amount"
            className={styles.amountInput}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={draft.amount}
            disabled={disabled}
            onChange={(event) => onAmountChange(event.currentTarget.value)}
            aria-describedby="gas-wager-balance"
          />
          <button
            className={`${styles.assetButton} ${compact ? local.compactAssetButton : ''}`}
            type="button"
            disabled={disabled}
            onClick={() => onAssetChange(nextAsset)}
            aria-label={`Wager asset ${draft.asset}. Switch to ${nextAsset}.`}
          >
            {draft.asset}
          </button>
        </div>
      </div>
      <div className={`${styles.presetRow} ${compact ? local.compactPresets : ''}`} aria-label="Wager presets">
        {PRESETS.map((amount) => (
          <button
            key={amount}
            type="button"
            className={`${styles.presetButton} ${compact ? local.compactPreset : ''}`}
            disabled={disabled}
            onClick={() => onAmountChange(amount)}
          >
            {amount}
          </button>
        ))}
      </div>
      <div id="gas-wager-balance" className={`${styles.primaryMetaRow} ${compact ? local.compactMeta : ''}`}>
        <span>Prototype available: 1,240 GAS</span>
        <span>MAX never persists</span>
      </div>
    </div>
  );
}
