import { WalletTrackerClient } from '../../components/wallet-tracker/WalletTrackerClient';

export default async function WalletPage(props: { searchParams: Promise<{ address?: string }> }) {
  const searchParams = await props.searchParams;
  const initialAddress = searchParams.address ?? null;
  return <WalletTrackerClient initialLookupAddress={initialAddress} />;
}
