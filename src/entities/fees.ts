import {
  CollectedMarketFeesInfo,
  MarketInfo,
  PositionFeesInfo,
  PositionFeesInfoWithPeriod,
  SwapFeesInfo,
  SwapFeesInfoWithPeriod,
  Transaction,
} from "generated/src/Types.gen";
import { timestampToPeriodStart } from "../utils/time";
import { ZERO } from "../utils/number";
import { EventLog1Item } from "../interfaces/interface";
import { EventLog } from "ethers";
import { PositionImpactPoolDistributedEventData } from "../utils/eventData/PositionImpactPoolDistributedEventData";
import { getTokenPrice } from "./prices";
import { getMarketPoolValueFromContract } from "../contracts/getMarketPoolValueFromContract";
import { getMarketTokensSupplyFromContract } from "../contracts/getMarketTokensSupplyFromContract";

export let swapFeeTypes = new Map<string, string>();

swapFeeTypes.set(
  "SWAP_FEE_TYPE",
  "0x7ad0b6f464d338ea140ff9ef891b4a69cf89f107060a105c31bb985d9e532214"
);

swapFeeTypes.set(
  "DEPOSIT_FEE_TYPE",
  "0x39226eb4fed85317aa310fa53f734c7af59274c49325ab568f9c4592250e8cc5"
);

swapFeeTypes.set(
  "WITHDRAWAL_FEE_TYPE",
  "0xda1ac8fcb4f900f8ab7c364d553e5b6b8bdc58f74160df840be80995056f3838"
);

export async function getOrCreateCollectedMarketFees(
  marketAddress: string,
  timestamp: number,
  period: string,
  context: any
): Promise<CollectedMarketFeesInfo> {
  let timestampGroup = timestampToPeriodStart(timestamp, period);

  let id = marketAddress + ":" + period;

  if (period != "total") {
    id = id + ":" + timestampGroup.toString();
  }

  let collectedFees: CollectedMarketFeesInfo | undefined =
    await context.CollectedMarketFeesInfo.get(id);

  if (collectedFees == undefined) {
    collectedFees = {
      id: id,
      marketAddress: marketAddress,
      period: period,
      timestampGroup: timestampGroup,
      feeUsdForPool: ZERO,
      cummulativeFeeUsdForPool: ZERO,
      feeUsdPerPoolValue: ZERO,
      cumulativeFeeUsdPerPoolValue: ZERO,
      feeUsdPerGmToken: ZERO,
      cumulativeFeeUsdPerGmToken: ZERO,
      prevCumulativeFeeUsdPerGmToken: ZERO,
    };
  }

  return collectedFees as CollectedMarketFeesInfo;
}

export async function saveSwapFeesInfo(
  eventData: EventLog1Item,
  eventId: string,
  transaction: Transaction,
  context: any
): Promise<SwapFeesInfo> {
  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;

  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let eventDataUintItemsItems = eventData.eventData_uintItems_items;

  let eventDataStringItemsItems = eventData.eventData_stringItems_items;

  let marketAddress: string = eventDataAddressItemsItems[1];
  let tokenAddress: string = eventDataAddressItemsItems[2];
  let swapFeeType: string = eventDataBytes32ItemsItems[1];

  let tokenPrice: BigInt = BigInt(eventDataUintItemsItems[0]);
  let feeReceiverAmount: BigInt = BigInt(eventDataUintItemsItems[1]);
  let feeAmountForPool: BigInt = BigInt(eventDataUintItemsItems[2]);

  let action = eventDataStringItemsItems[0];

  if (swapFeeType == undefined) {
    if (action == "deposit") {
      swapFeeType = swapFeeTypes.get("DEPOSIT_FEE_TYPE")!;
    } else if (action == "withdrawal") {
      swapFeeType = swapFeeTypes.get("WITHDRAWAL_FEE_TYPE")!;
    } else if (action == "swap") {
      swapFeeType = swapFeeTypes.get("SWAP_FEE_TYPE")!;
    }
  }

  let swapFeesInfo: SwapFeesInfo = {
    id: eventId,
    marketAddress: marketAddress,
    tokenAddress: tokenAddress,
    swapFeeType: swapFeeType,
    tokenPrice: BigInt(Number(tokenPrice)),
    feeReceiverAmount: BigInt(Number(feeReceiverAmount)),
    feeUsdForPool: BigInt(Number(feeAmountForPool!) * Number(tokenPrice)),
    transaction_id: transaction.id,
  };

  context.SwapFeesInfo.set(swapFeesInfo);

  return swapFeesInfo;
}

export function getSwapActionByFeeType(
  swapFeeType: string,
  context: any
): string {
  // debug
  // context.log.debug(`Swap Fee Type: ${swapFeeType}`);

  if (swapFeeType == swapFeeTypes.get("SWAP_FEE_TYPE")) {
    return "swap";
  }

  if (swapFeeType == swapFeeTypes.get("DEPOSIT_FEE_TYPE")) {
    return "deposit";
  }

  if (swapFeeType == swapFeeTypes.get("WITHDRAWAL_FEE_TYPE")) {
    return "withdrawal";
  }

  context.log.error(`Unknown swap fee type: {}" ${[swapFeeType]}`);
  throw new Error("Unknown swap fee type: " + swapFeeType);
}

export async function saveCollectedMarketFees(
  transaction: Transaction,
  marketAddress: string,
  poolValue: BigInt,
  feeUsdForPool: BigInt,
  marketTokensSupply: BigInt,
  context: any
): Promise<void> {
  let totalFees: CollectedMarketFeesInfo = await getOrCreateCollectedMarketFees(
    marketAddress,
    transaction.timestamp,
    "total",
    context
  );

  totalFees = {
    ...totalFees,
    cummulativeFeeUsdForPool: BigInt(
      Number(totalFees.cummulativeFeeUsdForPool) + Number(feeUsdForPool)
    ),
  };

  let prevCumulativeFeeUsdPerGmToken = totalFees.cumulativeFeeUsdPerGmToken;

  updateCollectedFeesFractions(
    poolValue,
    totalFees,
    totalFees,
    feeUsdForPool,
    marketTokensSupply,
    prevCumulativeFeeUsdPerGmToken,
    context
  );

  totalFees = {
    ...totalFees,
    feeUsdForPool: BigInt(
      Number(totalFees.feeUsdForPool) + Number(feeUsdForPool)
    ),
  };

  context.CollectedMarketFeesInfo.set(totalFees);

  let feesForPeriod = await getOrCreateCollectedMarketFees(
    marketAddress,
    transaction.timestamp,
    "1h",
    context
  );

  updateCollectedFeesFractions(
    poolValue,
    feesForPeriod,
    totalFees,
    feeUsdForPool,
    marketTokensSupply,
    prevCumulativeFeeUsdPerGmToken,
    context
  );

  feesForPeriod = {
    ...feesForPeriod,
    cummulativeFeeUsdForPool: totalFees.cummulativeFeeUsdForPool,
    feeUsdForPool: BigInt(
      Number(feesForPeriod.feeUsdForPool) + Number(feeUsdForPool)
    ),
  };

  context.CollectedMarketFeesInfo.set(feesForPeriod);
}

function updateCollectedFeesFractions(
  poolValue: BigInt,
  feesEntity: CollectedMarketFeesInfo,
  totalFeesEntity: CollectedMarketFeesInfo,
  feeUsdForPool: BigInt,
  marketTokensSupply: BigInt,
  prevCumulativeFeeUsdPerGmToken: bigint,
  context: any
): void {
  feesEntity = {
    ...feesEntity,
    feeUsdPerPoolValue: getUpdatedFeeUsdPerPoolValue(
      feesEntity,
      feeUsdForPool,
      poolValue,
      context
    ),
    cumulativeFeeUsdPerPoolValue: totalFeesEntity.feeUsdPerPoolValue,

    feeUsdPerGmToken: getUpdatedFeeUsdPerGmToken(
      feesEntity,
      feeUsdForPool,
      marketTokensSupply
    ),
    prevCumulativeFeeUsdPerGmToken: prevCumulativeFeeUsdPerGmToken,
    cumulativeFeeUsdPerGmToken: totalFeesEntity.feeUsdPerGmToken,
  };

  context.CollectedMarketFeesInfo.set(feesEntity);
}

function getUpdatedFeeUsdPerPoolValue(
  feeInfo: CollectedMarketFeesInfo,
  fee: BigInt,
  poolValue: BigInt,
  context: any
): bigint {
  if (poolValue == ZERO) {
    return ZERO;
  }

  // context.log.debug(`Fee Info is ${feeInfo}`);
  // context.log.debug(`Pool Value is: ${poolValue}`);
  // context.log.debug(`Fee value is: ${fee}`);

  return (
    (feeInfo.feeUsdPerPoolValue +
      BigInt(fee.toString()) * BigInt(10) ** BigInt(30)) /
    BigInt(poolValue.toString())
  );
}

function getUpdatedFeeUsdPerGmToken(
  feeInfo: CollectedMarketFeesInfo,
  fee: BigInt,
  marketTokensSupply: BigInt
): bigint {
  if (marketTokensSupply == ZERO) {
    return ZERO;
  }

  // return BigInt(
  //   Number(feeInfo.feeUsdPerGmToken) +
  //     (Number(fee) * Number(BigInt(10) ** BigInt(18))) /
  //       Number(marketTokensSupply)
  // );

  return (
    (feeInfo.feeUsdPerGmToken +
      BigInt(fee.toString()) * BigInt(10) ** BigInt(18)) /
    BigInt(marketTokensSupply.toString())
  );
}

export async function saveSwapFeesInfoWithPeriod(
  feeAmountForPool: BigInt,
  feeReceiverAmount: BigInt,
  tokenPrice: BigInt,
  timestamp: number,
  context: any
): Promise<void> {
  let dailyTimestampGroup = timestampToPeriodStart(timestamp, "1d");
  let totalId = "total";
  let dailyId = dailyTimestampGroup.toString();

  let dailyFees = await getOrCreateSwapFeesInfoWithPeriod(
    dailyId,
    "1d",
    context
  );

  let totalFees = await getOrCreateSwapFeesInfoWithPeriod(
    totalId,
    "total",
    context
  );

  let feeUsdForPool = BigInt(Number(feeAmountForPool) * Number(tokenPrice));
  let feeReceiverUsd = BigInt(Number(feeReceiverAmount) * Number(tokenPrice));

  dailyFees = {
    ...dailyFees,
    totalFeeUsdForPool: dailyFees.totalFeeUsdForPool + feeUsdForPool,
    totalFeeReceiverUsd: dailyFees.totalFeeReceiverUsd + feeReceiverUsd,
  };

  totalFees = {
    ...totalFees,
    totalFeeUsdForPool: dailyFees.totalFeeUsdForPool + feeUsdForPool,
    totalFeeReceiverUsd: dailyFees.totalFeeReceiverUsd + feeReceiverUsd,
  };

  context.SwapFeesInfoWithPeriod.set(dailyFees);
  context.SwapFeesInfoWithPeriod.set(totalFees);
}

export async function savePositionFeesInfo(
  eventData: EventLog1Item,
  eventName: string,
  transaction: Transaction,
  context: any
): Promise<PositionFeesInfo> {
  let eventDataAddressItemsItems = eventData.eventData_addressItems_items;

  let eventDataUintItemsItems = eventData.eventData_uintItems_items;

  let eventDataBytes32ItemsItems = eventData.eventData_bytes32Items_items;

  let orderKey = eventDataBytes32ItemsItems[0];

  let id = orderKey + ":" + eventName;

  let marketAddress = eventDataAddressItemsItems[0];
  let collateralTokenAddress = eventDataAddressItemsItems[1];
  let affiliate = eventDataAddressItemsItems[2];
  let trader = eventDataAddressItemsItems[3];

  let collateralTokenPriceMin = BigInt(eventDataUintItemsItems[0]);
  let collateralTokenPriceMax = BigInt(eventDataUintItemsItems[1]);

  let positionFeeAmount = BigInt(eventDataUintItemsItems[24]);
  let borrowingFeeAmount = BigInt(eventDataUintItemsItems[15]);
  let fundingFeeAmount = BigInt(eventDataUintItemsItems[8]);
  let feeUsdForPool =
    BigInt(eventDataUintItemsItems[22]!.toString()) *
    BigInt(collateralTokenPriceMin.toString());

  let totalRebateAmount = BigInt(eventDataUintItemsItems[5]);
  let totalRebateFactor = BigInt(eventDataUintItemsItems[3]);
  let traderDiscountAmount = BigInt(eventDataUintItemsItems[6]);
  let affiliateRewardAmount = BigInt(eventDataUintItemsItems[7]);

  let feesInfo: PositionFeesInfo = {
    id: id,
    orderKey: orderKey,
    eventName: eventName,
    marketAddress: marketAddress,
    collateralTokenAddress: collateralTokenAddress,
    trader: trader,
    affiliate: affiliate,
    collateralTokenPriceMin: collateralTokenPriceMin,
    collateralTokenPriceMax: collateralTokenPriceMax,
    positionFeeAmount: positionFeeAmount,
    borrowingFeeAmount: borrowingFeeAmount,
    fundingFeeAmount: fundingFeeAmount,
    feeUsdForPool: feeUsdForPool,
    totalRebateAmount: totalRebateAmount,
    totalRebateFactor: totalRebateFactor,
    traderDiscountAmount: traderDiscountAmount,
    affiliateRewardAmount: affiliateRewardAmount,
    transaction_id: transaction.id,
  };

  context.PositionFeesInfo.set(feesInfo);

  return feesInfo;
}

export async function savePositionFeesInfoWithPeriod(
  positionFeeAmount: BigInt,
  positionFeeAmountForPool: BigInt,
  borrowingFeeUsd: BigInt,
  tokenPrice: BigInt,
  timestamp: number,
  context: any
): Promise<void> {
  let dailyTimestampGroup = timestampToPeriodStart(timestamp, "1d");
  let totalId = "total";
  let dailyId = dailyTimestampGroup.toString();

  let dailyFees = await getOrCreatePositionFeesInfoWithPeriod(
    dailyId,
    "1d",
    context
  );

  let totalFees = await getOrCreatePositionFeesInfoWithPeriod(
    totalId,
    "total",
    context
  );

  let positionFeeUsd = BigInt(Number(positionFeeAmount) * Number(tokenPrice));
  let positionFeeUsdForPool = BigInt(
    Number(positionFeeAmountForPool) * Number(tokenPrice)
  );

  dailyFees = {
    ...dailyFees,
    totalBorrowingFeeUsd: BigInt(
      Number(dailyFees.totalBorrowingFeeUsd) + Number(borrowingFeeUsd)
    ),

    totalPositionFeeAmount: BigInt(
      Number(dailyFees.totalPositionFeeAmount) + Number(positionFeeAmount)
    ),

    totalPositionFeeUsd: BigInt(
      Number(dailyFees.totalPositionFeeUsd) + Number(positionFeeUsd)
    ),

    totalPositionFeeAmountForPool: BigInt(
      Number(dailyFees.totalPositionFeeAmountForPool) +
        Number(positionFeeAmountForPool)
    ),

    totalPositionFeeUsdForPool: BigInt(
      Number(dailyFees.totalPositionFeeUsdForPool) +
        Number(positionFeeUsdForPool)
    ),
  };

  totalFees = {
    ...totalFees,
    totalBorrowingFeeUsd: BigInt(
      Number(totalFees.totalBorrowingFeeUsd) + Number(borrowingFeeUsd)
    ),

    totalPositionFeeAmount: BigInt(
      Number(totalFees.totalPositionFeeAmount) + Number(positionFeeAmount)
    ),

    totalPositionFeeUsd: BigInt(
      Number(totalFees.totalPositionFeeUsd) + Number(positionFeeUsd)
    ),

    totalPositionFeeAmountForPool: BigInt(
      Number(totalFees.totalPositionFeeAmountForPool) +
        Number(positionFeeAmountForPool)
    ),

    totalPositionFeeUsdForPool: BigInt(
      Number(totalFees.totalPositionFeeUsdForPool) +
        Number(positionFeeUsdForPool)
    ),
  };

  context.PositionFeesInfoWithPeriod.set(dailyFees);
  context.PositionFeesInfoWithPeriod.set(totalFees);
}

export async function handlePositionImpactPoolDistributed(
  eventData: EventLog1Item,
  transaction: Transaction,
  chainId: number,
  blockNumber: number,
  context: any
): Promise<void> {
  let data = new PositionImpactPoolDistributedEventData(eventData);
  let marketInfo: MarketInfo | undefined = await context.MarketInfo.get(
    data.market
  );

  if (marketInfo == undefined) {
    context.log.warn(`Market not found: {} ${[data.market]}`);
    throw new Error("Market not found");
  }

  let indexToken = marketInfo.indexToken;
  let tokenPrice = await getTokenPrice(indexToken, context);

  let amountUsd =
    BigInt(data.distributionAmount.toString()) * BigInt(tokenPrice.toString());
  let poolValue = await getMarketPoolValueFromContract(
    data.market,
    chainId,
    transaction,
    context
  );
  let marketTokensSupply = await getMarketTokensSupplyFromContract(
    data.market,
    chainId,
    blockNumber,
    context
  );

  await saveCollectedMarketFees(
    transaction,
    data.market,
    poolValue,
    amountUsd,
    marketTokensSupply,
    context
  );
}

async function getOrCreatePositionFeesInfoWithPeriod(
  id: string,
  period: string,
  context: any
): Promise<PositionFeesInfoWithPeriod> {
  let feeInfo: PositionFeesInfoWithPeriod | undefined =
    await context.PositionFeesInfoWithPeriod.get(id);
  if (feeInfo == undefined) {
    feeInfo = {
      id: id,
      period: period,
      totalBorrowingFeeUsd: ZERO,
      totalPositionFeeAmount: ZERO,
      totalPositionFeeUsd: ZERO,
      totalPositionFeeAmountForPool: ZERO,
      totalPositionFeeUsdForPool: ZERO,
    };
  }

  return feeInfo as PositionFeesInfoWithPeriod;
}

async function getOrCreateSwapFeesInfoWithPeriod(
  id: string,
  period: string,
  context: any
): Promise<SwapFeesInfoWithPeriod> {
  let feeInfo: SwapFeesInfoWithPeriod | undefined =
    await context.SwapFeesInfoWithPeriod.get(id);

  if (feeInfo == undefined) {
    feeInfo = {
      id: id,
      period: period,
      totalFeeUsdForPool: ZERO,
      totalFeeReceiverUsd: ZERO,
    };
  }

  return feeInfo as SwapFeesInfoWithPeriod;
}
