import { TokenPrice, Transaction } from "generated";
import { getReaderContractConfigByNetwork } from "./readerConfigs";
import { getNetworkFromChainId } from "../utils/networks";
import { marketConfigs } from "../config/markets";
import { getClient } from "../utils/client";
import Reader from "../../abis/Reader.json";
import { ZERO } from "../utils/number";
import { Address, GetBlockNumberErrorType } from "viem";
import { PoolValueCache } from "../utils/cache_new";

let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
let MAX_PNL_FACTOR_FOR_TRADERS: string =
  "0xab15365d3aa743e766355e2557c230d8f943e195dc84d9b2b05928a07b635ee1";

export async function getMarketPoolValueFromContract(
  marketAddress: string,
  chainId: number,
  transaction: Transaction,
  context: any
): Promise<BigInt> {
  const id = `${marketAddress}:${transaction.blockNumber}:poolValue`;
  const poolValueCache = await PoolValueCache.initialize(
    chainId,
    transaction.blockNumber
  );
  const poolValueCached = await poolValueCache.read(
    id,
    transaction.blockNumber
  );

  if (poolValueCached) {
    context.log.info(`Returning Data from cache for key: ${id}`);
    return BigInt(poolValueCached);
  }

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

    await poolValueCache.add(
      id,
      poolValue.toString(),
      chainId,
      transaction.blockNumber
    );
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
