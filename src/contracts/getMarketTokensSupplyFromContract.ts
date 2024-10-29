import { getClient } from "../utils/client";
import { ZERO } from "../utils/number";
import { Address, GetBlockNumberErrorType } from "viem";
import MarketToken from "../../abis/MarketToken.json";
import { MarketTokensSupplyCache } from "../utils/cache_new";

export async function getMarketTokensSupplyFromContract(
  marketAddress: string,
  chainId: number,
  blockNumber: number,
  context: any
): Promise<BigInt> {
  const id = `${marketAddress}:${blockNumber}:marketTokenSupply`;
  const marketTokensSupplyCache = await MarketTokensSupplyCache.initialize(
    chainId,
    blockNumber
  );
  const marketTokenSupplyCached = await marketTokensSupplyCache.read(
    id,
    blockNumber
  );

  if (marketTokenSupplyCached) {
    // context.log.info(`Returning Data from cache for key: ${id}`);
    return BigInt(marketTokenSupplyCached);
  }

  const client = getClient(chainId);

  let res: BigInt = ZERO;

  try {
    res = (await client.readContract({
      address: marketAddress as Address,
      abi: MarketToken.abi,
      functionName: "totalSupply",
      blockNumber: BigInt(blockNumber),
    })) as BigInt;

    // context.log.info(`The market tokens supply is ${res}`);
    await marketTokensSupplyCache.add(id, res.toString(), chainId, blockNumber);
  } catch (e) {
    const error = e as GetBlockNumberErrorType;
    context.log.warn(
      `The market token isn't created yet ${marketAddress} at the block number ${blockNumber}`
    );

    context.log.warn(
      `The error type for getMarketTokensSupplyFromContract is ${error.name}`
    );
  }

  return res;
}
