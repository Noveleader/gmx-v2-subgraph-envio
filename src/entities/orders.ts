import { Order, Transaction } from "generated/src/Types.gen";
import { EventLog1Item, EventLog2Item } from "../interfaces/interface";
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

export function saveOrder(
  eventData: EventLog2Item,
  transaction: Transaction,
  context: any
): Order {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;

  let eventDataAddressItemsArrayItems =
    eventData.eventData_addressItems_arrayItems;

  let eventDataUintItemsItems = eventData.eventData_uintItems_items;

  let eventDataBoolItemsItems = eventData.eventData_boolItems_items;

  let key = eventDataBytes32ItemsItems[0];

  let account: string = eventDataAddressItemsItems[0];
  let receiver: string = eventDataAddressItemsItems[1];
  let callbackContract: string = eventDataAddressItemsItems[2];
  let marketAddress: string = eventDataAddressItemsItems[4];
  let initialCollateralTokenAddress: string = eventDataAddressItemsItems[5];

  let swapPath: Array<string> = eventDataAddressItemsArrayItems[0];

  let sizeDeltaUsd: BigInt = BigInt(eventDataUintItemsItems[2]);
  let initialCollateralDeltaAmount: BigInt = BigInt(eventDataUintItemsItems[3]);
  let triggerPrice: BigInt = BigInt(eventDataUintItemsItems[4]);
  let acceptablePrice: BigInt = BigInt(eventDataUintItemsItems[5]);
  let callbackGasLimit: BigInt = BigInt(eventDataUintItemsItems[7]);
  let minOutputAmount: BigInt = BigInt(eventDataUintItemsItems[8]);
  let executionFee: BigInt = BigInt(eventDataUintItemsItems[6]);
  let updatedAtBlock: BigInt = BigInt(eventDataUintItemsItems[9]);
  let orderType: BigInt = BigInt(eventDataUintItemsItems[0]);

  let isLong: boolean = Boolean(eventDataBoolItemsItems[0]);
  let shouldUnwrapNativeToken: boolean = Boolean(eventDataBoolItemsItems[1]);
  let isFrozen: boolean = Boolean(eventDataBoolItemsItems[2]);

  let order: Order = {
    id: key,

    account: account,
    receiver: receiver,
    callbackContract: callbackContract,
    marketAddress: marketAddress,
    swapPath: swapPath,
    initialCollateralTokenAddress: initialCollateralTokenAddress,

    sizeDeltaUsd: BigInt(Number(sizeDeltaUsd)),
    initialCollateralDeltaAmount: BigInt(Number(initialCollateralDeltaAmount)),
    triggerPrice: BigInt(Number(triggerPrice)),
    acceptablePrice: BigInt(Number(acceptablePrice)),
    callbackGasLimit: BigInt(Number(callbackGasLimit)),
    minOutputAmount: BigInt(Number(minOutputAmount)),
    executionFee: BigInt(Number(executionFee)),

    updatedAtBlock: BigInt(Number(updatedAtBlock)),

    orderType: BigInt(Number(orderType)),

    isLong: isLong,
    shouldUnwrapNativeToken: shouldUnwrapNativeToken,

    status: isFrozen ? "Frozen" : "Created",

    cancelledReason: "",
    cancelledReasonBytes: "",
    frozenReason: "",
    frozenReasonBytes: "",

    createdTxn_id: transaction.id,
    cancelledTxn_id: transaction.id,
    executedTxn_id: transaction.id,
  };

  context.Order.set(order);
  return order;
}
