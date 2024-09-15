import { MarketInfo } from "generated/src/Types.gen";
import { marketConfigs } from "../config/markets";
import { ZERO } from "../utils/number";
import { EventLog1Item } from "../interfaces/interface";

export async function getMarketInfo(
  marketAddress: string,
  chainId: number,
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
        chainId: chainId,
        marketToken: marketConfig.marketToken,
        indexToken: marketConfig.indexToken,
        longToken: marketConfig.longToken,
        shortToken: marketConfig.shortToken,
        marketTokensSupply: ZERO,
        marketTokensSupplyFromPoolUpdated: ZERO,
      };
      context.MarketInfo.set(entity);
    } else {
      context.log.error(
        `Market Config not found for market address ${[marketAddress]}`
      );
      throw new Error("MarketInfo not found");
    }
  }

  return entity!;
}

export async function saveMarketInfoTokensSupply(
  marketAddress: string,
  value: BigInt,
  chainId: number,
  context: any
): Promise<void> {
  let marketInfo = await getMarketInfo(marketAddress, chainId, context);

  marketInfo = {
    ...marketInfo,
    marketTokensSupply:
      marketInfo.marketTokensSupply + BigInt(value.toString()),
  };

  context.MarketInfo.set(marketInfo);
}

export async function saveMarketInfo(
  eventData: EventLog1Item,
  chainId: number,
  context: any
): Promise<any> {
  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;
  let id = eventDataAddressItemsItems[0];
  let indexToken = eventDataAddressItemsItems[1];
  let longToken = eventDataAddressItemsItems[2];
  let shortToken = eventDataAddressItemsItems[3];

  let marketInfo: MarketInfo = {
    id: id,
    chainId: chainId,
    marketToken: id,
    indexToken: indexToken,
    longToken: longToken,
    shortToken: shortToken,
    marketTokensSupply: ZERO,
    marketTokensSupplyFromPoolUpdated: ZERO,
  };

  context.MarketInfo.set(marketInfo);

  return marketInfo as MarketInfo;
}
