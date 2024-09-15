import { PositionDecrease, PositionIncrease, Transaction } from "generated";
import { EventLog1Item } from "../interfaces/interface";

export function savePositionIncrease(
  eventData: EventLog1Item,
  transaction: Transaction,
  chainId: number,
  context: any
): PositionIncrease {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;

  let eventDataUintItemsItems = eventData.eventData_uintItems_items;

  let eventDataIntItemsItems = eventData.eventData_intItems_items;

  let eventDataBoolItemsItems = eventData.eventData_boolItems_items;

  let orderKey: string = eventDataBytes32ItemsItems[0];
  let positionKey: string = eventDataBytes32ItemsItems[1];

  let account: string = eventDataAddressItemsItems[0];
  let marketAddress: string = eventDataAddressItemsItems[1];
  let collateralTokenAddress: string = eventDataAddressItemsItems[2];

  let collateralTokenPriceMin: BigInt = BigInt(eventDataUintItemsItems[11]);
  let collateralTokenPriceMax: BigInt = BigInt(eventDataUintItemsItems[10]);

  let sizeInUsd: BigInt = BigInt(eventDataUintItemsItems[0]);
  let sizeInTokens: BigInt = BigInt(eventDataUintItemsItems[1]);
  let collateralAmount: BigInt = BigInt(eventDataUintItemsItems[2]);

  let sizeDeltaUsd: BigInt = BigInt(eventDataUintItemsItems[12]);
  let sizeDeltaInTokens: BigInt = BigInt(eventDataUintItemsItems[13]);

  let collateralDeltaAmount: BigInt = BigInt(eventDataIntItemsItems[0]);
  let borrowingFactor: BigInt = BigInt(eventDataUintItemsItems[3]);
  let priceImpactDiffUsd: BigInt = BigInt(0);
  let executionPrice: BigInt = BigInt(eventDataUintItemsItems[7]);

  let longTokenFundingAmountPerSize: BigInt = BigInt(
    eventDataUintItemsItems[5]
  );
  let shortTokenFundingAmountPerSize: BigInt = BigInt(
    eventDataUintItemsItems[6]
  );
  let priceImpactAmount: BigInt = BigInt(eventDataIntItemsItems[2]);
  let priceImpactUsd: BigInt = BigInt(eventDataIntItemsItems[1]);
  let basePnlUsd: BigInt = BigInt(0);

  let orderType: BigInt = BigInt(eventDataUintItemsItems[14]);
  let isLong: boolean = Boolean(eventDataBoolItemsItems[0]);

  let entity: PositionIncrease = {
    id: orderKey,
    chainId: chainId,
    orderKey: orderKey,
    positionKey: positionKey,
    account: account,
    marketAddress: marketAddress,
    collateralTokenAddress: collateralTokenAddress,
    collateralTokenPriceMin: BigInt(Number(collateralTokenPriceMin)),
    collateralTokenPriceMax: BigInt(Number(collateralTokenPriceMax)),
    sizeInUsd: BigInt(Number(sizeInUsd)),
    sizeInTokens: BigInt(Number(sizeInTokens)),
    collateralAmount: BigInt(Number(collateralAmount)),
    sizeDeltaUsd: BigInt(Number(sizeDeltaUsd)),
    sizeDeltaInTokens: BigInt(Number(sizeDeltaInTokens)),
    collateralDeltaAmount: BigInt(Number(collateralDeltaAmount)),
    borrowingFactor: BigInt(Number(borrowingFactor)),
    priceImpactDiffUsd: BigInt(Number(priceImpactDiffUsd)),
    executionPrice: BigInt(Number(executionPrice)),
    longTokenFundingAmountPerSize: BigInt(
      Number(longTokenFundingAmountPerSize)
    ),
    shortTokenFundingAmountPerSize: BigInt(
      Number(shortTokenFundingAmountPerSize)
    ),
    priceImpactAmount: BigInt(Number(priceImpactAmount)),
    priceImpactUsd: BigInt(Number(priceImpactUsd)),
    basePnlUsd: BigInt(Number(basePnlUsd)),
    orderType: BigInt(Number(orderType)),
    isLong: isLong,
    transaction_id: transaction.id,
  };

  context.PositionIncrease.set(entity);

  return entity;
}

export function savePositionDecrease(
  eventData: EventLog1Item,
  transaction: Transaction,
  chainId: number,
  context: any
): PositionDecrease {
  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;

  let eventDataUintItemsItems = eventData.eventData_uintItems_items;

  let eventDataIntItemsItems = eventData.eventData_intItems_items;

  let eventDataBoolItemsItems = eventData.eventData_boolItems_items;

  let orderKey: string = eventDataBytes32ItemsItems[0];
  let positionKey: string = eventDataBytes32ItemsItems[1];

  let account: string = eventDataAddressItemsItems[0];
  let marketAddress: string = eventDataAddressItemsItems[1];
  let collateralTokenAddress: string = eventDataAddressItemsItems[2];
  let collateralTokenPriceMin: BigInt = BigInt(eventDataUintItemsItems[9]);
  let collateralTokenPriceMax: BigInt = BigInt(eventDataUintItemsItems[8]);
  let sizeInUsd: BigInt = BigInt(eventDataUintItemsItems[0]);
  let sizeInTokens: BigInt = BigInt(eventDataUintItemsItems[1]);
  let collateralAmount: BigInt = BigInt(eventDataUintItemsItems[2]);
  let sizeDeltaUsd: BigInt = BigInt(eventDataUintItemsItems[12]);
  let sizeDeltaInTokens: BigInt = BigInt(eventDataUintItemsItems[13]);
  let collateralDeltaAmount: BigInt = BigInt(eventDataUintItemsItems[14]);
  let borrowingFactor: BigInt = BigInt(eventDataUintItemsItems[3]);
  let priceImpactDiffUsd: BigInt = BigInt(eventDataUintItemsItems[15]);
  let priceImpactUsd: BigInt = BigInt(eventDataIntItemsItems[0]);
  let executionPrice: BigInt = BigInt(eventDataUintItemsItems[7]);
  let longTokenFundingAmountPerSize: BigInt = BigInt(
    eventDataUintItemsItems[5]
  );
  let shortTokenFundingAmountPerSize: BigInt = BigInt(
    eventDataUintItemsItems[6]
  );
  let priceImpactAmount: BigInt = BigInt(0);
  let basePnlUsd: BigInt = BigInt(eventDataIntItemsItems[1]);
  let orderType: BigInt = BigInt(eventDataUintItemsItems[16]);
  let isLong: boolean = Boolean(eventDataBoolItemsItems[0]);

  let entity: PositionDecrease = {
    id: orderKey,
    chainId: chainId,
    orderKey: orderKey,
    positionKey: positionKey,
    account: account,
    marketAddress: marketAddress,
    collateralTokenAddress: collateralTokenAddress,
    collateralTokenPriceMin: BigInt(Number(collateralTokenPriceMin)),
    collateralTokenPriceMax: BigInt(Number(collateralTokenPriceMax)),
    sizeInUsd: BigInt(Number(sizeInUsd)),
    sizeInTokens: BigInt(Number(sizeInTokens)),
    collateralAmount: BigInt(Number(collateralAmount)),
    sizeDeltaUsd: BigInt(Number(sizeDeltaUsd)),
    sizeDeltaInTokens: BigInt(Number(sizeDeltaInTokens)),
    collateralDeltaAmount: BigInt(Number(collateralDeltaAmount)),
    borrowingFactor: BigInt(Number(borrowingFactor)),
    priceImpactDiffUsd: BigInt(Number(priceImpactDiffUsd)),
    priceImpactUsd: BigInt(Number(priceImpactUsd)),
    executionPrice: BigInt(Number(executionPrice)),
    longTokenFundingAmountPerSize: BigInt(
      Number(longTokenFundingAmountPerSize)
    ),
    shortTokenFundingAmountPerSize: BigInt(
      Number(shortTokenFundingAmountPerSize)
    ),
    priceImpactAmount: BigInt(Number(priceImpactAmount)),
    basePnlUsd: BigInt(Number(basePnlUsd)),
    orderType: BigInt(Number(orderType)),
    isLong: isLong,
    transaction_id: transaction.id,
  };

  context.PositionDecrease.set(entity);

  return entity as PositionDecrease;
}
