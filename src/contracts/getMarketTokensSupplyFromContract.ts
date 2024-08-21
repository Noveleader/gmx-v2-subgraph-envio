import { getClient } from "../utils/client";
import { ZERO } from "../utils/number";
import { Address } from "viem";
import MarketToken from "../../abis/MarketToken.json";

export async function getMarketTokensSupplyFromContract(
  marketAddress: string,
  chainId: number,
  context: any
): Promise<BigInt> {
  const client = getClient(chainId);

  let res = (await client.readContract({
    address: marketAddress as Address,
    abi: MarketToken.abi,
    functionName: "totalSupply",
    args: [],
  })) as BigInt;

  return res;
}
