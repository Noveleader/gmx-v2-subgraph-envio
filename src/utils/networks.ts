export function getNetworkFromChainId(chainId: number): string {
  let network: string = "arbitrum";
  if (chainId == 42161) {
    network = "arbitrum";
  } else if (chainId == 43114) {
    network = "avalanche";
  }
  return network;
}
