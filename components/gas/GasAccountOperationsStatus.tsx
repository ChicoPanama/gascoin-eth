'use client';

import {
  recoveryGuidance,
  unavailableMoneyAction,
} from '@/lib/project-gas/action-recovery';
import styles from './gas-ui.module.css';

const FUNDING = unavailableMoneyAction(
  'funding',
  'Funding is unavailable until an approved provider, canonical reconciliation path and step-up security are connected.',
);
const WITHDRAWAL = unavailableMoneyAction(
  'withdrawal',
  'Withdrawal is unavailable until an approved provider, canonical reconciliation path and step-up security are connected.',
);
const PERMISSION = unavailableMoneyAction(
  'other',
  'No production bounded-spend permission is active in this build.',
);

function OperationCard({
  label,
  title,
  message,
}: {
  label: string;
  title: string;
  message: string;
}) {
  return (
    <div className={styles.actionCard}>
      <span className={styles.actionCardMeta}>{label}</span>
      <span className={styles.actionCardTitle}>{title}</span>
      <p className={styles.actionCardBody}>{message}</p>
    </div>
  );
}

export function GasAccountOperationsStatus() {
  const funding = recoveryGuidance(FUNDING);
  const withdrawal = recoveryGuidance(WITHDRAWAL);
  const permission = recoveryGuidance(PERMISSION);

  return (
    <section className={styles.cardGrid} aria-label="GAS account operations">
      <OperationCard
        label="Funding · unavailable"
        title={funding.headline.toUpperCase()}
        message={`${funding.moneyState} ${funding.nextAction}`}
      />
      <OperationCard
        label="Withdrawal · unavailable"
        title={withdrawal.headline.toUpperCase()}
        message={`${withdrawal.moneyState} ${withdrawal.nextAction}`}
      />
      <OperationCard
        label="Bounded permissions · unavailable"
        title={permission.headline.toUpperCase()}
        message={`${permission.moneyState} ${permission.nextAction} Any future permission must expose asset, bounded amount/scope, expiry and a visible revoke path.`}
      />
      <div className={styles.actionCard}>
        <span className={styles.actionCardMeta}>Recovery law</span>
        <span className={styles.actionCardTitle}>DID MONEY MOVE?</span>
        <p className={styles.actionCardBody}>Every future funding, withdrawal, Trade or other money action must answer financial movement first, then canonical status, then the safe next action. Unknown finality means reconcile before retry.</p>
      </div>
    </section>
  );
}
