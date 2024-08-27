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

export async function handleCollateralClaimAction(
  eventName: string,
  eventData: EventLog1Item,
  transaction: Transaction,
  context: any
): Promise<void> {
  let data = new CollateralClaimedEventData(eventData);
  let claimCollateralAction = await getOrCreateClaimCollateralAction(
    eventName,
    eventData,
    transaction,
    context
  );

  let claimAction = await getOrCreateClaimAction(
    eventName,
    eventData,
    transaction,
    context
  );

  let claimActionUpdated = addFieldsToCollateralLikeClaimAction(
    claimAction,
    data
  );

  let claimCollateralActionUpdated = addFieldsToCollateralLikeClaimAction(
    claimCollateralAction as ClaimAction,
    data
  );

  context.ClaimAction.set(claimActionUpdated);
  context.ClaimCollateralAction.set(claimCollateralActionUpdated);
}

export async function saveClaimableFundingFeeInfo(
  eventData: EventLog1Item,
  transaction: Transaction,
  context: any
): Promise<ClaimableFundingFeeInfo> {
  let account = eventData.eventData_addressItems_items[2];
  let id = transaction.id + ":" + account;
  let entity: ClaimableFundingFeeInfo | undefined =
    await context.ClaimableFundingFeeInfo.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
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

  return entity;
}

export function isFundingFeeSettleOrder(order: Order): boolean {
  return (
    order.initialCollateralDeltaAmount == BigInt(1) &&
    order.sizeDeltaUsd == BigInt(0) &&
    order.orderType == orderTypes.get("MarketDecrease")
  );
}

export async function saveClaimActionOnOrderCreated(
  transaction: Transaction,
  eventData: EventLog2Item | EventLog1Item,
  context: any
): Promise<void> {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;

  let eventDataBoolItemsItems = eventData.eventData_boolItems_items;

  let orderId = eventDataBytes32ItemsItems[0];

  let claimAction = await getOrCreateClaimAction(
    "SettleFundingFeeCreated",
    eventData,
    transaction,
    context
  );

  let marketAddress = eventDataAddressItemsItems[4];
  let marketAddresses = claimAction.marketAddresses;
  marketAddresses.push(marketAddress);

  let isLong: boolean = Boolean(eventDataBoolItemsItems[0]);
  let isLongOrders = claimAction.isLongOrders;
  isLongOrders.push(isLong);

  claimAction = {
    ...claimAction,
    marketAddresses: marketAddresses,
    isLongOrders: isLongOrders,
  };

  context.ClaimAction.set(claimAction);
  await createClaimRefIfNotExists(orderId, context);
}

async function createClaimRefIfNotExists(
  orderId: string,
  context: any
): Promise<void> {
  const claimRef: ClaimRef | undefined = await context.CLaimRef.get(orderId);
  if (claimRef == undefined) {
    let entity: ClaimRef = {
      id: orderId,
    };
    context.ClaimRef.set(entity);
  }
}

async function getOrCreateClaimCollateralAction(
  eventName: string,
  eventData: EventLog1Item,
  transaction: Transaction,
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
  context: any
): Promise<ClaimAction> {
  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;
  let account: string = eventDataAddressItemsItems[2];

  let id = transaction.id + ":" + account + ":" + eventName;
  let entity: ClaimAction | undefined = await context.ClaimAction.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      marketAddresses: new Array<string>(0),
      tokenAddresses: new Array<string>(0),
      amounts: new Array<bigint>(0),
      isLongOrders: new Array<boolean>(0),
      tokenPrices: new Array<bigint>(0),
      eventName: _mapClaimActionType(eventName),
      account: account,
      transaction_id: transaction.id,
    };
  }

  context.ClaimAction.set(entity);

  return entity as ClaimAction;
}

function addFieldsToCollateralLikeClaimAction(
  claimAction: ClaimAction,
  eventData: CollateralClaimedEventData
): ClaimAction {
  let marketAddress = claimAction.marketAddresses;
  marketAddress.push(eventData.market);

  let tokenAddresses = claimAction.tokenAddresses;
  tokenAddresses.push(eventData.token);
  claimAction = {
    ...claimAction,
    tokenAddresses: tokenAddresses,
  };

  let amounts = claimAction.amounts;
  amounts.push(BigInt(Number(eventData.amount)));
  claimAction = {
    ...claimAction,
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
