import ethereumTokens from "../config/1inchTokens/ethereum.json";
import polygonTokens from "../config/1inchTokens/polygon.json";
import arbitrumTokens from "../config/1inchTokens/arbitrum.json";
import optimismTokens from "../config/1inchTokens/optimism.json";


export interface BaseToken {
  name?: string;
  symbol: string;
  address: string;
  logoURI?: string;
  decimals: number;
  tags?: string[];
}

export const mainnetTokens: { [key: string]: BaseToken[] } = {
  ethereum: [...Object.values(ethereumTokens.tokens)],
  polygon: [...Object.values(polygonTokens.tokens)],
  arbitrum: [...Object.values(arbitrumTokens.tokens)],
  optimism: [...Object.values(arbitrumTokens.tokens)],
};
