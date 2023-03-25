import { mainnet, polygon, arbitrum, optimism } from "@wagmi/chains";
import { configureChains } from "@wagmi/core";
import { publicProvider } from "wagmi/providers/public";
import { MetaMaskConnector } from "@wagmi/connectors/metaMask"
import { CoinbaseWalletConnector } from "@wagmi/connectors/coinbaseWallet";
import { WalletConnectConnector } from "@wagmi/connectors/walletConnect";
import { InjectedConnector } from "@wagmi/connectors/injected";
import { createClient } from "wagmi";

const { chains, provider, webSocketProvider } = configureChains(
  [mainnet, polygon, arbitrum, optimism],
  [publicProvider()]
);

export const client = createClient({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: "wagmi",
      },
    }),
    new WalletConnectConnector({
      chains,
      options: {
        qrcode: true,
      },
    }),
    new InjectedConnector({
      chains,
      options: {
        name: "Injected",
        shimDisconnect: true,
      },
    }),
  ],
  provider,
  webSocketProvider,
});
