import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function WalletButton() {
  return (
    <div className="flex items-center gap-3">
      <WalletMultiButton />
    </div>
  );
}