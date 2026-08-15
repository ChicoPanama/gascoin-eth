import type { WagerAsset, WagerDraft } from '@/lib/project-gas/game-state';
import styles from './gas-ui.module.css';

const PRESETS = ['10', '25', '50', '100'] as const;

export function WagerComposer({
  draft,
  disabled,
  onAmountChange,
  onAssetChange,
}: {
  draft: WagerDraft;
  disabled?: boolean;
  onAmountChange: (amount: string) => void;
  onAssetChange: (asset: WagerAsset) => void;
}) {
  const nextAsset: WagerAsset = draft.asset === 'GAS' ? 'USDC' : 'GAS';

  return (
    <div className={styles.wagerPanel}>
      <label className={styles.eyebrow} htmlFor="gas-wager-amount">Wager amount</label>
      <div className={styles.wagerTop}>
        <div className={styles.amountField}>
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
            className={styles.assetButton}
            type="button"
            disabled={disabled}
            onClick={() => onAssetChange(nextAsset)}
            aria-label={`Wager asset ${draft.asset}. Switch to ${nextAsset}.`}
          >
            {draft.asset}
          </button>
        </div>
      </div>
      <div className={styles.presetRow} aria-label="Wager presets">
        {PRESETS.map((amount) => (
          <button
            key={amount}
            type="button"
            className={styles.presetButton}
            disabled={disabled}
            onClick={() => onAmountChange(amount)}
          >
            {amount}
          </button>
        ))}
      </div>
      <div id="gas-wager-balance" className={styles.primaryMetaRow}>
        <span>Prototype available: 1,240 GAS</span>
        <span>MAX never persists</span>
      </div>
    </div>
  );
}
