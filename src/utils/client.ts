import { Chain, createPublicClient, webSocket } from "viem";
import { arbitrum, avalanche } from "viem/chains";
import * as dotenv from "dotenv";
dotenv.config();

export function getClient(chainId: number) {
  let chain: Chain = arbitrum;
  if (chainId == 43114) {
    chain = avalanche;
    return createPublicClient({
      chain: chain,
      transport: webSocket(process.env.WSS_AVAX),
    });
  }

  return createPublicClient({
    chain: chain,
    transport: webSocket(process.env.WSS_ARB),
  });
}
