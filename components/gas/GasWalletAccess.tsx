'use client';

import { useState } from 'react';
import {
  useConnectWallet,
  useLogin,
  usePrivy,
  useWallets,
} from '@privy-io/react-auth';
import styles from './gas-ui.module.css';

const GAS_EXTERNAL_WALLETS = [
  'metamask',
  'coinbase_wallet',
  'base_account',
  'rainbow',
  'uniswap',
  'safe',
  'detected_ethereum_wallets',
  'wallet_connect',
] as const;

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function walletLabel(clientType: string) {
  if (clientType === 'privy') return 'GAS embedded wallet';
  if (clientType === 'base_account') return 'Base Account';
  if (clientType === 'coinbase_wallet') return 'Coinbase Wallet';
  if (clientType === 'metamask') return 'MetaMask';
  if (clientType === 'rainbow') return 'Rainbow';
  if (clientType === 'uniswap') return 'Uniswap Wallet';
  if (clientType === 'safe') return 'Safe';
  return 'External wallet';
}

export function GasWalletAccess() {
  const { ready, authenticated } = usePrivy();
  const { login } = useLogin();
  const { ready: walletsReady, wallets } = useWallets();
  const [message, setMessage] = useState<string | null>(null);

  const { connectWallet } = useConnectWallet({
    onSuccess: ({ wallet }) => {
      setMessage(null);
      // EVM loginOrLink has the behavior GAS needs for both states:
      // signed-out users authenticate with the wallet; signed-in users link it
      // to their existing GAS identity.
      void wallet.loginOrLink().catch((error) => {
        setMessage(error instanceof Error ? error.message : 'Wallet connected, but account linking needs another try.');
      });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Wallet connection was not completed.');
    },
  });

  const embeddedWallets = wallets.filter((wallet) => wallet.walletClientType === 'privy');
  const externalWallets = wallets.filter((wallet) => wallet.walletClientType !== 'privy');

  const enterGas = () => {
    setMessage(null);
    void login({ loginMethods: ['email', 'twitter'] });
  };

  const connectExisting = () => {
    setMessage(null);
    void connectWallet({
      description: authenticated
        ? 'Link a wallet you already control to this GAS account.'
        : 'Use a wallet you already control to enter GAS.',
      walletList: [...GAS_EXTERNAL_WALLETS],
    });
  };

  return (
    <section className={styles.actionCard} aria-labelledby="gas-wallet-access-title">
      <span className={styles.actionCardMeta}>Wallet access</span>
      <span id="gas-wallet-access-title" className={styles.actionCardTitle}>YOUR ACCOUNT, YOUR CHOICE</span>
      <p className={styles.actionCardBody}>
        Start with a GAS embedded wallet for the lowest-friction experience, or connect a wallet you already control. Both paths belong to the same consumer account model; external-wallet users remain in control of their wallet.
      </p>

      {!authenticated ? (
        <div className={styles.resultRail}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!ready}
            onClick={enterGas}
          >
            {ready ? 'Continue with GAS' : 'Account loading'}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!ready}
            onClick={connectExisting}
          >
            Connect existing wallet
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={!ready}
          onClick={connectExisting}
        >
          Connect another wallet
        </button>
      )}

      <div className={styles.primaryMetaRow}>
        <span>{embeddedWallets.length > 0 ? `${embeddedWallets.length} embedded` : 'Embedded optional'}</span>
        <span>{externalWallets.length > 0 ? `${externalWallets.length} external connected` : 'External optional'}</span>
      </div>

      {walletsReady && wallets.length > 0 ? (
        <div className={styles.cardGrid} aria-label="Connected GAS wallets">
          {wallets.map((wallet) => (
            <div key={`${wallet.walletClientType}:${wallet.address}`} className={styles.accountStrip}>
              <div>
                <div className={styles.eyebrow}>{walletLabel(wallet.walletClientType)}</div>
                <div className={styles.balanceSub}>{truncate(wallet.address)}</div>
              </div>
              <div className={`${styles.statusPill} ${styles.statusReady}`}>
                <span className={styles.statusDot} /> Connected
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {message ? <div className={styles.errorNotice} role="status">{message}</div> : null}

      <p className={styles.actionCardBody}>
        Connecting a wallet does not merge its assets with GAS reserves or game bankroll accounting. Spendable balances, locked wagers and protocol reserves remain distinct.
      </p>
    </section>
  );
}
