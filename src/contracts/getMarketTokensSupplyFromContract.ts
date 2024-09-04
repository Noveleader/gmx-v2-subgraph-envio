import { getClient } from "../utils/client";
import { ZERO } from "../utils/number";
import { Address, GetBlockNumberErrorType } from "viem";
import MarketToken from "../../abis/MarketToken.json";
import pg from "pg";
import { getPostgresClient } from "../utils/postgresClient";

export async function getMarketTokensSupplyFromContract(
  marketAddress: string,
  chainId: number,
  blockNumber: number,
  context: any
): Promise<BigInt> {
  const postgresClient = await getPostgresClient(context);
  const client = getClient(chainId);

  let res: BigInt = ZERO;

  const cacheKey = `${marketAddress}:${blockNumber}:marketTokenSupply`;

  let cachedValue = await getCachedMarketTokensSupply(cacheKey, postgresClient);
  if (cachedValue !== null) {
    context.log.info(
      `Cache hit for key: ${cacheKey}, returning the market token supply ${cachedValue}`
    );
    return cachedValue;
  }

  try {
    res = (await client.readContract({
      address: marketAddress as Address,
      abi: MarketToken.abi,
      functionName: "totalSupply",
      blockNumber: BigInt(blockNumber),
    })) as BigInt;

    context.log.info(`The market tokens supply is ${res}`);
    await setCachedMarketTokensSupply(cacheKey, res, postgresClient);
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

async function getCachedMarketTokensSupply(
  key: string,
  postgresClient: pg.Client
): Promise<BigInt | null> {
  const res = await postgresClient.query(
    "SELECT value FROM market_token_supply_cache WHERE key = $1",
    [key]
  );

  if (res.rows.length > 0) {
    return BigInt(res.rows[0].value);
  }

  return null;
}

async function setCachedMarketTokensSupply(
  key: string,
  value: BigInt,
  postgresClient: pg.Client
) {
  await postgresClient.query(
    "INSERT INTO market_token_supply_cache(key, value) VALUES($1, $2) ON CONFLICT (key) DO NOTHING",
    [key, value.toString()]
  );
}
