'use client';

import { useState } from 'react';
import { useProjectGasTradeQuote } from '@/hooks/useProjectGasTradeQuote';
import {
  unavailableTradeQuote,
  validTradeInputAmount,
  type TradeSide,
} from '@/lib/project-gas/trade-state';
import styles from './gas-ui.module.css';

function quoteValue(value: string | undefined, asset: string | undefined): string {
  return value && asset ? `${value} ${asset}` : '—';
}

export function GasTradeQuotePreview() {
  const [side, setSide] = useState<TradeSide>('buy');
  const [amount, setAmount] = useState('100');
  const query = useProjectGasTradeQuote({ side, amount });
  const validAmount = validTradeInputAmount(amount);
  const quote = query.data ?? unavailableTradeQuote(
    !validAmount
      ? 'Enter a positive amount to request a quote.'
      : query.isPending
        ? 'Reading approved quote source.'
        : 'Trade quote is unavailable.',
  );
  const payAsset = side === 'buy' ? 'USDC' : 'GAS';

  return (
    <section
      className={styles.actionCard}
      aria-label="GAS trade quote"
      data-quote-authority={quote.authority}
      data-quote-status={quote.status}
    >
      <span className={styles.actionCardMeta}>Quote truth · read only · {quote.status}</span>
      <span className={styles.actionCardTitle}>{side === 'buy' ? 'BUY GAS' : 'SELL GAS'}</span>

      <div className={styles.modeGrid} role="group" aria-label="Trade side">
        <button
          type="button"
          className={styles.segmentButton}
          aria-pressed={side === 'buy'}
          onClick={() => setSide('buy')}
        >
          <span className={styles.segmentName}>BUY</span>
          <span className={styles.segmentHint}>USDC → GAS</span>
        </button>
        <button
          type="button"
          className={styles.segmentButton}
          aria-pressed={side === 'sell'}
          onClick={() => setSide('sell')}
        >
          <span className={styles.segmentName}>SELL</span>
          <span className={styles.segmentHint}>GAS → USDC</span>
        </button>
      </div>

      <div className={styles.wagerPanel}>
        <label className={styles.eyebrow} htmlFor="gas-trade-amount">Amount to {side === 'buy' ? 'spend' : 'sell'}</label>
        <div className={styles.amountField}>
          <input
            id="gas-trade-amount"
            className={styles.amountInput}
            aria-label="Trade amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value.trim())}
          />
          <span className={styles.assetButton} aria-hidden>{payAsset}</span>
        </div>
      </div>

      <div className={styles.cardGrid}>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Estimated output</span>
          <span className={styles.actionCardTitle}>{quoteValue(quote.receive?.amount, quote.receive?.asset)}</span>
          <p className={styles.actionCardBody}>Minimum received: {quoteValue(quote.minimumReceived?.amount, quote.minimumReceived?.asset)}</p>
        </div>

        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Fee / price impact</span>
          <span className={styles.actionCardTitle}>{quote.feeBps !== undefined ? `${quote.feeBps / 100}%` : '—'}</span>
          <p className={styles.actionCardBody}>Fee amount: {quoteValue(quote.fee?.amount, quote.fee?.asset)} · impact: {quote.priceImpactBps !== undefined ? `${quote.priceImpactBps / 100}%` : '—'}</p>
        </div>
      </div>

      <p className={styles.actionCardBody}>
        {quote.message || `Quote ${quote.quoteId} · source ${quote.source} · expires ${quote.expiresAt}`}
      </p>
      <p className={styles.actionCardBody}><strong>Execution is not enabled here.</strong> This surface reads quote truth only and does not submit, sign or settle a transaction.</p>
    </section>
  );
}
