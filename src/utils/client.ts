import { Chain, createPublicClient, webSocket, http } from "viem";
import { arbitrum, avalanche } from "viem/chains";
import * as dotenv from "dotenv";
dotenv.config();

export function getClient(chainId: number) {
  let chain: Chain = arbitrum;
  if (chainId == 43114) {
    chain = avalanche;
    return createPublicClient({
      chain: chain,
      transport: process.env.WSS_AVAX ? webSocket(process.env.WSS_AVAX) : http(process.env.RPC_AVAX),
    });
  }

  return createPublicClient({
    chain: chain,
    transport: process.env.WSS_ARB ? webSocket(process.env.WSS_ARB) : http(process.env.RPC_ARB),
  });
}
