import { TokenPrice, Transaction } from "generated";
import { getReaderContractConfigByNetwork } from "./readerConfigs";
import { getNetworkFromChainId } from "../utils/networks";
import { marketConfigs } from "../config/markets";
import { getClient } from "../utils/client";
import Reader from "../../abis/Reader.json";
import { ZERO } from "../utils/number";
import { Address, GetBlockNumberErrorType } from "viem";
import pg from "pg";
import { getPostgresClient } from "../utils/postgresClient";

let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
let MAX_PNL_FACTOR_FOR_TRADERS: string =
  "0xab15365d3aa743e766355e2557c230d8f943e195dc84d9b2b05928a07b635ee1";

export async function getMarketPoolValueFromContract(
  marketAddress: string,
  chainId: number,
  transaction: Transaction,
  context: any
): Promise<BigInt> {
  const postgresClient = await getPostgresClient(context);
  let network = getNetworkFromChainId(chainId);
  let contractConfig = getReaderContractConfigByNetwork(network, context);

  if (transaction.blockNumber < contractConfig.blockNumber) {
    return ZERO;
  }

  const marketConfig = marketConfigs.get(marketAddress);

  if (!marketConfig) {
    context.log.error(
      `Market Config not found for market address ${[
        marketAddress,
      ]} for chain ID: ${chainId}`
    );
    throw new Error("Market Config not found");
  }

  const cacheKey = `${marketAddress}:${transaction.blockNumber}:poolValue`;

  let cachedValue = await getCachedPoolValue(cacheKey, postgresClient);
  if (cachedValue !== null) {
    context.log.info(
      `Cache hit for key: ${cacheKey}, returning the pool value ${cachedValue}`
    );
    return cachedValue;
  }

  const client = getClient(chainId);
  const indexToken = marketConfig.indexToken;
  const longToken = marketConfig.longToken;
  const shortToken = marketConfig.shortToken;

  const marketArg = [marketAddress, indexToken, longToken, shortToken];

  let indexTokenPriceArg = await getTokenPriceProps(indexToken, context);
  let longTokenPriceArg = await getTokenPriceProps(longToken, context);
  let shortTokenPriceArg = await getTokenPriceProps(shortToken, context);

  let args = [
    contractConfig.dataStoreAddress,
    marketArg,
    indexTokenPriceArg,
    longTokenPriceArg,
    shortTokenPriceArg,
    MAX_PNL_FACTOR_FOR_TRADERS,
    true,
  ];

  let poolValue: BigInt = ZERO;

  try {
    let tx = (await client.readContract({
      address: contractConfig.readerContractAddress as Address,
      abi: Reader.abi,
      functionName: "getMarketTokenPrice",
      args: args,
      blockNumber: BigInt(transaction.blockNumber),
    })) as any;

    poolValue = tx[1].poolValue;

    context.log.info(
      `Pool Value is ${poolValue} for the block ${transaction.blockNumber} for these market args: ${marketArg}`
    );

    await setCachedPoolValue(cacheKey, poolValue, postgresClient);
  } catch (e) {
    const error = e as GetBlockNumberErrorType;
    context.log.warn(
      `Pool Value doesn't exist at the block ${transaction.blockNumber} for these market args: ${marketArg}`
    );
    context.log.warn(
      `The error type for getMarketPoolValueFromContract is ${error.name}`
    );
  }

  return poolValue;
}

async function getCachedPoolValue(
  key: string,
  postgresClient: pg.Client
): Promise<BigInt | null> {
  const res = await postgresClient.query(
    "SELECT value FROM pool_value_cache WHERE key = $1",
    [key]
  );

  if (res.rows.length > 0) {
    return BigInt(res.rows[0].value);
  }

  return null;
}

async function setCachedPoolValue(
  key: string,
  value: BigInt,
  postgresClient: pg.Client
) {
  await postgresClient.query(
    "INSERT INTO pool_value_cache(key, value) VALUES($1, $2) ON CONFLICT (key) DO NOTHING",
    [key, value.toString()]
  );
}

async function getTokenPriceProps(
  tokenAddress: string,
  context: any
): Promise<Array<BigInt>> {
  let minPrice: BigInt = ZERO;
  let maxPrice: BigInt = ZERO;
  let tokenPrice: TokenPrice | undefined = await context.TokenPrice.get(
    tokenAddress
  );

  if (tokenPrice != undefined) {
    minPrice = tokenPrice.minPrice;
    maxPrice = tokenPrice.maxPrice;
  } else if (tokenAddress != ZERO_ADDRESS) {
    context.log.error(`TokenPrice not found {} ${[tokenAddress]}`);
    throw new Error("tokenAddress is not zero address");
  }

  let price = [minPrice, maxPrice];
  return price;
}
