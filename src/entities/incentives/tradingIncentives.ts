import { TradingIncentivesStat, UserTradingIncentivesStat } from "generated";
import { convertAmountToUsd, convertUsdToAmount } from "../prices";
import { timestampToPeriodStart } from "../../utils/time";
import { expandDecimals, ZERO } from "../../utils/number";

let INCENTIVES_START_TIMESTAMP = 1700006400; // 2023-11-15 00:00:00
let REBATE_PERCENT = BigInt(7500);

function _incentivesActive(timestamp: number): boolean {
  return timestamp > INCENTIVES_START_TIMESTAMP;
}

function _getArbTokenAddress(): string {
  return "0x912ce59144191c1204e64559fe8253a0e49e6548";
}

function _getRebatesCapForEpoch(timestamp: number): BigInt {
  // no caps
  return expandDecimals(BigInt(100000000), 18);
}

class CappedPositionFeesResult {
  constructor(public usd: BigInt, public inArb: BigInt) {}
}

async function _getEligibleFees(
  positionFeesUsd: BigInt,
  positionFeesInArb: BigInt,
  globalEligibleFeesInArb: BigInt,
  timestamp: number,
  context: any
): Promise<CappedPositionFeesResult> {
  let REBATES_CAP_FOR_EPOCH_IN_ARB = _getRebatesCapForEpoch(timestamp);

  let eligibleFeesUsd =
    (BigInt(positionFeesUsd.toString()) * REBATE_PERCENT) / BigInt(10000);

  let eligibleFeesInArb =
    (BigInt(positionFeesInArb.toString()) * REBATE_PERCENT) / BigInt(10000);

  if (
    BigInt(globalEligibleFeesInArb.toString()) + eligibleFeesInArb >
    BigInt(REBATES_CAP_FOR_EPOCH_IN_ARB.toString())
  ) {
    eligibleFeesInArb =
      BigInt(REBATES_CAP_FOR_EPOCH_IN_ARB.toString()) -
      BigInt(globalEligibleFeesInArb.toString());
    eligibleFeesUsd = BigInt(
      await convertAmountToUsd(
        _getArbTokenAddress(),
        eligibleFeesInArb,
        context
      ).toString()
    );
  }

  return new CappedPositionFeesResult(eligibleFeesUsd, eligibleFeesInArb);
}

export async function saveTradingIncentivesStat(
  account: string,
  timestamp: number,
  feesAmount: BigInt,
  collateralTokenPrice: BigInt,
  chainId: number,
  context: any
): Promise<void> {
  if (!_incentivesActive(timestamp)) {
    return;
  }

  let positionFeesUsd =
    BigInt(feesAmount.toString()) * BigInt(collateralTokenPrice.toString());

  let positionFeesInArb = BigInt(
    await convertUsdToAmount(
      _getArbTokenAddress(),
      positionFeesUsd,
      context
    ).toString()
  );

  let globalEntity = await _getOrCreateTradingIncentivesStat(
    timestamp,
    chainId,
    context
  );

  let eligibleFees = await _getEligibleFees(
    positionFeesInArb,
    positionFeesInArb,
    globalEntity.eligibleFeesInArb,
    timestamp,
    context
  );

  globalEntity = {
    ...globalEntity,
    positionFeesUsd: globalEntity.positionFeesUsd + positionFeesUsd,
    positionFeesInArb: globalEntity.positionFeesInArb + positionFeesInArb,
  };

  if (BigInt(eligibleFees.inArb.toString()) > ZERO) {
    globalEntity = {
      ...globalEntity,
      eligibleFeesUsd:
        globalEntity.eligibleFeesUsd + BigInt(eligibleFees.usd.toString()),
      eligibleFeesInArb:
        globalEntity.eligibleFeesInArb + BigInt(eligibleFees.inArb.toString()),
    };
  }

  context.TradingIncentivesStat.set(globalEntity);

  let userEntity = await _getOrCreateUserTradingIncentivesStat(
    account,
    timestamp,
    chainId,
    context
  );

  userEntity = {
    ...userEntity,
    positionFeesUsd: userEntity.positionFeesUsd + positionFeesUsd,
    positionFeesInArb: userEntity.positionFeesInArb + positionFeesInArb,
  };

  if (BigInt(eligibleFees.inArb.toString()) > ZERO) {
    userEntity = {
      ...userEntity,
      eligibleFeesInArb:
        userEntity.eligibleFeesInArb + BigInt(eligibleFees.inArb.toString()),
      eligibleFeesUsd:
        userEntity.eligibleFeesUsd + BigInt(eligibleFees.usd.toString()),
      eligibleUpdatedTimestamp: timestamp,
    };
  }

  context.UserTradingIncentivesStat.set(userEntity);
}

async function _getOrCreateUserTradingIncentivesStat(
  account: string,
  timestamp: number,
  chainId: number,
  context: any
): Promise<UserTradingIncentivesStat> {
  let period = "1w";
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = account + ":" + period + ":" + startTimestamp.toString();
  let entity: UserTradingIncentivesStat | undefined =
    await context.UserTradingIncentivesStat.get(id);
  if (entity == undefined) {
    entity = {
      id: id,
      chainId: chainId,
      period: period,
      timestamp: startTimestamp,
      account: account,

      positionFeesUsd: ZERO,
      positionFeesInArb: ZERO,
      eligibleFeesInArb: ZERO,
      eligibleFeesUsd: ZERO,
      eligibleUpdatedTimestamp: 0,
    };
  }
  return entity!;
}

async function _getOrCreateTradingIncentivesStat(
  timestamp: number,
  chainId: number,
  context: any
): Promise<TradingIncentivesStat> {
  let period = "1w";
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = period + ":" + startTimestamp.toString();
  let entity: TradingIncentivesStat | undefined =
    await context.TradingIncentivesStat.get(id);
  if (entity == undefined) {
    entity = {
      id: id,
      chainId: chainId,
      period: period,
      timestamp: startTimestamp,
      positionFeesUsd: ZERO,
      positionFeesInArb: ZERO,
      eligibleFeesInArb: ZERO,
      eligibleFeesUsd: ZERO,
      rebatesCapInArb: BigInt(_getRebatesCapForEpoch(timestamp).toString()),
    };
  }
  return entity!;
}
