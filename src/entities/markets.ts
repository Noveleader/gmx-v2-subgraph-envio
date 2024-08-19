import { MarketInfo } from "generated/src/Types.gen";
import { marketConfigs } from "../config/markets";
import { ZERO } from "../utils/number";
import { EventLog1Item } from "../interfaces/interface";

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

export async function saveMarketInfo(
  eventData: EventLog1Item,
  context: any
): Promise<any> {
  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;
  let id = eventDataAddressItemsItems[0];
  let indexToken = eventDataAddressItemsItems[1];
  let longToken = eventDataAddressItemsItems[2];
  let shortToken = eventDataAddressItemsItems[3];

  context.MarketInfo.set({
    id: id,
    marketToken: id,
    indexToken: indexToken,
    longToken: longToken,
    shortToken: shortToken,
    marketTokensSupply: ZERO,
  });

  let marketInfo: MarketInfo = await context.MarketInfo.get(id);
  return marketInfo as MarketInfo;
}
