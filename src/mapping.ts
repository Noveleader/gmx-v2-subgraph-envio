import {
  DepositRef,
  EventEmitter_EventLog_eventArgs,
  MarketInfo,
  SellUSDG,
} from "generated/src/Types.gen";
import {
  saveLiquidityProviderIncentivesStat,
  saveUserGlpGmMigrationStatGlpData,
  saveUserGlpGmMigrationStatGmData,
  saveUserMarketInfo,
} from "./entities/incentives/liquidityIncentives";
import { saveDistribution } from "./entities/distributions";
import { getIdFromEvent, getOrCreateTransaction } from "./entities/common";
import { saveUserGmTokensBalanceChange } from "./entities/userBalance";
import { saveMarketInfo, saveMarketInfoTokensSupply } from "./entities/markets";
import {
  EventEmitter_EventLog1_contractRegister,
  EventEmitter_EventLog1_handler,
  EventEmitter_EventLog_handler,
  MarketTokenTemplate,
} from "generated/src/Handlers.gen";
import { EventLog1Item, EventLogItem } from "./interfaces/interface";
import { DepositRef_t } from "generated/src/db/Entities.gen";
import { getTokenPrice } from "./entities/prices";
let ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
let SELL_USDG_ID = "last";

export function handleSellUSDG(event: any, context: any): void {
  let sellUsdgEntity: SellUSDG = {
    id: SELL_USDG_ID,
    txHash: event.transactionHash.toString(),
    logIndex: event.logIndex.toString(),
    feeBasisPoints: event.params.feeBasisPoints,
  };
  context.SellUSDG.set(sellUsdgEntity);
}

export async function handleRemoveLiquidity(
  event: any,
  context: any
): Promise<void> {
  let sellUsdgEntity: SellUSDG | undefined = await context.SellUSDG.get(
    SELL_USDG_ID
  );

  if (sellUsdgEntity == undefined) {
    context.log.error("No SellUSDG entity tx: {}", [
      event.transactionHash.toString(),
    ]);
    throw new Error("No SellUSDG entity");
  }

  if (sellUsdgEntity.txHash != event.transactionHash.toString()) {
    context.log.error(
      "SellUSDG entity tx hashes don't match: expected {} actual {}",
      [event.transaction.hash.toHexString(), sellUsdgEntity.txHash]
    );

    throw new Error("SellUSDG entity tx hashes don't match");
  }

  let expectedLogIndex = Number(event.logIndex.toString()) - 1;

  if (sellUsdgEntity.logIndex != expectedLogIndex) {
    context.log.error(
      "SellUSDG entity incorrect log index: expected {} got {}",
      [
        expectedLogIndex.toString(),
        (sellUsdgEntity.logIndex as number).toString(),
      ]
    );

    throw new Error("SellUSDG entity tx hashes don't match");
  }

  saveUserGlpGmMigrationStatGlpData(
    event.params.account.toString(),
    Number(event.blockTimestamp),
    event.params.usdgAmount,
    sellUsdgEntity.feeBasisPoints,
    context
  );
}

export async function handleBatchSend(event: any, context: any): Promise<void> {
  let typeId = event.params.typeId;
  let token = event.params.token.toString();
  let receivers = event.params.accounts;
  let amounts = event.params.amounts;

  for (let i = 0; i < event.params.accounts.length; i++) {
    let receiver = receivers[i].toString();
    saveDistribution(
      receiver,
      token,
      amounts[i],
      Number(typeId),
      event.transactionHash.toString(),
      Number(event.blockNumber),
      Number(event.blockTimestamp),
      context
    );
  }
}

export async function handleMarketTokenTransfer(
  event: any,
  context: any
): Promise<void> {
  let marketAddress = event.address.toString();
  let from = event.params.from.toString();
  let to = event.params.to.toString();
  let value = event.params.value;

  // `from` user redeems or transfers out GM tokens
  if (from != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat *should* be updated before UserMarketInfo
    await saveLiquidityProviderIncentivesStat(
      from,
      marketAddress,
      "1w",
      value * BigInt(-1),
      event.blockTimestamp,
      context
    );

    await saveUserMarketInfo(from, marketAddress, value * BigInt(-1), context);

    let transaction = await getOrCreateTransaction(event, context);

    await saveUserGmTokensBalanceChange(
      to,
      marketAddress,
      value,
      transaction,
      event.logIndex,
      context
    );
  }

  // `to` user receives GM tokens
  if (to != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat *should* be updated before UserMarketInfo
    await saveLiquidityProviderIncentivesStat(
      to,
      marketAddress,
      "1w",
      value,
      event.blockTimestamp,
      context
    );

    await saveUserMarketInfo(to, marketAddress, value, context);

    let transaction = await getOrCreateTransaction(event, context);

    await saveUserGmTokensBalanceChange(
      to,
      marketAddress,
      value,
      transaction,
      event.logIndex,
      context
    );
  }

  if (from == ADDRESS_ZERO) {
    await saveMarketInfoTokensSupply(marketAddress, value, context);
  }

  if (to == ADDRESS_ZERO) {
    saveMarketInfoTokensSupply(marketAddress, value * BigInt(-1), context);
  }
}

EventEmitter_EventLog_handler(async ({ event, context }) => {
  let eventName = event.params.eventName;
  let eventData: EventLogItem = {
    id: event.transaction.hash.concat(event.logIndex.toString()),
    msgSender: event.params.msgSender,
    eventName: event.params.eventName,
    eventNameHash: event.params.eventNameHash,
    eventData_addressItems_items: event.params.eventData[0][0]
      .map((item) => item[1])
      .flat(),
    eventData_addressItems_arrayItems: event.params.eventData[0][1]
      .map((item) => item[1])
      .flat(),
    eventData_uintItems_items: event.params.eventData[1][0]
      .map((item) => item[1].toString())
      .flat(),
    eventData_uintItems_arrayItems: event.params.eventData[1][1]
      .map((item) => item[1].toString())
      .flat(),
    eventData_intItems_items: event.params.eventData[2][0]
      .map((item) => item[1].toString())
      .flat(),
    eventData_intItems_arrayItems: event.params.eventData[2][1]
      .map((item) => item[1].toString())
      .flat(),
    eventData_boolItems_items: event.params.eventData[3][0]
      .map((item) => item[1].toString())
      .flat(),
    eventData_boolItems_arrayItems: event.params.eventData[3][1]
      .map((item) => item[1].toString())
      .flat(),
    eventData_bytes32Items_items: event.params.eventData[4][0]
      .map((item) => item[1].toString())
      .flat(),
    eventData_bytes32Items_arrayItems: event.params.eventData[4][1]
      .map((item) => item[1].toString())
      .flat(),
    eventData_bytesItems_items: event.params.eventData[5][0]
      .map((item) => item[1].toString())
      .flat(),
    eventData_bytesItems_arrayItems: event.params.eventData[5][1]
      .map((item) => item[1].toString())
      .flat(),
    eventData_stringItems_items: event.params.eventData[6][0]
      .map((item) => item[1])
      .flat(),
    eventData_stringItems_arrayItems: event.params.eventData[6][1]
      .map((item) => item[1])
      .flat(),
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  };

  if (eventName == "DepositExecuted") {
    handleDepositExecuted(event, eventData, context);
  }
});

EventEmitter_EventLog1_handler(async ({ event, context }) => {
  let eventName = event.params.eventName;
  let eventData: EventLog1Item = {
    id: event.transaction.hash.concat(event.logIndex.toString()),
    msgSender: event.params.msgSender,
    eventName: event.params.eventName,
    eventNameHash: event.params.eventNameHash,
    topic1: event.params.topic1,
    eventData_addressItems_items: event.params.eventData[0][0]
      .map((item) => item[1])
      .flat(),
    eventData_addressItems_arrayItems: event.params.eventData[0][1]
      .map((item) => item[1])
      .flat(),
    eventData_uintItems_items: event.params.eventData[1][0]
      .map((item) => item[1].toString())
      .flat(),
    eventData_uintItems_arrayItems: event.params.eventData[1][1]
      .map((item) => item[1].toString())
      .flat(),
    eventData_intItems_items: event.params.eventData[2][0]
      .map((item) => item[1].toString())
      .flat(),
    eventData_intItems_arrayItems: event.params.eventData[2][1]
      .map((item) => item[1].toString())
      .flat(),
    eventData_boolItems_items: event.params.eventData[3][0]
      .map((item) => item[1].toString())
      .flat(),
    eventData_boolItems_arrayItems: event.params.eventData[3][1]
      .map((item) => item[1].toString())
      .flat(),
    eventData_bytes32Items_items: event.params.eventData[4][0]
      .map((item) => item[1].toString())
      .flat(),
    eventData_bytes32Items_arrayItems: event.params.eventData[4][1]
      .map((item) => item[1].toString())
      .flat(),
    eventData_bytesItems_items: event.params.eventData[5][0]
      .map((item) => item[1].toString())
      .flat(),
    eventData_bytesItems_arrayItems: event.params.eventData[5][1]
      .map((item) => item[1].toString())
      .flat(),
    eventData_stringItems_items: event.params.eventData[6][0]
      .map((item) => item[1])
      .flat(),
    eventData_stringItems_arrayItems: event.params.eventData[6][1]
      .map((item) => item[1])
      .flat(),
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  };
  let eventId = getIdFromEvent(event);

  if (eventName == "MarketCreated") {
    await saveMarketInfo(eventData, context);
    EventEmitter_EventLog1_contractRegister(({ event, context }) => {
      context.addMarketTokenTemplate(eventData.eventData_addressItems_items[0]);
    });
    return;
  }
});

async function handleDepositExecuted(
  event: any,
  eventData: EventLogItem,
  context: any
): Promise<void> {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataUintItemsItems = eventData.eventData_uintItems_items;

  let key: string = eventDataBytes32ItemsItems[0];
  let depositRef: DepositRef = await context.DepositRef.get(key);
  let marketInfo: MarketInfo = await context.MarketInfo.get(
    depositRef.marketAddress
  )!;

  let longTokenAmount: BigInt = BigInt(eventDataUintItemsItems[0]);
  let longTokenPrice: BigInt = await getTokenPrice(
    marketInfo.longToken,
    context
  )!;

  let shortTokenAmount: BigInt = BigInt(eventDataUintItemsItems[1]);
  let shortTokenPrice: BigInt = await getTokenPrice(
    marketInfo.shortToken,
    context
  )!;

  let depositUsd: BigInt = BigInt(
    Number(longTokenAmount) * Number(longTokenPrice) +
      Number(shortTokenAmount) * Number(shortTokenPrice)
  );

  await saveUserGlpGmMigrationStatGmData(
    depositRef.account,
    event.block.timestamp,
    depositUsd,
    context
  );
}
