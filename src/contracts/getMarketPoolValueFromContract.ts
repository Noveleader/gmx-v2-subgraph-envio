import { TokenPrice, Transaction } from "generated";
import { getReaderContractConfigByNetwork } from "./readerConfigs";
import { getNetworkFromChainId } from "../utils/networks";
import { marketConfigs } from "../config/markets";
import { getClient } from "../utils/client";
import { getReaderAddress } from "../utils/addresses";
import Reader from "../../abis/Reader.json";
import { ZERO } from "../utils/number";
import { Address } from "viem";

let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
let MAX_PNL_FACTOR_FOR_TRADERS: string =
  "0xab15365d3aa743e766355e2557c230d8f943e195dc84d9b2b05928a07b635ee1";

export async function getMarketPoolValueFromContract(
  marketAddress: string,
  chainId: number,
  transaction: Transaction,
  context: any
): Promise<BigInt> {
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

  // context.log.debug(`Args are the following: ${args}`);

  let tx = (await client.readContract({
    address: getReaderAddress(chainId) as Address,
    abi: Reader.abi,
    functionName: "getMarketTokenPrice",
    args: args,
  })) as any;

  // context.log.debug(`Pool Valuue is ${tx[1].poolValue}`);

  return tx[1].poolValue;
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
