import {
  ClaimRef,
  DepositRef,
  EventEmitter_EventLog_eventArgs,
  MarketInfo,
  Order,
  SellUSDG,
} from "generated/src/Types.gen";
import {
  saveLiquidityProviderIncentivesStat,
  saveMarketIncentivesStat,
  saveUserGlpGmMigrationStatGlpData,
  saveUserGlpGmMigrationStatGmData,
  saveLiquidityProviderInfo,
} from "./entities/incentives/liquidityIncentives";
import { saveDistribution } from "./entities/distributions";
import { getIdFromEvent, getOrCreateTransaction } from "./entities/common";
import { saveUserGmTokensBalanceChange } from "./entities/userBalance";
import {
  getMarketInfo,
  saveMarketInfo,
  saveMarketInfoTokensSupply,
} from "./entities/markets";
import {
  BatchSender_BatchSend_handler,
  BatchSenderNew_BatchSend_handler,
  EventEmitter_EventLog1_contractRegister,
  EventEmitter_EventLog1_handler,
  EventEmitter_EventLog2_handler,
  EventEmitter_EventLog_handler,
  GlpManager_RemoveLiquidity_handler,
  MarketTokenTemplate,
  MarketTokenTemplate_Transfer_contractRegister,
  MarketTokenTemplate_Transfer_handler,
  GlvTokenTemplate_Transfer_handler,
  Vault,
  Vault_SellUSDG_handler,
  GlvTokenTemplate_Transfer_contractRegister,
} from "generated/src/Handlers.gen";
import {
  EventLog1Item,
  EventLog2Item,
  EventLogItem,
} from "./interfaces/interface";
import { DepositRef_t } from "generated/src/db/Entities.gen";
import { getTokenPrice, handleOraclePriceUpdate } from "./entities/prices";
import { saveUserStat } from "./entities/user";
import {
  orderTypes,
  saveOrder,
  saveOrderCancelledState,
  saveOrderCollateralAutoUpdate,
  saveOrderExecutedState,
  saveOrderFrozenState,
  saveOrderSizeDeltaAutoUpdate,
  saveOrderUpdate,
} from "./entities/orders";
import {
  saveOrderCancelledTradeAction,
  saveOrderCreatedTradeAction,
  saveOrderFrozenTradeAction,
  saveOrderUpdatedTradeAction,
  savePositionDecreaseExecutedTradeAction,
  savePositionIncreaseExecutedTradeAction,
  saveSwapExecutedTradeAction,
} from "./entities/trades";
import { handleSwapInfo as saveSwapInfo } from "./entities/swap";
import {
  savePositionVolumeInfo,
  saveSwapVolumeInfo,
  saveVolumeInfo,
} from "./entities/volume";
import {
  getSwapActionByFeeType,
  handlePositionImpactPoolDistributed,
  saveCollectedMarketFees,
  savePositionFeesInfo,
  savePositionFeesInfoWithPeriod,
  saveSwapFeesInfo,
  saveSwapFeesInfoWithPeriod,
} from "./entities/fees";
import { getMarketPoolValueFromContract } from "./contracts/getMarketPoolValueFromContract";
import { getMarketTokensSupplyFromContract } from "./contracts/getMarketTokensSupplyFromContract";
import { saveTradingIncentivesStat } from "./entities/incentives/tradingIncentives";
import {
  savePositionDecrease,
  savePositionIncrease,
} from "./entities/positions";
import { size } from "viem";
import {
  handleCollateralClaimAction,
  saveClaimableFundingFeeInfo as handleClaimableFundingUpdated,
  isFundingFeeSettleOrder,
  saveClaimActionOnOrderCreated,
  saveClaimActionOnOrderCancelled,
  saveClaimActionOnOrderExecuted,
} from "./entities/claims";
import {
  handleClaimableCollateralUpdated,
  handleCollateralClaimed,
  handleSetClaimableCollateralFactorForAccount,
  handleSetClaimableCollateralFactorForTime,
} from "./entities/priceImpactRebate";

let ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
let SELL_USDG_ID = "last";

Vault_SellUSDG_handler(async ({ event, context }) => {
  let sellUsdgEntity: SellUSDG = {
    id: SELL_USDG_ID,
    chainId: event.chainId,
    txHash: event.transaction.hash.toString(),
    logIndex: event.logIndex,
    feeBasisPoints: event.params.feeBasisPoints,
  };
  context.SellUSDG.set(sellUsdgEntity);
});

GlpManager_RemoveLiquidity_handler(async ({ event, context }) => {
  let sellUsdgEntity: SellUSDG | undefined = await context.SellUSDG.get(
    SELL_USDG_ID
  );

  if (sellUsdgEntity == undefined) {
    context.log.error(
      `No SellUSDG entity tx: {} ${[event.transaction.hash.toString()]}`
    );
    throw new Error("No SellUSDG entity");
  }

  if (sellUsdgEntity.txHash != event.transaction.hash.toString()) {
    context.log.error(
      `SellUSDG entity tx hashes don't match: expected {} actual {} 
      ${[event.transaction.hash.toString(), sellUsdgEntity.txHash]}`
    );

    throw new Error("SellUSDG entity tx hashes don't match");
  }

  let expectedLogIndex = Number(event.logIndex.toString()) - 1;

  if (sellUsdgEntity.logIndex != expectedLogIndex) {
    context.log.error(
      `SellUSDG entity incorrect log index: expected {} got {} 
      [
        expectedLogIndex.toString(),
        (sellUsdgEntity.logIndex as number).toString(),
      ]`
    );

    throw new Error("SellUSDG entity tx hashes don't match");
  }

  await saveUserGlpGmMigrationStatGlpData(
    event.params.account.toString(),
    Number(event.block.timestamp),
    event.params.usdgAmount,
    sellUsdgEntity.feeBasisPoints,
    event.chainId,
    context
  );
});

BatchSender_BatchSend_handler(async ({ event, context }) => {
  let typeId = event.params.typeId;
  let token = event.params.token.toString();
  let receivers = event.params.accounts;
  let amounts = event.params.amounts;

  for (let i = 0; i < event.params.accounts.length; i++) {
    let receiver = receivers[i].toString();
    await saveDistribution(
      receiver,
      token,
      amounts[i],
      Number(typeId),
      event.transaction.hash,
      event.block.number,
      event.block.timestamp,
      event.chainId,
      context
    );
  }
});

BatchSenderNew_BatchSend_handler(async ({ event, context }) => {
  let typeId = event.params.typeId;
  let token = event.params.token.toString();
  let receivers = event.params.accounts;
  let amounts = event.params.amounts;

  for (let i = 0; i < event.params.accounts.length; i++) {
    let receiver = receivers[i].toString();
    await saveDistribution(
      receiver,
      token,
      amounts[i],
      Number(typeId),
      event.transaction.hash,
      event.block.number,
      event.block.timestamp,
      event.chainId,
      context
    );
  }
});

GlvTokenTemplate_Transfer_handler(async ({ event, context }) => {
  let glvAddress = event.srcAddress.toString();
  let from = event.params.from.toString();
  let to = event.params.to.toString();
  let value = event.params.value;

  // `from` user redeems or transfers out GLV tokens
  if (from != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat "should" be updated before LiquidityProviderInfo
    saveLiquidityProviderIncentivesStat(
      from,
      glvAddress,
      "Glv",
      "1w",
      value * BigInt(-1),
      event.block.timestamp,
      event.chainId,
      context
    );

    saveLiquidityProviderInfo(
      from,
      glvAddress,
      "Glv",
      value * BigInt(-1),
      event.chainId,
      context
    );
  }

  // `to` user receives GLV Tokens
  if (to != ADDRESS_ZERO) {
    saveLiquidityProviderIncentivesStat(
      to,
      glvAddress,
      "Glv",
      "1w",
      value,
      event.block.timestamp,
      event.chainId,
      context
    );

    saveLiquidityProviderInfo(
      to,
      glvAddress,
      "Glv",
      value,
      event.chainId,
      context
    );
  }
});

MarketTokenTemplate_Transfer_handler(async ({ event, context }) => {
  let marketAddress = event.srcAddress.toString();
  let from = event.params.from.toString();
  let to = event.params.to.toString();
  let value = event.params.value;

  // `from` user redeems or transfers out GM tokens
  if (from != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat *should* be updated before UserMarketInfo
    await saveLiquidityProviderIncentivesStat(
      from,
      marketAddress,
      "Market",
      "1w",
      value * BigInt(-1),
      event.block.timestamp,
      event.chainId,
      context
    );

    await saveLiquidityProviderInfo(
      from,
      marketAddress,
      "Market",
      value * BigInt(-1),
      event.chainId,
      context
    );

    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );

    await saveUserGmTokensBalanceChange(
      to,
      marketAddress,
      value,
      transaction,
      BigInt(event.logIndex),
      event.chainId,
      context
    );
  }

  // `to` user receives GM tokens
  if (to != ADDRESS_ZERO) {
    // LiquidityProviderIncentivesStat *should* be updated before LiquidityProviderInfo
    await saveLiquidityProviderIncentivesStat(
      to,
      marketAddress,
      "Market",
      "1w",
      value,
      event.block.timestamp,
      event.chainId,
      context
    );

    await saveLiquidityProviderInfo(
      to,
      marketAddress,
      "Market",
      value,
      event.chainId,
      context
    );

    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );

    await saveUserGmTokensBalanceChange(
      to,
      marketAddress,
      value,
      transaction,
      BigInt(event.logIndex),
      event.chainId,
      context
    );
  }

  if (from == ADDRESS_ZERO) {
    await saveMarketInfoTokensSupply(
      marketAddress,
      value,
      event.chainId,
      context
    );
  }

  if (to == ADDRESS_ZERO) {
    await saveMarketInfoTokensSupply(
      marketAddress,
      value * BigInt(-1),
      event.chainId,
      context
    );
  }
});

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
    await handleDepositExecuted(event, eventData, event.chainId, context);
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
    await saveMarketInfo(eventData, event.chainId, context);
    // MarketTokenTemplate_Transfer_contractRegister(({ event, context }) => {
    //   context.addMarketTokenTemplate(eventData.eventData_addressItems_items[0]);
    // });
    return;
  }

  if (eventName == "GlvCreated") {
    // saveMarketInfo(eventData);
    context.log.warn(
      `block number: ${event.block.number} tx hash: ${event.transaction.hash}`
    );

    let glvToken = eventData.eventData_addressItems_items[0];
    context.log.warn(`glv token: ${[glvToken ? glvToken : "undefined"]}`);
    GlvTokenTemplate_Transfer_contractRegister(({ event, context }) => {
      context.addGlvTokenTemplate(glvToken);
    });
    return;
  }
  
  if (eventName == "DepositCreated") {
    await handleDepositCreated(event, eventData, context);
    return;
  }

  if (eventName == "WithdrawalCreated") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let account = eventData.eventData_addressItems_items[0];

    await saveUserStat(
      "withdrawal",
      account,
      transaction.timestamp,
      event.chainId,
      context
    );
  }

  if (eventName == "OrderExecuted") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let order = await saveOrderExecutedState(eventData, transaction, context);

    if (order == null) {
      return;
    }

    if (
      order.orderType == orderTypes.get("MarketSwap") ||
      order.orderType == orderTypes.get("LimitSwap")
    ) {
      await saveSwapExecutedTradeAction(
        eventId,
        order as Order,
        transaction,
        event.chainId,
        context
      );
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease")
    ) {
      await savePositionIncreaseExecutedTradeAction(
        eventId,
        order as Order,
        transaction,
        event.chainId,
        context
      );
    } else if (
      order.orderType == orderTypes.get("MarketDecrease") ||
      order.orderType == orderTypes.get("LimitDecrease") ||
      order.orderType == orderTypes.get("StopLossDecrease") ||
      order.orderType == orderTypes.get("Liquidation")
    ) {
      await savePositionDecreaseExecutedTradeAction(
        eventId,
        order as Order,
        transaction,
        event.chainId,
        context
      );
    }
    return;
  }

  if (eventName == "OrderCancelled") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let order = await saveOrderCancelledState(eventData, transaction, context);
    if (order !== null) {
      await saveOrderCancelledTradeAction(
        eventId,
        order as Order,
        order.cancelledReason as string,
        order.cancelledReasonBytes as string,
        transaction,
        event.chainId,
        context
      );
    }

    return;
  }

  if (eventName == "OrderUpdated") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let order = await saveOrderUpdate(eventData, context);

    if (order !== null) {
      await saveOrderUpdatedTradeAction(
        eventId,
        order as Order,
        transaction,
        event.chainId,
        context
      );
    }

    return;
  }

  if (eventName == "OrderFrozen") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let order = await saveOrderFrozenState(eventData, context);

    if (order == null) {
      return;
    }

    await saveOrderFrozenTradeAction(
      eventId,
      order as Order,
      order.frozenReason as string,
      order.frozenReasonBytes as string,
      transaction,
      event.chainId,
      context
    );

    return;
  }

  if (eventName == "OrderSizeDeltaAutoUpdated") {
    await saveOrderSizeDeltaAutoUpdate(eventData, context);
    return;
  }

  if (eventName == "OrderCollateralDeltaAmountAutoUpdated") {
    await saveOrderCollateralAutoUpdate(eventData, context);
    return;
  }

  if (eventName == "SwapInfo") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let tokenIn = eventData.eventData_addressItems_items[2];
    let tokenOut = eventData.eventData_addressItems_items[3];

    let amountIn = BigInt(eventData.eventData_uintItems_items[2]);
    let tokenInPrice = BigInt(eventData.eventData_uintItems_items[0]);

    let volumeUsd = amountIn! * tokenInPrice!;

    let receiver = eventData.eventData_addressItems_items[1];

    await saveSwapInfo(eventData, transaction, event.chainId, context);
    await saveSwapVolumeInfo(
      transaction.timestamp,
      tokenIn,
      tokenOut,
      volumeUsd,
      event.chainId,
      context
    );
    await saveUserStat(
      "swap",
      receiver,
      transaction.timestamp,
      event.chainId,
      context
    );
    return;
  }

  if (eventName == "SwapFeesCollected") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let swapFeesInfo = await saveSwapFeesInfo(
      eventData,
      eventId,
      transaction,
      event.chainId,
      context
    );
    let tokenPrice = BigInt(eventData.eventData_uintItems_items[0]);
    let feeReceiverAmount = BigInt(eventData.eventData_uintItems_items[1]);
    let feeAmountForPool = BigInt(eventData.eventData_uintItems_items[2]);
    let amountAfterFees = BigInt(eventData.eventData_uintItems_items[3]);

    let action = getSwapActionByFeeType(swapFeesInfo.swapFeeType, context);
    let totalAmountIn = amountAfterFees + feeAmountForPool + feeReceiverAmount;

    let volumeUsd = totalAmountIn * tokenPrice;
    let poolValue = await getMarketPoolValueFromContract(
      swapFeesInfo.marketAddress,
      event.chainId,
      transaction,
      context
    );

    let marketTokensSupply = isDepositOrWithdrawalAction(action)
      ? await getMarketTokensSupplyFromContract(
          swapFeesInfo.marketAddress,
          event.chainId,
          event.block.number,
          context
        )
      : (
          await getMarketInfo(
            swapFeesInfo.marketAddress,
            event.chainId,
            context
          )
        ).marketTokensSupply;

    await saveCollectedMarketFees(
      transaction,
      swapFeesInfo.marketAddress,
      poolValue,
      swapFeesInfo.feeUsdForPool,
      marketTokensSupply,
      event.chainId,
      context
    );

    await saveVolumeInfo(
      action,
      transaction.timestamp,
      volumeUsd,
      event.chainId,
      context
    );
    await saveSwapFeesInfoWithPeriod(
      feeAmountForPool,
      feeReceiverAmount,
      tokenPrice,
      transaction.timestamp,
      event.chainId,
      context
    );

    return;
  }

  if (eventName == "PositionFeesInfo") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    await savePositionFeesInfo(
      eventData,
      "PositionFeesInfo",
      transaction,
      event.chainId,
      context
    );

    return;
  }

  if (eventName == "PositionFeesCollected") {
    let eventDataUintItemsItems = eventData.eventData_uintItems_items;
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let positionFeeAmount = BigInt(eventDataUintItemsItems[24]);
    let positionFeeAmountForPool = BigInt(eventDataUintItemsItems[23]);
    let collateralTokenPriceMin = BigInt(eventDataUintItemsItems[0]);
    let borrowingFeeUsd = BigInt(eventDataUintItemsItems[14]);
    let positionFeesInfo = await savePositionFeesInfo(
      eventData,
      eventName,
      transaction,
      event.chainId,
      context
    );

    let poolValue = await getMarketPoolValueFromContract(
      positionFeesInfo.marketAddress,
      event.chainId,
      transaction,
      context
    );

    let marketInfo = await getMarketInfo(
      positionFeesInfo.marketAddress,
      event.chainId,
      context
    );

    await saveCollectedMarketFees(
      transaction,
      positionFeesInfo.marketAddress,
      poolValue,
      positionFeesInfo.feeUsdForPool,
      marketInfo.marketTokensSupply,
      event.chainId,
      context
    );

    await savePositionFeesInfoWithPeriod(
      positionFeeAmount,
      positionFeeAmountForPool,
      borrowingFeeUsd,
      collateralTokenPriceMin,
      transaction.timestamp,
      event.chainId,
      context
    );

    await saveTradingIncentivesStat(
      eventData.eventData_addressItems_items[3],
      event.block.timestamp,
      positionFeeAmount,
      collateralTokenPriceMin,
      event.chainId,
      context
    );

    return;
  }

  if (eventName == "PositionIncrease") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let collateralToken = eventData.eventData_addressItems_items[2];
    let marketToken = eventData.eventData_addressItems_items[1];
    let sizeDeltaUsd = eventData.eventData_uintItems_items[12];
    let account = eventData.eventData_addressItems_items[0];

    savePositionIncrease(eventData, transaction, event.chainId, context);
    await saveVolumeInfo(
      "margin",
      transaction.timestamp,
      BigInt(sizeDeltaUsd),
      event.chainId,
      context
    );
    await savePositionVolumeInfo(
      transaction.timestamp,
      collateralToken,
      marketToken,
      BigInt(sizeDeltaUsd),
      event.chainId,
      context
    );
    await saveUserStat(
      "margin",
      account,
      transaction.timestamp,
      event.chainId,
      context
    );

    return;
  }

  if (eventName == "PositionDecrease") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let collateralToken = eventData.eventData_addressItems_items[2];
    let marketToken = eventData.eventData_addressItems_items[1];
    let sizeDeltaUsd = eventData.eventData_uintItems_items[12];
    let account = eventData.eventData_addressItems_items[0];

    savePositionDecrease(eventData, transaction, event.chainId, context);
    await saveVolumeInfo(
      "margin",
      transaction.timestamp,
      BigInt(sizeDeltaUsd),
      event.chainId,
      context
    );

    await savePositionVolumeInfo(
      transaction.timestamp,
      collateralToken,
      marketToken,
      BigInt(sizeDeltaUsd),
      event.chainId,
      context
    );

    await saveUserStat(
      "margin",
      account,
      transaction.timestamp,
      event.chainId,
      context
    );
    return;
  }

  if (eventName == "FundingFeesClaimed") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    await handleCollateralClaimAction(
      "ClaimFunding",
      eventData,
      transaction,
      event.chainId,
      context
    );
    return;
  }

  if (eventName == "CollateralClaimed") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    await handleCollateralClaimAction(
      "ClaimPriceImpact",
      eventData,
      transaction,
      event.chainId,
      context
    );

    await handleCollateralClaimed(eventData, event.chainId, context);
  }

  if (eventName == "ClaimableFundingUpdated") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    await handleClaimableFundingUpdated(
      eventData,
      transaction,
      event.chainId,
      context
    );
    return;
  }

  if (eventName == "MarketPoolValueUpdated") {
    // `saveMarketIncentivesStat should be called before `MarketPoolInfo` entity is updated
    await saveMarketIncentivesStat(eventData, event, event.chainId, context);
    return;
  }

  if (eventName == "PositionImpactPoolDistributed") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    await handlePositionImpactPoolDistributed(
      eventData,
      transaction,
      event.chainId,
      event.block.number,
      context
    );
    return;
  }

  if (eventName == "OraclePriceUpdate") {
    await handleOraclePriceUpdate(eventData, event.chainId, context);
    return;
  }

  if (eventName == "ClaimableCollateralUpdated") {
    await handleClaimableCollateralUpdated(eventData, event.chainId, context);
    return;
  }
});

EventEmitter_EventLog2_handler(async ({ event, context }) => {
  let eventName = event.params.eventName;
  let eventData: EventLog2Item = {
    id: event.transaction.hash.concat(event.logIndex.toString()),
    msgSender: event.params.msgSender,
    eventName: event.params.eventName,
    eventNameHash: event.params.eventNameHash,
    topic1: event.params.topic1,
    topic2: event.params.topic2,
    eventData_addressItems_items: event.params.eventData[0][0]
      .map((item) => item[1])
      .flat(),
    eventData_addressItems_arrayItems: event.params.eventData[0][1].map(
      (item) => item[1]
    ),
    eventData_uintItems_items: event.params.eventData[1][0]
      .map((item) => item[1].toString())
      .flat(),
    eventData_uintItems_arrayItems: event.params.eventData[1][1].map((item) =>
      item[1].toString()
    ),
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

  if (eventName == "OrderCreated") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let order = saveOrder(eventData, transaction, event.chainId, context);
    if (isFundingFeeSettleOrder(order)) {
      await saveClaimActionOnOrderCreated(
        transaction,
        eventData,
        event.chainId,
        context
      );
    } else {
      await saveOrderCreatedTradeAction(
        eventId,
        order,
        transaction,
        event.chainId,
        context
      );
    }
    return;
  }

  if (eventName == "SetClaimableCollateralFactorForTime") {
    await handleSetClaimableCollateralFactorForTime(
      eventData,
      event.chainId,
      context
    );
    return;
  }

  if (eventName == "SetClaimableCollateralFactorForAccount") {
    await handleSetClaimableCollateralFactorForAccount(
      eventData,
      event.chainId,
      context
    );
    return;
  }

  if (eventName == "DepositCreated") {
    await handleDepositCreated(event, eventData, context);
    return;
  }

  if (eventName == "DepositExecuted") {
    await handleDepositExecuted(event, eventData, event.chainId, context);
    return;
  }

  if (eventName == "WithdrawalCreated") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let account = eventData.eventData_addressItems_items[0];
    await saveUserStat(
      "withdrawal",
      account,
      transaction.timestamp,
      event.chainId,
      context
    );
    return;
  }

  if (eventName == "OrderExecuted") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let order = await saveOrderExecutedState(eventData, transaction, context);

    if (order == undefined) {
      return;
    }

    if (
      order.orderType == orderTypes.get("MarketSwap") ||
      order.orderType == orderTypes.get("LimitSwap")
    ) {
      await saveSwapExecutedTradeAction(
        eventId,
        order as Order,
        transaction,
        event.chainId,
        context
      );
    } else if (
      order.orderType == orderTypes.get("MarketIncrease") ||
      order.orderType == orderTypes.get("LimitIncrease")
    ) {
      await savePositionIncreaseExecutedTradeAction(
        eventId,
        order as Order,
        transaction,
        event.chainId,
        context
      );
    } else if (
      order.orderType == orderTypes.get("MarketDecrease") ||
      order.orderType == orderTypes.get("LimitDecrease") ||
      order.orderType == orderTypes.get("StopLossDecrease") ||
      order.orderType == orderTypes.get("Liquidation")
    ) {
      let claimRef: ClaimRef | undefined = await context.ClaimRef.get(order.id);
      if (claimRef != undefined) {
        await saveClaimActionOnOrderExecuted(
          transaction,
          eventData,
          event.chainId,
          context
        );
      } else {
        await savePositionDecreaseExecutedTradeAction(
          eventId,
          order as Order,
          transaction,
          event.chainId,
          context
        );
      }
    }
    return;
  }

  if (eventName == "OrderCancelled") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let order = await saveOrderCancelledState(eventData, transaction, context);

    if (order != null) {
      let claimRef: ClaimRef | undefined = await context.ClaimRef.get(order.id);

      if (claimRef != undefined) {
        await saveClaimActionOnOrderCancelled(
          transaction,
          eventData,
          event.chainId,
          context
        );
      } else {
        await saveOrderCancelledTradeAction(
          eventId,
          order!,
          order.cancelledReason as string,
          order.cancelledReasonBytes as string,
          transaction,
          event.chainId,
          context
        );
      }
    }
    return;
  }

  if (eventName == "OrderUpdated") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let order = await saveOrderUpdate(eventData, context);

    if (order !== null) {
      await saveOrderUpdatedTradeAction(
        eventId,
        order as Order,
        transaction,
        event.chainId,
        context
      );
    }
    return;
  }

  if (eventName == "OrderFrozen") {
    let transaction = await getOrCreateTransaction(
      event,
      event.chainId,
      context
    );
    let order = await saveOrderFrozenState(eventData, context);

    if (order == null) {
      return;
    }

    await saveOrderFrozenTradeAction(
      eventId,
      order as Order,
      order.frozenReason as string,
      order.frozenReasonBytes as string,
      transaction,
      event.chainId,
      context
    );

    return;
  }
});

async function handleDepositCreated(
  event: any,
  eventData: EventLog1Item | EventLog2Item,
  context: any
): Promise<void> {
  let transaction = await getOrCreateTransaction(event, event.chainId, context);
  let account = eventData.eventData_addressItems_items[0];
  await saveUserStat(
    "deposit",
    account,
    transaction.timestamp,
    event.chainId,
    context
  );

  let depositRef: DepositRef = {
    id: eventData.eventData_bytes32Items_items[0],
    chainId: event.chainId,
    marketAddress: eventData.eventData_addressItems_items[3],
    account: eventData.eventData_addressItems_items[0],
  };

  context.DepositRef.set(depositRef);
}

async function handleDepositExecuted(
  event: any,
  eventData: EventLogItem | EventLog2Item,
  chainId: number,
  context: any
): Promise<void> {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataUintItemsItems = eventData.eventData_uintItems_items;

  let key: string = eventDataBytes32ItemsItems[0];
  let depositRef: DepositRef = await context.DepositRef.get(key)!;
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

  let depositUsd: BigInt =
    BigInt(longTokenAmount.toString()) * BigInt(longTokenPrice.toString()) +
    BigInt(shortTokenAmount.toString()) * BigInt(shortTokenPrice.toString());

  await saveUserGlpGmMigrationStatGmData(
    depositRef.account,
    event.block.timestamp,
    depositUsd,
    chainId,
    context
  );
}

function isDepositOrWithdrawalAction(action: string): boolean {
  return action == "deposit" || action == "withdrawal";
}
