export interface Chain {
  name: string;
  chainId: number;
  image: string;
  nativeSymbol: string;
}

export const mainnetChains: {[key: string]: Chain} = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    image: "https://docs.axelar.dev/images/chains/ethereum.svg",
    nativeSymbol: "ETH",
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    image: "https://docs.axelar.dev/images/chains/polygon.svg",
    nativeSymbol: "MATIC",
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    image: "https://docs.axelar.dev/images/chains/arbitrum.svg",
    nativeSymbol: "ETH",
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    image: "https://docs.axelar.dev/images/chains/optimism.svg",
    nativeSymbol: "ETH",
  },
};

