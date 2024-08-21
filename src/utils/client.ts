import { Chain, createPublicClient, http } from "viem";
import { arbitrum, avalanche } from "viem/chains";

export function getClient(chainId: number) {
  let chain: Chain = arbitrum;
  if (chainId == 42161) {
    chain = arbitrum;
  } else if (chainId == 43114) {
    chain = avalanche;
  }

  return createPublicClient({
    chain: chain,
    transport: http(),
  });
}
