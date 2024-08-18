import { TokenPrice } from "generated/src/Types.gen";
import { ZERO } from "../utils/number";

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
