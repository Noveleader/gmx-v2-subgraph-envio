import { Order, Transaction } from "generated/src/Types.gen";
import { EventLog1Item } from "../interfaces/interface";

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
