import { getClient } from "../utils/client";
import { ZERO } from "../utils/number";
import { Address } from "viem";
import MarketToken from "../../abis/MarketToken.json";

export async function getMarketTokensSupplyFromContract(
  marketAddress: string,
  chainId: number,
  blockNumber: number,
  context: any
): Promise<BigInt> {
  const client = getClient(chainId);

  context.log.debug(`The block number is ${blockNumber}`);
  let res: BigInt = ZERO;

  try {
    res = (await client.readContract({
      address: marketAddress as Address,
      abi: MarketToken.abi,
      functionName: "totalSupply",
      blockNumber: BigInt(blockNumber),
    })) as BigInt;
  } catch {
    context.log.info(
      `The market token isn't created yet ${marketAddress} at the block number ${blockNumber}`
    );
  }

  context.log.debug(`The market tokens supply is ${res}`);

  return res;
}
