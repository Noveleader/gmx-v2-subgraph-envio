import {
  ClaimableFundingFeeInfo,
  ClaimAction,
  ClaimCollateralAction,
  ClaimRef,
  Order,
  Transaction,
} from "generated";
import { CollateralClaimedEventData } from "../utils/eventData/CollateralClaimedEventData";
import { ClaimActionType_t } from "generated/src/db/Enums.gen";
import { EventLog1Item, EventLog2Item } from "../interfaces/interface";
import { orderTypes } from "./orders";
import { getTokenPrice } from "./prices";

export async function handleCollateralClaimAction(
  eventName: string,
  eventData: EventLog1Item,
  transaction: Transaction,
  chainId: number,
  context: any
): Promise<void> {
  let data = new CollateralClaimedEventData(eventData);
  let claimCollateralAction = await getOrCreateClaimCollateralAction(
    eventName,
    eventData,
    transaction,
    chainId,
    context
  );

  let claimAction = await getOrCreateClaimAction(
    eventName,
    eventData,
    transaction,
    chainId,
    context
  );

  let claimActionUpdated = await addFieldsToCollateralLikeClaimAction(
    claimAction,
    data,
    context
  );

  let claimCollateralActionUpdated = await addFieldsToCollateralLikeClaimAction(
    claimCollateralAction as ClaimAction,
    data,
    context
  );

  context.ClaimAction.set(claimActionUpdated);
  context.ClaimCollateralAction.set(claimCollateralActionUpdated);
}

export async function saveClaimableFundingFeeInfo(
  eventData: EventLog1Item,
  transaction: Transaction,
  chainId: number,
  context: any
): Promise<ClaimableFundingFeeInfo> {
  let account = eventData.eventData_addressItems_items[2];
  let id = transaction.id + ":" + account;
  let entity: ClaimableFundingFeeInfo | undefined =
    await context.ClaimableFundingFeeInfo.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      chainId: chainId,
      amounts: new Array<bigint>(0),
      marketAddresses: new Array<string>(0),
      tokenAddresses: new Array<string>(0),
    };
  }

  let marketAddresses = entity.marketAddresses;
  marketAddresses.push(eventData.eventData_addressItems_items[0]);

  let tokenAddresses = entity.tokenAddresses;
  tokenAddresses.push(eventData.eventData_addressItems_items[1]);

  let amounts = entity.amounts;
  amounts.push(BigInt(eventData.eventData_uintItems_items[1]));

  entity = {
    ...entity,
    marketAddresses: marketAddresses,
    tokenAddresses: tokenAddresses,
    amounts: amounts,
  };

  context.ClaimableFundingFeeInfo.set(entity);

  return entity!;
}

export function isFundingFeeSettleOrder(order: Order): boolean {
  return (
    order.initialCollateralDeltaAmount === BigInt(1) &&
    order.sizeDeltaUsd === BigInt(0) &&
    order.orderType == orderTypes.get("MarketDecrease")
  );
  // return true;

}

export async function saveClaimActionOnOrderCreated(
  transaction: Transaction,
  eventData: EventLog2Item | EventLog1Item,
  chainId: number,
  context: any
): Promise<void> {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;

  let eventDataBoolItemsItems = eventData.eventData_boolItems_items;

  let orderId = eventDataBytes32ItemsItems[0]!;

  let claimAction = await getOrCreateClaimAction(
    "SettleFundingFeeCreated",
    eventData,
    transaction,
    chainId,
    context
  );

  let marketAddress = eventDataAddressItemsItems[4]!;
  let marketAddresses = claimAction.marketAddresses;
  marketAddresses.push(marketAddress);
  
  let isLong:string = eventDataBoolItemsItems[0]
  let isLongOrders = claimAction.isLongOrders;
  isLongOrders.push(isLong);

  claimAction = {
    ...claimAction,
    marketAddresses: marketAddresses,
    isLongOrders: isLongOrders,
  };

  context.ClaimAction.set(claimAction);
  await createClaimRefIfNotExists(orderId, chainId, context);
}

export async function saveClaimActionOnOrderCancelled(
  transaction: Transaction,
  eventData: EventLog1Item | EventLog2Item,
  chainId: number,
  context: any
) {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let claimAction = await getOrCreateClaimAction(
    "SettleFundingFeeCancelled",
    eventData,
    transaction,
    chainId,
    context
  );

  let orderId = eventDataBytes32ItemsItems[0];
  let order = await context.Order.get(orderId);

  if (order == undefined) throw new Error("Order not found");

  let marketAddresses = claimAction.marketAddresses;
  marketAddresses.push(order.marketAddress);

  let isLongOrders = claimAction.isLongOrders;
  let isLong: string = order.isLong 
  isLongOrders.push(isLong);

  claimAction = {
    ...claimAction,
    marketAddresses: marketAddresses,
    isLongOrders: isLongOrders,
  };

  context.ClaimAction.set(claimAction);
}

export async function saveClaimActionOnOrderExecuted(
  transaction: Transaction,
  eventData: EventLog1Item | EventLog2Item,
  chainId: number,
  context: any
) {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;

  let claimAction = await getOrCreateClaimAction(
    "SettleFundingFeeExecuted",
    eventData,
    transaction,
    chainId,
    context
  );

  let orderId = eventDataBytes32ItemsItems[0];
  let order = await context.Order.get(orderId);

  if (order == undefined) {
    throw new Error("Order not found");
  }

  let account = eventDataAddressItemsItems[0];
  let claimableFundingFeeInfoId = transaction.id + ":" + account;
  let claimableFundingFeeInfo = await context.ClaimableFundingFeeInfo.get(
    claimableFundingFeeInfoId
  );

  if (claimableFundingFeeInfo == undefined) {
    return;
  }

  let sourceTokenAddresses = claimableFundingFeeInfo.tokenAddresses;

  for (let i = 0; i < sourceTokenAddresses.length; i++) {
    let sourceTokenAddress = sourceTokenAddresses[i];
    let targetTokenAddresses = claimAction.tokenAddresses;
    targetTokenAddresses.push(sourceTokenAddress);

    let tokenPrice = await getTokenPrice(sourceTokenAddress, context);
    let tokenPrices = claimAction.tokenPrices;
    tokenPrices.push(BigInt(tokenPrice.toString()));

    claimAction = {
      ...claimAction,
      tokenAddresses: targetTokenAddresses,
      tokenPrices: tokenPrices,
    };
  }

  let sourceAmounts = claimableFundingFeeInfo.amounts;
  let targetAmounts = claimAction.amounts;

  for (let i = 0; i < sourceAmounts.length; i++) {
    let sourceAmount = sourceAmounts[i];
    targetAmounts.push(sourceAmount);
  }

  claimAction = {
    ...claimAction,
    amounts: targetAmounts,
  };

  let tokensCount = claimableFundingFeeInfo.tokenAddresses.length;
  let marketAddresses = claimAction.marketAddresses;
  let isLongOrders = claimAction.isLongOrders;

  for (let i = 0; i < tokensCount; i++) {
    marketAddresses.push(order.marketAddress);
    let isLong: string = order.isLong
    isLongOrders.push(isLong);
  }

  claimAction = {
    ...claimAction,
    marketAddresses: marketAddresses,
    isLongOrders: isLongOrders,
  };

  context.ClaimAction.set(claimAction);
}

async function createClaimRefIfNotExists(
  orderId: string,
  chainId: number,
  context: any
): Promise<void> {
  const claimRef: ClaimRef | undefined = await context.ClaimRef.get(orderId);
  if (claimRef == undefined) {
    let entity: ClaimRef = {
      id: orderId,
      chainId: chainId,
    };
    context.ClaimRef.set(entity);
  }
}

async function getOrCreateClaimCollateralAction(
  eventName: string,
  eventData: EventLog1Item,
  transaction: Transaction,
  chainId: number,
  context: any
): Promise<ClaimCollateralAction> {
  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;

  let account: string = eventDataAddressItemsItems[2];

  let id = transaction.id + ":" + account + ":" + eventName;
  let entity: ClaimCollateralAction | undefined =
    await context.ClaimCollateralAction.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      chainId: chainId,
      marketAddresses: new Array<string>(0),
      tokenAddresses: new Array<string>(0),
      amounts: new Array<bigint>(0),
      tokenPrices: new Array<bigint>(0),
      eventName: _mapClaimActionType(eventName),
      account: account,
      transaction_id: transaction.id,
    };
  }

  context.ClaimCollateralAction.set(entity);

  return entity as ClaimCollateralAction;
}

async function getOrCreateClaimAction(
  eventName: string,
  eventData: EventLog1Item | EventLog2Item,
  transaction: Transaction,
  chainId: number,
  context: any
): Promise<ClaimAction> {
  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;
  let account: string = eventDataAddressItemsItems[2]!;

  let id = transaction.id + ":" + account + ":" + eventName;
  let entity: ClaimAction | undefined = await context.ClaimAction.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      chainId: chainId,
      marketAddresses: new Array<string>(0),
      tokenAddresses: new Array<string>(0),
      amounts: new Array<bigint>(0),
      isLongOrders: new Array<string>(0),
      tokenPrices: new Array<bigint>(0),

      eventName: _mapClaimActionType(eventName),
      account: account,
      transaction_id: transaction.id,
    };

    context.ClaimAction.set(entity);
  }

  return entity as ClaimAction;
}

async function addFieldsToCollateralLikeClaimAction(
  claimAction: ClaimAction,
  eventData: CollateralClaimedEventData,
  context: any
): Promise<ClaimAction> {
  let marketAddress = claimAction.marketAddresses;
  marketAddress.push(eventData.market);

  let tokenAddresses = claimAction.tokenAddresses;
  tokenAddresses.push(eventData.token);

  let tokenPrices = claimAction.tokenPrices;
  let tokenPrice = await getTokenPrice(eventData.token, context);
  tokenPrices.push(BigInt(tokenPrice.toString()));

  let amounts = claimAction.amounts;
  amounts.push(BigInt(Number(eventData.amount)));

  claimAction = {
    ...claimAction,
    marketAddresses: marketAddress,
    tokenAddresses: tokenAddresses,
    tokenPrices: tokenPrices,
    amounts: amounts,
  };

  return claimAction;
}

function _mapClaimActionType(actionType: string): ClaimActionType_t {
  switch (actionType.toLowerCase()) {
    case "claimpriceimpact":
      return "ClaimPriceImpact";
    case "claimfunding":
      return "ClaimFunding";
    case "settlefundingfeecreated":
      return "SettleFundingFeeCreated";
    case "settlefundingfeeexecuted":
      return "SettleFundingFeeExecuted";
    case "settlefundingfeecancelled":
      return "SettleFundingFeeCancelled";
    default:
      throw new Error(`Invalid Action Type: ${actionType}`);
  }
}
