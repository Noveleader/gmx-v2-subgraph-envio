import { MarketInfo } from "generated";
import { marketConfigs } from "../config/markets";
import { ZERO } from "../utils/number";

export async function getMarketInfo(
  marketAddress: string,
  context: any
): Promise<MarketInfo> {
  let entity: MarketInfo | undefined = await context.MarketInfo.get(
    marketAddress
  );

  if (entity == undefined) {
    let marketConfig = marketConfigs.get(marketAddress);

    if (marketConfig) {
      entity = {
        id: marketAddress,
        marketToken: marketConfig.marketToken,
        indexToken: marketConfig.indexToken,
        longToken: marketConfig.longToken,
        shortToken: marketConfig.shortToken,
        marketTokensSupply: ZERO,
        marketTokensSupplyFromPoolUpdated: ZERO,
      };
      context.MarketInfo.set(entity);
    } else {
      context.log.error("MarketInfo not found {}", [marketAddress]);
      throw new Error("MarketInfo not found");
    }
  }

  return entity!;
}

export async function saveMarketInfoTokensSupply(
  marketAddress: string,
  value: BigInt,
  context: any
): Promise<void> {
  let marketInfo = await getMarketInfo(marketAddress, context);

  marketInfo = {
    ...marketInfo,
    marketTokensSupply:
      marketInfo.marketTokensSupply + BigInt(value.toString()),
  };

  context.MarketInfo.set(marketInfo);
}
