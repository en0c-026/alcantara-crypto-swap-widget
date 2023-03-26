export default function getExplorerUrl(chainId: number) {
  switch (chainId) {
    case 1:
      return "https://etherscan.io";
    case 137:
      return "https://polygonscan.com";
    case 42161:
      return "https://arbiscan.io";
    case 10:
      return "https://optimistic.etherscan.io";
    default:
      throw new Error("Invalid chainId");
      
  }
}
