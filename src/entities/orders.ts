import { Order, Transaction } from "generated/src/Types.gen";
import { EventLog1Item } from "../interfaces/interface";
import { eventNames } from "process";

export let orderTypes = new Map<string, BigInt>();

orderTypes.set("MarketSwap", BigInt(0));
orderTypes.set("LimitSwap", BigInt(1));
orderTypes.set("MarketIncrease", BigInt(2));
orderTypes.set("LimitIncrease", BigInt(3));
orderTypes.set("MarketDecrease", BigInt(4));
orderTypes.set("LimitDecrease", BigInt(5));
orderTypes.set("StopLossDecrease", BigInt(6));
orderTypes.set("Liquidation", BigInt(7));

export async function saveOrderExecutedState(
  eventData: EventLog1Item,
  transaction: Transaction,
  context: any
): Promise<Order | null> {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let key = eventDataBytes32ItemsItems[0];

  let order: Order | undefined = await context.Order.get(key);

  if (order == undefined) {
    return null;
  }

  let newOrderEntity: Order = {
    ...order,
    status: "Executed",
    executedTxn_id: transaction.id,
  };

  context.Order.set(newOrderEntity);

  return newOrderEntity;
}

export async function saveOrderCancelledState(
  eventData: EventLog1Item,
  transaction: Transaction,
  context: any
): Promise<Order | null> {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataStringItemsItems = eventData.eventData_stringItems_items;

  let eventDataBytesItemsItems = eventData.eventData_bytesItems_items;

  let key = eventDataBytes32ItemsItems[0];

  let order = await context.Order.get(key);

  if (order == undefined) {
    return null;
  }

  let newOrderEntity: Order = {
    ...order,
    status: "Cancelled",
    cancelledReason: eventDataStringItemsItems[0],
    executedTxn: eventDataBytesItemsItems[0],

    cancelledTxn_id: transaction.id,
  };

  context.Order.set(newOrderEntity);

  return newOrderEntity;
}

export async function saveOrderUpdate(
  eventData: EventLog1Item,
  context: any
): Promise<Order | null> {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataUintItemsItems = eventData.eventData_uintItems_items;

  let key = eventDataBytes32ItemsItems[0];

  let order = await context.Order.get(key);

  if (order == undefined) {
    return null;
  }

  let newOrderEntity: Order = {
    ...order,
    sizeDeltaUsd: eventDataUintItemsItems[0],
    acceptablePrice: eventDataUintItemsItems[1],
    triggerPrice: eventDataUintItemsItems[2],
    minOutputAmount: eventDataUintItemsItems[3],
  };

  order = newOrderEntity;

  context.Order.set(order);

  return order as Order;
}

export async function saveOrderFrozenState(
  eventData: EventLog1Item,
  context: any
): Promise<Order | null> {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataStringItemsItems = eventData.eventData_stringItems_items;

  let eventDataBytesItemsItems = eventData.eventData_bytesItems_items;

  let key = eventDataBytes32ItemsItems[0];

  let order = context.Order.get(key);

  if (order == null) {
    return null;
  }

  order = {
    ...order,
    status: "Frozen",
    frozenReason: eventDataStringItemsItems[0],
    frozenReasonBytes: eventDataBytesItemsItems[0],
  };

  context.Order.set(order);

  return order as Order;
}

export async function saveOrderSizeDeltaAutoUpdate(
  eventData: EventLog1Item,
  context: any
): Promise<Order | null> {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataUintItemsItems = eventData.eventData_uintItems_items;

  let key = eventDataBytes32ItemsItems[0];

  let order: Order = await context.Order.get(key);

  if (order == null) {
    return null;
  }

  order = {
    ...order,
    sizeDeltaUsd: BigInt(eventDataUintItemsItems[0]),
  };

  context.Order.set(order);

  return order as Order;
}

export async function saveOrderCollateralAutoUpdate(
  eventData: EventLog1Item,
  context: any
): Promise<Order | null> {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataUintItemsItems = eventData.eventData_uintItems_items;

  let key = eventDataBytes32ItemsItems[0];

  let order: Order | undefined = await context.Order.get(key);

  if (order == undefined) {
    return null;
  }

  order = {
    ...order,
    initialCollateralDeltaAmount: BigInt(eventDataUintItemsItems[1]),
  };

  context.Order.set(order);

  return order as Order;
}
