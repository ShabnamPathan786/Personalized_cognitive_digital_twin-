import { useMemo, useState, createContext, useContext } from "react";
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

export const NetworkContext = createContext();

export const useNetwork = () => useContext(NetworkContext);

export default function SolanaProvider({ children }) {
  const defaultNetwork = import.meta.env.VITE_SOLANA_NETWORK || "localnet";
  const [network, setNetwork] = useState(defaultNetwork);

  const endpoint = useMemo(() => {
    if (network === "localnet") return "http://127.0.0.1:8899";
    if (network === "devnet") return import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl("devnet");
    return import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl("mainnet-beta");
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter()
    ],
    []
  );

  return (
    <NetworkContext.Provider value={{ network, setNetwork }}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </NetworkContext.Provider>
  );
}