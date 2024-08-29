import {
  GlpGmMigrationStat,
  LiquidityProviderIncentivesStat,
  MarketIncentivesStat,
  UserGlpGmMigrationStat,
  UserMarketInfo,
} from "generated/src/Types.gen";
import { periodToSeconds, timestampToPeriodStart } from "../../utils/time";
import { ZERO } from "../../utils/number";
import { convertAmountToUsd, convertUsdToAmount } from "../prices";
import { ZeroAddress } from "ethers";
import { EventLog1Item } from "../../interfaces/interface";
import { MarketPoolValueUpdatedEventData } from "../../utils/eventData/MarketPoolValueUpdatedEventData";
import { getMarketInfo } from "../markets";

let INCENTIVES_START_TIMESTAMP = 1699401600;
let ARB_PRECISION = BigInt(10) ** BigInt(18);
let GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB =
  BigInt(100000000) * ARB_PRECISION; // 100m ARB
let GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB = BigInt(200000000) * ARB_PRECISION; // 200m ARB

let MAX_FEE_BASIS_POINTS_FOR_REBATE = BigInt(25);
let MAX_FEE_BASIS_POINTS_FOR_REBATE_REDUCED = BigInt(10);

let SECONDS_IN_WEEK = periodToSeconds("1w");

function _incentivesActive(timestamp: number): boolean {
  return timestamp > INCENTIVES_START_TIMESTAMP;
}

export async function saveUserGlpGmMigrationStatGlpData(
  account: string,
  timestamp: number,
  usdgAmount: BigInt,
  feeBasisPoints: BigInt,
  context: any
): Promise<void> {
  if (!_incentivesActive(timestamp)) {
    return;
  }

  let entity = await _getOrCreateUserGlpGmMigrationStatGlpData(
    account,
    timestamp,
    context
  );

  let usdAmount = BigInt(usdgAmount.toString()) * BigInt(10) ** BigInt(12);
  let eligibleDiff = await _getCappedEligibleRedemptionDiff(
    entity.glpRedemptionUsd,
    entity.glpRedemptionUsd + usdAmount,
    entity.gmDepositUsd,
    context
  );

  let maxFeeBasisPointsForRebate = await _getMaxFeeBasisPointsForRebate(
    eligibleDiff.inArb,
    context
  );
  if (feeBasisPoints > maxFeeBasisPointsForRebate) {
    feeBasisPoints = maxFeeBasisPointsForRebate;
  }

  entity = {
    ...entity,
    glpRedemptionUsd: entity.glpRedemptionUsd + usdAmount,
    glpRedemptionFeeBpsByUsd:
      entity.glpRedemptionFeeBpsByUsd +
      BigInt(usdAmount) * BigInt(feeBasisPoints.toString()),
    glpRedemptionWeightedAverageFeeBps: Number(
      entity.glpRedemptionFeeBpsByUsd / entity.glpRedemptionUsd
    ),
  };

  if (BigInt(eligibleDiff.inArb.toString()) > ZERO) {
    entity = {
      ...entity,
      eligibleRedemptionInArb:
        entity.eligibleRedemptionInArb + BigInt(eligibleDiff.inArb.toString()),
      eligibleRedemptionUsd:
        entity.eligibleRedemptionUsd + BigInt(eligibleDiff.usd.toString()),
      eligibleUpdatedTimestamp: timestamp,
    };
  }

  context.UserGlpGmMigrationStat.set(entity);

  await _saveGlpGmMigrationStat(eligibleDiff, context);
}

async function _saveGlpGmMigrationStat(
  diff: EligibleRedemptionDiffResult,
  context: any
): Promise<void> {
  if (diff.usd == ZERO) {
    return;
  }

  let entity = await _getOrCreateGlpGmMigrationStat(context);
  entity = {
    ...entity,
    eligibleRedemptionUsd:
      entity.eligibleRedemptionUsd + BigInt(diff.usd.toString()),
    eligibleRedemptionInArb:
      entity.eligibleRedemptionInArb + BigInt(diff.inArb.toString()),
  };

  context.GlpGmMigrationStat.set(entity);
}

async function _getOrCreateUserGlpGmMigrationStatGlpData(
  account: string,
  timestamp: number,
  context: any
): Promise<UserGlpGmMigrationStat> {
  let period = "1w";
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = account + ":" + period + ":" + startTimestamp.toString();
  let entity: UserGlpGmMigrationStat | undefined =
    await context.UserGlpGmMigrationStat.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      period: period,
      account: account,
      timestamp: startTimestamp,
      glpRedemptionUsd: ZERO,
      glpRedemptionFeeBpsByUsd: ZERO,
      glpRedemptionWeightedAverageFeeBps: 0,
      gmDepositUsd: ZERO,
      eligibleRedemptionInArb: ZERO,
      eligibleRedemptionUsd: ZERO,
      eligibleUpdatedTimestamp: 0,
    };
  }

  return entity;
}

class EligibleRedemptionDiffResult {
  constructor(public usd: BigInt, public inArb: BigInt) {}
}

async function _getCappedEligibleRedemptionDiff(
  usdBefore: BigInt,
  usdAfter: BigInt,
  otherUsd: BigInt,
  context: any
): Promise<EligibleRedemptionDiffResult> {
  // case 1: gmDepositUsd: 1000, gmDepositUsd after: 1500, glpRedemptionUsd: 2000 => diffUsd: 500
  // case 2: gmDepositUsd: 1000, gmDepositUsd after: 1500, glpRedemptionUsd: 1200 => diffUsd: 200
  // case 3: gmDepositUsd: 1000, gmDepositUsd after: 1500, glpRedemptionUsd: 800 => diffUsd: 0

  let entity = await _getOrCreateGlpGmMigrationStat(context);

  if (entity.eligibleRedemptionInArb > GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB) {
    return new EligibleRedemptionDiffResult(ZERO, ZERO);
  }

  let minBefore = usdBefore < otherUsd ? usdBefore : otherUsd;
  let minAfter = usdAfter < otherUsd ? usdAfter : otherUsd;
  let diffUsd = BigInt(Number(minAfter) - Number(minBefore));
  let diffInArb = await convertUsdToAmount(
    _getArbTokenAddress(),
    diffUsd,
    context
  );

  if (
    BigInt(Number(entity.eligibleRedemptionInArb) + Number(diffInArb)) >
    GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB
  ) {
    diffInArb =
      GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB - entity.eligibleRedemptionInArb;
    diffUsd = BigInt(
      (
        await convertAmountToUsd(_getArbTokenAddress(), diffInArb, context)
      ).toString()
    );
  }

  return new EligibleRedemptionDiffResult(diffUsd, diffInArb);
}

async function _getOrCreateGlpGmMigrationStat(
  context: any
): Promise<GlpGmMigrationStat> {
  let id = "total";
  let entity: GlpGmMigrationStat | undefined =
    await context.GlpGmMigrationStat.get(id);
  if (entity == undefined) {
    entity = {
      id: id,
      eligibleRedemptionUsd: ZERO,
      eligibleRedemptionInArb: ZERO,
    };
  }

  return entity;
}

function _getArbTokenAddress(): string {
  return "0x912ce59144191c1204e64559fe8253a0e49e6548";
}

async function _getMaxFeeBasisPointsForRebate(
  eligibleDiffInArb: BigInt,
  context: any
): Promise<BigInt> {
  let globalEntity = await _getOrCreateGlpGmMigrationStat(context);
  let eligibleRedemptionInArb = globalEntity.eligibleRedemptionInArb;

  let nextEligibleRedemptionInArb =
    BigInt(eligibleRedemptionInArb.toString()) +
    BigInt(eligibleDiffInArb.toString());
  if (!(eligibleRedemptionInArb > GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB)) {
    if (
      !(
        nextEligibleRedemptionInArb > GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB
      )
    ) {
      return MAX_FEE_BASIS_POINTS_FOR_REBATE;
    }

    return (
      GLP_GM_MIGRATION_CAP_THRESHOLD_IN_ARB -
      eligibleRedemptionInArb * MAX_FEE_BASIS_POINTS_FOR_REBATE +
      BigInt(
        Number(
          (nextEligibleRedemptionInArb -
            GLP_GM_MIGRATION_DECREASE_THRESHOLD_IN_ARB) *
            MAX_FEE_BASIS_POINTS_FOR_REBATE_REDUCED
        ) / Number(eligibleDiffInArb)
      )
    );
  }

  return MAX_FEE_BASIS_POINTS_FOR_REBATE_REDUCED;
}

export async function saveLiquidityProviderIncentivesStat(
  account: string,
  marketAddress: string,
  period: string,
  marketTokenBalanceDelta: BigInt,
  timestamp: number,
  context: any
): Promise<void> {
  if (!_incentivesActive(timestamp)) {
    return;
  }

  let entity: LiquidityProviderIncentivesStat =
    await _getOrCreateLiquidityProviderIncentivesStat(
      account,
      marketAddress,
      period,
      timestamp,
      context
    );

  if (entity.updatedTimestamp == 0) {
    let userMarketInfo = await _getUserMarketInfo(
      account,
      marketAddress,
      context
    );

    let timeInSeconds = BigInt(timestamp - entity.timestamp);

    entity = {
      ...entity,
      cumulativeTimeByMarketTokensBalance:
        userMarketInfo.marketTokensBalance * timeInSeconds,
      lastMarketTokensBalance:
        userMarketInfo.marketTokensBalance +
        BigInt(marketTokenBalanceDelta.toString()),
    };
  } else {
    let timeInSeconds = BigInt(timestamp - entity.updatedTimestamp);
    entity = {
      ...entity,
      cumulativeTimeByMarketTokensBalance:
        entity.cumulativeTimeByMarketTokensBalance +
        entity.lastMarketTokensBalance * timeInSeconds,
      lastMarketTokensBalance:
        entity.lastMarketTokensBalance +
        BigInt(marketTokenBalanceDelta.toString()),
    };
  }

  let endTimestamp = entity.timestamp + SECONDS_IN_WEEK;
  let extrapolatedTimeByMarketTokensBalance =
    entity.lastMarketTokensBalance * BigInt(endTimestamp - timestamp);
  entity = {
    ...entity,
    weightedAverageMarketTokensBalance:
      entity.cumulativeTimeByMarketTokensBalance +
      extrapolatedTimeByMarketTokensBalance / BigInt(SECONDS_IN_WEEK),
    updatedTimestamp: timestamp,
  };

  context.LiquidityProviderIncentivesStat.set(entity);
}

async function _getOrCreateLiquidityProviderIncentivesStat(
  account: string,
  marketAddress: string,
  period: string,
  timestamp: number,
  context: any
): Promise<LiquidityProviderIncentivesStat> {
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id =
    account +
    ":" +
    marketAddress +
    ":" +
    period +
    ":" +
    startTimestamp.toString();

  let entity: LiquidityProviderIncentivesStat | undefined =
    await context.LiquidityProviderIncentivesStat.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      timestamp: startTimestamp,
      period: period,
      account: account,
      marketAddress: marketAddress,
      updatedTimestamp: 0,
      lastMarketTokensBalance: ZERO,
      cumulativeTimeByMarketTokensBalance: ZERO,
      weightedAverageMarketTokensBalance: ZERO,
    };
  }

  return entity!;
}

async function _getUserMarketInfo(
  account: string,
  marketAddress: string,
  context: any
): Promise<UserMarketInfo> {
  let id = account + ":" + marketAddress;
  let entity: UserMarketInfo | undefined = context.UserMarketInfo.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      marketTokensBalance: ZERO,
      account: account,
      marketAddress: marketAddress,
    };
  }

  return entity!;
}

export async function saveUserMarketInfo(
  account: string,
  marketAddress: string,
  marketTokensDelta: BigInt,
  context: any
): Promise<void> {
  let entity: UserMarketInfo = await _getUserMarketInfo(
    account,
    marketAddress,
    context
  );
  entity = {
    ...entity,
    marketTokensBalance:
      entity.marketTokensBalance + BigInt(marketTokensDelta.toString()),
  };
  context.UserMarketInfo.set(entity);
}

export async function saveUserGlpGmMigrationStatGmData(
  account: string,
  timestamp: number,
  depositUsd: BigInt,
  context: any
): Promise<void> {
  if (!_incentivesActive(timestamp)) {
    return;
  }

  let entity = await _getOrCreateUserGlpGmMigrationStatGlpData(
    account,
    timestamp,
    context
  );

  let eligibleDiff = await _getCappedEligibleRedemptionDiff(
    entity.gmDepositUsd,
    entity.gmDepositUsd + BigInt(depositUsd.toString()),
    entity.glpRedemptionUsd,
    context
  );

  entity = {
    ...entity,
    gmDepositUsd: entity.gmDepositUsd + BigInt(depositUsd.toString()),
  };

  if (BigInt(eligibleDiff.inArb.toString()) > BigInt(ZERO.toString())) {
    entity = {
      ...entity,
      eligibleRedemptionInArb:
        entity.eligibleRedemptionInArb + BigInt(eligibleDiff.inArb.toString()),
      eligibleRedemptionUsd:
        entity.eligibleRedemptionUsd + BigInt(eligibleDiff.usd.toString()),
      eligibleUpdatedTimestamp: timestamp,
    };
  }

  context.UserGlpGmMigrationStat.set(entity);

  await _saveGlpGmMigrationStat(eligibleDiff, context);
}

export async function saveMarketIncentivesStat(
  eventData: EventLog1Item,
  event: any,
  context: any
): Promise<void> {
  if (!_incentivesActive(event.block.timestamp)) {
    return;
  }

  // tracks cumulative product of time and market tokens supply
  // to calculate weighted average supply for the period
  //
  // for example:
  // - on day 1: supply = 1000
  // - on days 2-3: supply = 2000
  // - on days 4-7: supply = 3000
  // weighted average supply = (1000 * 1 + 2000 * 2 + 3000 * 4) / 7 = ~2427
  //
  // cumulative product is increased on each deposit or withdrawal:
  // cumulative product = cumulative product + (previous tokens supply * time since last deposit/withdrawal)

  let data = new MarketPoolValueUpdatedEventData(eventData);

  let marketAddress = data.market;
  let entity = await _getOrCreateMarketIncentivesStat(
    marketAddress,
    event.block.timestamp,
    context
  );

  if (entity.updatedTimestamp == 0) {
    // new entity was created
    // interpolate cumulative time * marketTokensBalance starting from the beginning of the period

    let marketInfo = await getMarketInfo(marketAddress, context);
    let lastMarketTokensSupply =
      marketInfo.marketTokensSupplyFromPoolUpdated == undefined
        ? marketInfo.marketTokensSupply
        : marketInfo.marketTokensSupplyFromPoolUpdated;
    let timeInSeconds = event.block.timestamp - entity.timestamp;
    entity = {
      ...entity,
      cumulativeTimeByMarketTokensSupply:
        lastMarketTokensSupply * BigInt(timeInSeconds),
    };
  } else {
    let timeInSeconds = event.block.timestamp - entity.updatedTimestamp;
    entity = {
      ...entity,
      cumulativeTimeByMarketTokensSupply:
        entity.cumulativeTimeByMarketTokensSupply +
        entity.lastMarketTokensSupply * BigInt(timeInSeconds),
    };
  }

  entity = {
    ...entity,
    lastMarketTokensSupply: BigInt(data.marketTokensSupply.toString()),
    updatedTimestamp: event.block.timestamp,
  };

  let endTimestamp = entity.timestamp + SECONDS_IN_WEEK;
  let extrapolatedTimeByMarketTokensSupply =
    entity.lastMarketTokensSupply * BigInt(endTimestamp) -
    event.block.timestamp;

  entity = {
    ...entity,
    weightedAverageMarketTokensSupply:
      entity.cumulativeTimeByMarketTokensSupply +
      extrapolatedTimeByMarketTokensSupply / BigInt(SECONDS_IN_WEEK),
  };

  context.MarketIncentivesStat.set(entity);
}

async function _getOrCreateMarketIncentivesStat(
  marketAddress: string,
  timestamp: number,
  context: any
): Promise<MarketIncentivesStat> {
  let period = "1w";
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = marketAddress + ":" + period + ":" + startTimestamp.toString();

  let entity: MarketIncentivesStat | undefined =
    await context.MarketIncentivesStat.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      timestamp: startTimestamp,
      period: period,
      marketAddress: marketAddress,

      updatedTimestamp: 0,
      lastMarketTokensSupply: ZERO,
      cumulativeTimeByMarketTokensSupply: ZERO,
      weightedAverageMarketTokensSupply: ZERO,
    };
  }

  return entity;
}
