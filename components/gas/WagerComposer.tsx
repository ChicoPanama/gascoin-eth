import type { WagerDraft } from '@/lib/project-gas/game-state';
import styles from './gas-ui.module.css';
import local from './GasOriginalPrototype.module.css';

const PRESETS = ['10', '25', '50', '100'] as const;

export function WagerComposer({
  draft,
  disabled,
  compact = false,
  onAmountChange,
}: {
  draft: WagerDraft;
  disabled?: boolean;
  compact?: boolean;
  onAmountChange: (amount: string) => void;
}) {
  return (
    <div className={`${styles.wagerPanel} ${compact ? local.compactWagerPanel : ''}`}>
      <label className={styles.eyebrow} htmlFor="gas-wager-amount">USDC entry amount</label>
      <div className={styles.wagerTop}>
        <div className={`${styles.amountField} ${compact ? local.compactAmountField : ''}`}>
          <input
            id="gas-wager-amount"
            className={styles.amountInput}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={draft.entryAmount}
            disabled={disabled}
            onChange={(event) => onAmountChange(event.currentTarget.value)}
            aria-describedby="gas-wager-balance"
          />
          <span
            className={`${styles.assetBadge} ${compact ? local.compactAssetBadge : ''}`}
            aria-label="Player entry asset USDC"
          >
            {draft.entryAsset}
          </span>
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
        <span>USDC in · GAS sourced automatically</span>
        <span>Payout in GAS</span>
      </div>
    </div>
  );
}
