import {
  CollectedMarketFeesInfo,
  SwapFeesInfo,
  SwapFeesInfoWithPeriod,
  Transaction,
} from "generated/src/Types.gen";
import { timestampToPeriodStart } from "../utils/time";
import { ZERO } from "../utils/number";
import { EventLog1Item } from "../interfaces/interface";

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

  let marketAddress: string = eventDataAddressItemsItems[1];
  let tokenAddress: string = eventDataAddressItemsItems[2];
  let swapFeeType: string = eventDataBytes32ItemsItems[1];

  let tokenPrice: BigInt = BigInt(eventDataUintItemsItems[0]);
  let feeReceiverAmount: BigInt = BigInt(eventDataUintItemsItems[1]);
  let feeAmountForPool: BigInt = BigInt(eventDataUintItemsItems[2]);

  let swapFeesInfo: SwapFeesInfo = {
    id: eventId,
    marketAddress: marketAddress,
    tokenAddress: tokenAddress,
    swapFeeType: swapFeeType != null ? swapFeeType : "",
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
  if (swapFeeType == swapFeeTypes.get("SWAP_FEE_TYPE")) {
    return "swap";
  }

  if (swapFeeType == swapFeeTypes.get("DEPOSIT_FEE_TYPE")) {
    return "deposit";
  }

  if (swapFeeType == swapFeeTypes.get("WITHDRAWAL_FEE_TYPE")) {
    return "withdrawal";
  }

  context.log.error("Unknown swap fee type: {}", [swapFeeType]);
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
      poolValue
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
  poolValue: BigInt
): bigint {
  if (poolValue == ZERO) {
    return ZERO;
  }

  return BigInt(
    Number(feeInfo.feeUsdPerPoolValue) +
      (Number(fee) * Number(BigInt(10) ** BigInt(30))) / Number(poolValue)
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

  return BigInt(
    Number(feeInfo.feeUsdPerGmToken) +
      (Number(fee) * Number(BigInt(10) ** BigInt(18))) /
        Number(marketTokensSupply)
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
