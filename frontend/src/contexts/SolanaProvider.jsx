import { useMemo, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider
} from "@solana/wallet-adapter-react-ui";

import {
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from "@solana/wallet-adapter-wallets";

import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";

export default function SolanaProvider({ children }) {
  const [network, setNetwork] = useState("devnet");

  const endpoint = useMemo(() => {
    if (network === "localnet") return "http://127.0.0.1:8899";
    return clusterApiUrl("devnet");
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter()
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}

          {/* simple global network switch */}
          <div className="fixed bottom-4 right-4 bg-white p-2 rounded shadow">
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              <option value="devnet">Devnet</option>
              <option value="localnet">Localnet</option>
            </select>
          </div>

        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}