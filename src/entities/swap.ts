import { SwapInfo, Transaction } from "generated";
import { EventLog1Item } from "../interfaces/interface";

export async function handleSwapInfo(
  eventData: EventLog1Item,
  transaction: Transaction,
  chainId: number,
  context: any
): Promise<SwapInfo> {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;

  let eventDataUintItemsItems = eventData.eventData_uintItems_items;

  let eventDataIntItemsItems = eventData.eventData_intItems_items;

  let orderKey = eventDataBytes32ItemsItems[0];

  let marketAddress = eventDataAddressItemsItems[0];
  let receiver = eventDataAddressItemsItems[1];
  let tokenInAddress = eventDataAddressItemsItems[2];
  let tokenOutAddress = eventDataAddressItemsItems[3];

  let swapInfoId = getSwapInfoId(orderKey, marketAddress);

  let tokenInPrice = BigInt(eventDataUintItemsItems[0]);
  let tokenOutPrice = BigInt(eventDataUintItemsItems[1]);
  let amountIn = BigInt(eventDataUintItemsItems[2]);
  let amountInAfterFees = BigInt(eventDataUintItemsItems[3]);
  let amountOut = BigInt(eventDataUintItemsItems[4]);

  let priceImpactUsd = BigInt(eventDataIntItemsItems[0]);

  let swapInfo: SwapInfo = {
    id: swapInfoId,
    chainId: chainId,
    orderKey: orderKey,
    marketAddress: marketAddress,
    transaction_id: transaction.id,

    receiver: receiver,
    tokenInAddress: tokenInAddress,
    tokenOutAddress: tokenOutAddress,

    tokenInPrice: tokenInPrice,
    tokenOutPrice: tokenOutPrice,
    amountIn: amountIn,
    amountInAfterFees: amountInAfterFees,
    amountOut: amountOut,

    priceImpactUsd: priceImpactUsd,
  };

  context.SwapInfo.set(swapInfo);

  return swapInfo;
}

export function getSwapInfoId(orderKey: string, marketAddress: string): string {
  return orderKey + ":" + marketAddress;
}
