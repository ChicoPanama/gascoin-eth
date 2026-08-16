'use client';

import { useState } from 'react';
import {
  useLinkAccount,
  useLogin,
  usePrivy,
  useWallets,
} from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { useAccount } from 'wagmi';
import styles from './gas-ui.module.css';

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function walletLabel(clientType: string) {
  if (clientType === 'privy' || clientType === 'privy_v2') return 'GAS embedded wallet';
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
  const { address: activeAddress } = useAccount();
  const { setActiveWallet } = useSetActiveWallet();
  const [message, setMessage] = useState<string | null>(null);

  const { linkWallet } = useLinkAccount({
    onSuccess: () => setMessage('Wallet linked to your GAS account.'),
    onError: (error) => setMessage(typeof error === 'string' ? error : 'Wallet linking was not completed.'),
  });

  const embeddedWallets = wallets.filter(
    (wallet) => wallet.walletClientType === 'privy' || wallet.walletClientType === 'privy_v2',
  );
  const externalWallets = wallets.filter(
    (wallet) => wallet.walletClientType !== 'privy' && wallet.walletClientType !== 'privy_v2',
  );

  const enterGas = () => {
    setMessage(null);
    void login({ loginMethods: ['email', 'twitter'] });
  };

  const useExistingWallet = () => {
    setMessage(null);
    if (authenticated) {
      void linkWallet();
      return;
    }
    void login({ loginMethods: ['wallet'] });
  };

  const activateWallet = async (wallet: (typeof wallets)[number]) => {
    try {
      setMessage(null);
      await setActiveWallet(wallet);
      setMessage(`${walletLabel(wallet.walletClientType)} is now active for GAS actions.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not switch the active wallet.');
    }
  };

  return (
    <section className={styles.actionCard} aria-labelledby="gas-wallet-access-title">
      <span className={styles.actionCardMeta}>Wallet access</span>
      <span id="gas-wallet-access-title" className={styles.actionCardTitle}>YOUR ACCOUNT, YOUR CHOICE</span>
      <p className={styles.actionCardBody}>
        Start with a GAS embedded wallet for the lowest-friction experience, or use a wallet you already control. Both paths belong to one GAS identity while self-custody wallets remain under your control.
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
            onClick={useExistingWallet}
          >
            Use my wallet
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={!ready}
          onClick={useExistingWallet}
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
          {wallets.map((wallet) => {
            const active = activeAddress?.toLowerCase() === wallet.address.toLowerCase();
            return (
              <div key={`${wallet.walletClientType}:${wallet.address}`} className={styles.accountStrip}>
                <div>
                  <div className={styles.eyebrow}>{walletLabel(wallet.walletClientType)}</div>
                  <div className={styles.balanceSub}>{truncate(wallet.address)}</div>
                </div>
                {active ? (
                  <div className={`${styles.statusPill} ${styles.statusReady}`}>
                    <span className={styles.statusDot} /> Active
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void activateWallet(wallet)}
                  >
                    Use
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {message ? <div className={styles.errorNotice} role="status">{message}</div> : null}

      <p className={styles.actionCardBody}>
        Wallet connection never merges assets with GAS reserves or game-bankroll accounting. Spendable balances, locked wagers and protocol reserves remain distinct.
      </p>
    </section>
  );
}
