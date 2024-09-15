import { TokenPrice } from "generated/src/Types.gen";
import { ZERO } from "../utils/number";
import { EventLog1Item } from "../interfaces/interface";
import { OraclePriceUpdateEventData } from "../utils/eventData/OraclePriceUpdateEventData";

export async function convertUsdToAmount(
  tokenAddress: string,
  usd: BigInt,
  context: any,
  useMax: boolean = true
): Promise<BigInt> {
  let price = await getTokenPrice(tokenAddress, context, useMax);
  if (price == ZERO) {
    return BigInt(0);
  }

  return BigInt(Number(usd) / Number(price));
}

export async function getTokenPrice(
  tokenAddress: string,
  context: any,
  useMax: boolean = false
): Promise<BigInt> {
  let priceRef: TokenPrice | undefined = await context.TokenPrice.get(
    tokenAddress
  );
  if (priceRef == undefined) {
    return BigInt(0);
  }
  return useMax ? priceRef.maxPrice : priceRef.minPrice;
}

export async function convertAmountToUsd(
  tokenAddress: string,
  amount: BigInt,
  context: any,
  useMax: boolean = false
): Promise<BigInt> {
  let price = await getTokenPrice(tokenAddress, context, useMax);
  return BigInt(Number(amount) * Number(price));
}

export async function handleOraclePriceUpdate(
  eventData: EventLog1Item,
  chainId: number,
  context: any
): Promise<void> {
  let event = new OraclePriceUpdateEventData(eventData);
  let tokenPrice = await getOrCreateTokenPrice(event.token, chainId, context);

  tokenPrice = {
    ...tokenPrice,
    minPrice: BigInt(event.minPrice.toString()),
    maxPrice: BigInt(event.maxPrice.toString()),
  };

  context.TokenPrice.set(tokenPrice);
}

async function getOrCreateTokenPrice(
  tokenAddress: string,
  chainId: number,
  context: any
): Promise<TokenPrice> {
  let tokenPrice: TokenPrice | undefined = await context.TokenPrice.get(
    tokenAddress
  );
  if (tokenPrice != undefined) {
    return tokenPrice;
  } else {
    tokenPrice = {
      id: tokenAddress,
      chainId: chainId,
      maxPrice: ZERO,
      minPrice: ZERO,
    };
    return tokenPrice;
  }
}
