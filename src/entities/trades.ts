import {
  Order,
  PositionDecrease,
  PositionFeesInfo,
  PositionIncrease,
  SwapInfo,
  TokenPrice,
  TradeAction,
  Transaction,
} from "generated/src/Types.gen";
import { getSwapInfoId } from "./swap";
import { getMarketInfo } from "./markets";
import { orderTypes } from "./orders";

let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export async function saveSwapExecutedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction,
  context: any
): Promise<void> {
  let tradeAction = await getTradeActionFromOrder(eventId, order, context);

  let swapPath = order.swapPath!;

  let lastSwapAddress: string = swapPath[swapPath?.length - 1];

  let swapInfoId = getSwapInfoId(order.id, lastSwapAddress);

  let swapInfo: SwapInfo | undefined = await context.SwapInfo.get(swapInfoId);

  tradeAction = {
    ...tradeAction,
    eventName: "OrderExecuted",
    orderKey: order.id,
    orderType: order.orderType,
  };

  if (swapInfo != undefined) {
    tradeAction = {
      ...tradeAction,
      executionAmountOut: swapInfo.amountOut,
    };
  } else {
    tradeAction = {
      ...tradeAction,
      executionAmountOut: BigInt(0),
    };
  }

  tradeAction = {
    ...tradeAction,
    transaction_id: transaction.id,
    timestamp: transaction.timestamp,
  };

  context.TradeAction.set(tradeAction);
}

export async function getTradeActionFromOrder(
  eventId: string,
  order: Order,
  context: any
): Promise<TradeAction> {
  let tradeAction = await context.TradeAction.get(eventId);

  let newTradeActionEntity: TradeAction = {
    ...tradeAction,
    orderKey: order.id,
    account: order.account,
    marketAddress: order.marketAddress,
    swapPath: order.swapPath,
    initialCollateralTokenAddress: order.initialCollateralTokenAddress,

    initialCollateralDeltaAmount: order.initialCollateralDeltaAmount,
    sizeDeltaUsd: order.sizeDeltaUsd,
    triggerPrice: order.triggerPrice,
    acceptablePrice: order.acceptablePrice,
    minOutputAmount: order.minOutputAmount,

    orderType: order.orderType,
    shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,
    isLong: order.isLong,
  };

  return newTradeActionEntity;
}

export async function savePositionIncreaseExecutedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction,
  context: any
): Promise<TradeAction> {
  let tradeAction = await getTradeActionFromOrder(eventId, order, context);

  let positionIncrease: PositionIncrease | undefined =
    await context.PositionIncrease.get(order.id);

  let marketInfo = await getMarketInfo(order.marketAddress, context);

  let tokenPrice = await context.TokenPrice.get(marketInfo);

  tradeAction = {
    ...tradeAction,
    indexTokenPriceMin: tokenPrice.minPrice,
    indexTokenPriceMax: tokenPrice.maxPrice,
  };

  if (positionIncrease == undefined) {
    throw new Error("PositionIncrease not found " + order.id);
  }

  tradeAction = {
    ...tradeAction,
    eventName: "OrderExecuted",
    orderKey: order.id,
    orderType: order.orderType,
    initialCollateralDeltaAmount: positionIncrease.collateralDeltaAmount,
    sizeDeltaUsd: positionIncrease.sizeDeltaUsd,
    executionPrice: positionIncrease.executionPrice,
    priceImpactUsd: positionIncrease.priceImpactUsd,
    transaction_id: transaction.id,
    timestamp: tradeAction.timestamp,
  };

  context.TradeAction.set(tradeAction);

  return tradeAction;
}

export async function savePositionDecreaseExecutedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction,
  context: any
): Promise<void> {
  let tradeAction = await getTradeActionFromOrder(eventId, order, context);

  let positionDecrease: PositionDecrease | undefined =
    await context.PositionDecrease.get(order.id);

  let positionFeesInfo: PositionFeesInfo | undefined = undefined;

  let marketInfo = await getMarketInfo(order.marketAddress, context);

  let tokenPrice: TokenPrice = await context.TokenPrice.get(
    marketInfo.indexToken
  );

  tradeAction = {
    ...tradeAction,
    indexTokenPriceMin: tokenPrice.minPrice,
    indexTokenPriceMax: tokenPrice.maxPrice,
  };

  if (positionDecrease == undefined) {
    throw new Error("PositionDecrease not found " + order.id);
  }

  let isLiquidation = order.orderType == orderTypes.get("Liquidation");

  if (isLiquidation) {
    positionFeesInfo = await context.PositionFeesInfo.get(
      order.id + ":" + "PositionFeesInfo"
    );
  }

  if (positionFeesInfo == undefined) {
    positionFeesInfo = await context.PositionFeeInfo.get(
      order.id + ":" + "PositionFeesCollected"
    );
  }

  if (positionFeesInfo == undefined) {
    context.log.warn(`PositionFeesInfo not found {} ${[order.id]}`);
    throw new Error("PositionFeesInfo not found " + order.id);
  }

  tradeAction = {
    ...tradeAction,
    eventName: "OrderExecuted",
    orderKey: order.id,
    orderType: order.orderType,
    executionPrice: positionDecrease.executionPrice,
    initialCollateralDeltaAmount: positionDecrease.collateralDeltaAmount,
    sizeDeltaUsd: positionDecrease.sizeDeltaUsd,
    collateralTokenPriceMin: positionFeesInfo.collateralTokenPriceMin,
    collateralTokenPriceMax: positionFeesInfo.collateralTokenPriceMax,
    priceImpactDiffUsd: positionDecrease.priceImpactDiffUsd,
    priceImpactAmount: positionDecrease.priceImpactAmount,
    priceImpactUsd: positionDecrease.priceImpactUsd,
    positionFeeAmount: positionFeesInfo.positionFeeAmount,
    borrowingFeeAmount: positionFeesInfo.borrowingFeeAmount,
    fundingFeeAmount: positionFeesInfo.fundingFeeAmount,

    basePnlUsd: positionDecrease.basePnlUsd,
    pnlUsd:
      positionDecrease.basePnlUsd -
      (positionFeesInfo.positionFeeAmount +
        positionFeesInfo.borrowingFeeAmount +
        positionFeesInfo.fundingFeeAmount +
        positionFeesInfo.collateralTokenPriceMax) +
      positionDecrease.priceImpactUsd,

    transaction_id: transaction.id,
    timestamp: transaction.timestamp,
  };

  context.TradeAction.set(tradeAction);
}

export async function saveOrderCancelledTradeAction(
  eventId: string,
  order: Order,
  reason: string,
  reasonBytes: string,
  transaction: Transaction,
  context: any
): Promise<TradeAction> {
  let tradeAction = await getTradeActionFromOrder(eventId, order, context);

  tradeAction = {
    ...tradeAction,
    eventName: "OrderCancelled",
    reason: reason,
    reasonBytes: reasonBytes,
    transaction_id: transaction.id,
    timestamp: transaction.timestamp,
  };

  context.TradeAction.set(tradeAction);

  return tradeAction;
}

export async function saveOrderUpdatedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction,
  context: any
): Promise<TradeAction> {
  let tradeAction = await getTradeActionFromOrder(eventId, order, context);

  tradeAction = {
    ...tradeAction,
    eventName: "OrderUpdated",
    transaction_id: transaction.id,
    timestamp: transaction.timestamp,
  };

  context.TradeAction.set(tradeAction);

  return tradeAction as TradeAction;
}

export async function saveOrderFrozenTradeAction(
  eventId: string,
  order: Order,
  reason: string,
  reasonBytes: string,
  transaction: Transaction,
  context: any
): Promise<TradeAction> {
  let tradeAction = await getTradeActionFromOrder(eventId, order, context);

  if (order.marketAddress != ZERO_ADDRESS) {
    let marketInfo = await getMarketInfo(order.marketAddress, context);
    let tokenPrice = await context.TokenPrice.get(marketInfo.indexToken);
    tradeAction = {
      ...tradeAction,
      indexTokenPriceMin: tokenPrice.minPrice,
      indexTokenPriceMax: tokenPrice.maxPrice,
    };
  }

  tradeAction = {
    ...tradeAction,
    eventName: "OrderFrozen",
    reason: reason,
    reasonBytes: reasonBytes,
    transaction_id: transaction.id,
    timestamp: transaction.timestamp,
  };

  context.TradeAction.set(tradeAction);

  return tradeAction;
}

export async function saveOrderCreatedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction,
  context: any
): Promise<TradeAction> {
  let tradeAction = await getTradeActionFromOrder(eventId, order, context);
  tradeAction = {
    ...tradeAction,
    eventName: "OrderCreated",
    transaction_id: transaction.id,
    timestamp: transaction.timestamp,
  };

  context.TradeAction.set(tradeAction);

  return tradeAction;
}
