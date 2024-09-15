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
  chainId: number,
  context: any
): Promise<void> {
  let tradeAction = getTradeActionFromOrder(eventId, chainId, order);

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

export function getTradeActionFromOrder(
  eventId: string,
  chainId: number,
  order: Order
): TradeAction {
  let newTradeActionEntity: TradeAction = {
    id: eventId,
    chainId: chainId,
    eventName: "",

    orderKey: order.id,
    orderType: order.orderType,

    account: order.account,
    marketAddress: order.marketAddress,
    swapPath: order.swapPath,
    initialCollateralTokenAddress: order.initialCollateralTokenAddress,
    initialCollateralDeltaAmount: order.initialCollateralDeltaAmount,

    sizeDeltaUsd: order.sizeDeltaUsd,
    triggerPrice: order.triggerPrice,
    acceptablePrice: order.acceptablePrice,
    executionPrice: undefined,
    collateralTokenPriceMin: undefined,
    collateralTokenPriceMax: undefined,
    indexTokenPriceMin: undefined,
    indexTokenPriceMax: undefined,
    priceImpactDiffUsd: undefined,
    priceImpactUsd: undefined,
    priceImpactAmount: undefined,
    positionFeeAmount: undefined,
    borrowingFeeAmount: undefined,
    fundingFeeAmount: undefined,
    pnlUsd: undefined,
    basePnlUsd: undefined,
    isLong: undefined,

    minOutputAmount: order.minOutputAmount,
    executionAmountOut: undefined,
    shouldUnwrapNativeToken: order.shouldUnwrapNativeToken,

    reason: undefined,
    reasonBytes: undefined,

    timestamp: 0,
    transaction_id: "",
  };

  return newTradeActionEntity;
}

export async function savePositionIncreaseExecutedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction,
  chainId: number,
  context: any
): Promise<TradeAction> {
  let tradeAction = getTradeActionFromOrder(eventId, chainId, order);

  let positionIncrease: PositionIncrease | undefined =
    await context.PositionIncrease.get(order.id);

  let marketInfo = await getMarketInfo(order.marketAddress, chainId, context);

  let tokenPrice = await context.TokenPrice.get(marketInfo.indexToken);

  if (positionIncrease == undefined) {
    throw new Error("PositionIncrease not found " + order.id);
  }

  let positionFeesInfo: PositionFeesInfo | undefined =
    await context.PositionFeesInfo.get(
      order.id + ":" + "PositionFeesCollected"
    );

  if (positionFeesInfo == undefined) {
    context.log.warn(`PositionFeesInfo not found {} ${order.id}`);
    throw new Error("PositionFeesInfo not found " + order.id);
  }

  tradeAction = {
    ...tradeAction,
    indexTokenPriceMin: tokenPrice.minPrice,
    indexTokenPriceMax: tokenPrice.maxPrice,
  };

  tradeAction = {
    ...tradeAction,
    eventName: "OrderExecuted",
    orderKey: order.id,
    executionPrice: positionIncrease.executionPrice,
    priceImpactUsd: positionIncrease.priceImpactUsd,

    collateralTokenPriceMin: positionFeesInfo.collateralTokenPriceMin,
    collateralTokenPriceMax: positionFeesInfo.collateralTokenPriceMax,

    positionFeeAmount: positionFeesInfo.positionFeeAmount,
    borrowingFeeAmount: positionFeesInfo.borrowingFeeAmount,
    fundingFeeAmount: positionFeesInfo.fundingFeeAmount,
    transaction_id: transaction.id,
    timestamp: transaction.timestamp,
  };

  context.TradeAction.set(tradeAction);

  return tradeAction;
}

export async function savePositionDecreaseExecutedTradeAction(
  eventId: string,
  order: Order,
  transaction: Transaction,
  chainId: number,
  context: any
): Promise<void> {
  let tradeAction = getTradeActionFromOrder(eventId, chainId, order);

  let positionDecrease: PositionDecrease | undefined =
    await context.PositionDecrease.get(order.id);

  let positionFeesInfo: PositionFeesInfo | undefined = undefined;

  let marketInfo = await getMarketInfo(order.marketAddress, chainId, context);

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
    positionFeesInfo = await context.PositionFeesInfo.get(
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
  chainId: number,
  context: any
): Promise<TradeAction> {
  let tradeAction = getTradeActionFromOrder(eventId, chainId, order);

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
  chainId: number,
  context: any
): Promise<TradeAction> {
  let tradeAction = getTradeActionFromOrder(eventId, chainId, order);

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
  chainId: number,
  context: any
): Promise<TradeAction> {
  let tradeAction = getTradeActionFromOrder(eventId, chainId, order);

  if (order.marketAddress != ZERO_ADDRESS) {
    let marketInfo = await getMarketInfo(order.marketAddress, chainId, context);
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
  chainId: number,
  context: any
): Promise<TradeAction> {
  let tradeAction = getTradeActionFromOrder(eventId, chainId, order);
  tradeAction = {
    ...tradeAction,
    eventName: "OrderCreated",
    transaction_id: transaction.id,
    timestamp: transaction.timestamp,
  };

  context.TradeAction.set(tradeAction);

  return tradeAction;
}
