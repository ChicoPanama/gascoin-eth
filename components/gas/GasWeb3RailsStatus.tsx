'use client';

import { useProjectGasWeb3Rails } from '@/hooks/useProjectGasWeb3Rails';
import { getProjectGasAssetConfig } from '@/lib/project-gas/asset-config';
import type { ProjectGasRailStatus } from '@/lib/project-gas/web3-rails';
import styles from './gas-ui.module.css';

function statusClass(status: ProjectGasRailStatus): string {
  if (status === 'ready') return styles.statusReady;
  if (status === 'loading') return styles.statusPending;
  return styles.statusFailed;
}

function RailCard({
  label,
  title,
  status,
  message,
}: {
  label: string;
  title: string;
  status: ProjectGasRailStatus;
  message: string;
}) {
  return (
    <div className={styles.actionCard}>
      <span className={styles.actionCardMeta}>{label}</span>
      <span className={styles.actionCardTitle}>{title}</span>
      <div className={`${styles.statusPill} ${statusClass(status)}`}>
        <span className={styles.statusDot} /> {status}
      </div>
      <p className={styles.actionCardBody}>{message}</p>
    </div>
  );
}

export function GasWeb3RailsStatus() {
  const rails = useProjectGasWeb3Rails();
  const assetConfig = getProjectGasAssetConfig();
  const fastPlayReady = rails.capabilities.atomic === 'ready'
    || rails.capabilities.atomic === 'supported';
  const sponsoredReady = rails.features.paymasterEnabled && rails.capabilities.paymasterService;
  const attributionReady = rails.features.builderCodeConfigured && rails.capabilities.dataSuffix;
  const fundingReady = Boolean(assetConfig.usdcAddress)
    && (rails.features.basePayEnabled || rails.features.onrampEnabled);

  const usdcMessage = assetConfig.usdcConfigurationStatus === 'invalid'
    ? 'The configured USDC address is not Circle’s canonical deployment for this network, so GAS refuses to use it.'
    : assetConfig.usdcConfigurationStatus === 'missing'
      ? 'Canonical native USDC is not configured. Funding remains unavailable.'
      : rails.features.basePayEnabled || rails.features.onrampEnabled
        ? 'Canonical native USDC and at least one approved funding rail are configured.'
        : 'Canonical native USDC is configured, but no approved Base Pay or onramp provider is enabled.';

  return (
    <section aria-labelledby="gas-web3-rails-title">
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>Base contract railways · runtime truth</div>
        <h2 id="gas-web3-rails-title" className={styles.actionCardTitle}>WEB3 RAIL STATUS</h2>
        <p className={styles.pageIntro}>Capability detection is progressive enhancement. Standard wallet transactions remain first-class, and no provider or contract is presented as live from research alone.</p>
      </header>

      <div className={styles.cardGrid}>
        <RailCard
          label="Base execution"
          title={rails.chain.label.toUpperCase()}
          status={rails.chain.status}
          message={rails.chain.message}
        />
        <RailCard
          label="Play account"
          title={rails.wallet.label.toUpperCase()}
          status={rails.wallet.status}
          message={rails.wallet.message}
        />
        <RailCard
          label="Fast play · EIP-5792"
          title={fastPlayReady ? 'WALLET CAPABLE' : 'STANDARD SIGNING'}
          status={rails.capabilities.status}
          message={`${rails.capabilities.message} No bounded-spend permission is active until its contract, scope, expiry and revoke path are approved.`}
        />
        <RailCard
          label="Network fee"
          title={sponsoredReady ? 'SPONSORING READY' : 'NORMAL BASE FEE'}
          status={sponsoredReady ? 'ready' : 'unavailable'}
          message={sponsoredReady
            ? 'The approved paymaster is enabled and supported by this wallet for the configured chain.'
            : 'GAS does not promise a free transaction. The player should expect the normal Base network fee until both wallet support and an approved paymaster are present.'}
        />
        <RailCard
          label="Add funds · native USDC"
          title={fundingReady ? 'FUNDING RAIL READY' : 'FUNDING UNAVAILABLE'}
          status={fundingReady ? 'ready' : 'unavailable'}
          message={usdcMessage}
        />
        <RailCard
          label="Attribution · ERC-8021"
          title={attributionReady ? 'BUILDER CODE READY' : 'NOT CONFIGURED'}
          status={attributionReady ? 'ready' : 'unavailable'}
          message={attributionReady
            ? 'Builder attribution is configured and the active wallet reports data-suffix support.'
            : 'Builder Code attribution is not represented as active until configuration and wallet support are both verified.'}
        />
      </div>
    </section>
  );
}
