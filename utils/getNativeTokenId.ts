export default function getNativeTokenId(chainId: number) {
  switch (chainId) {
    case 1:
      return 'ethereum';
    case 137:
      return 'matic-network';
    case 42161:
      return 'ethereum';
    case 10:
      return 'ethereum';
    default:
      throw new Error("Invalid chainId");
      
  }
}