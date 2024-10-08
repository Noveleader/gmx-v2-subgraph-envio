import {
  GlpGmMigrationStat,
  LiquidityProviderIncentivesStat,
  IncentivesStat,
  UserGlpGmMigrationStat,
  LiquidityProviderInfo,
} from "generated/src/Types.gen";
import { periodToSeconds, timestampToPeriodStart } from "../../utils/time";
import { ZERO } from "../../utils/number";
import { convertAmountToUsd, convertUsdToAmount } from "../prices";
import { EventLog1Item } from "../../interfaces/interface";
import { MarketPoolValueUpdatedEventData } from "../../utils/eventData/MarketPoolValueUpdatedEventData";
import { getMarketInfo } from "../markets";
import { GlvOrMarketType_t } from "generated/src/db/Enums.gen";

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
  chainId: number,
  context: any
): Promise<void> {
  if (!_incentivesActive(timestamp)) {
    return;
  }

  let entity = await _getOrCreateUserGlpGmMigrationStatGlpData(
    account,
    timestamp,
    chainId,
    context
  );

  let usdAmount = BigInt(usdgAmount.toString()) * BigInt(10) ** BigInt(12);
  let eligibleDiff = await _getCappedEligibleRedemptionDiff(
    entity.glpRedemptionUsd,
    entity.glpRedemptionUsd + usdAmount,
    entity.gmDepositUsd,
    chainId,
    context
  );

  let maxFeeBasisPointsForRebate = await _getMaxFeeBasisPointsForRebate(
    eligibleDiff.inArb,
    chainId,
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

  await _saveGlpGmMigrationStat(eligibleDiff, chainId, context);
}

async function _saveGlpGmMigrationStat(
  diff: EligibleRedemptionDiffResult,
  chainId: number,
  context: any
): Promise<void> {
  if (diff.usd == ZERO) {
    return;
  }

  let entity = await _getOrCreateGlpGmMigrationStat(chainId, context);
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
  chainId: number,
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
      chainId: chainId,
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
  chainId: number,
  context: any
): Promise<EligibleRedemptionDiffResult> {
  // case 1: gmDepositUsd: 1000, gmDepositUsd after: 1500, glpRedemptionUsd: 2000 => diffUsd: 500
  // case 2: gmDepositUsd: 1000, gmDepositUsd after: 1500, glpRedemptionUsd: 1200 => diffUsd: 200
  // case 3: gmDepositUsd: 1000, gmDepositUsd after: 1500, glpRedemptionUsd: 800 => diffUsd: 0

  let entity = await _getOrCreateGlpGmMigrationStat(chainId, context);

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
  chainId: number,
  context: any
): Promise<GlpGmMigrationStat> {
  let id = "total";
  let entity: GlpGmMigrationStat | undefined =
    await context.GlpGmMigrationStat.get(id);
  if (entity == undefined) {
    entity = {
      id: id,
      chainId: chainId,
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
  chainId: number,
  context: any
): Promise<BigInt> {
  let globalEntity = await _getOrCreateGlpGmMigrationStat(context, chainId);
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
  glvOrMarketAddress: string,
  type: string,
  period: string,
  marketTokenBalanceDelta: BigInt,
  timestamp: number,
  chainId: number,
  context: any
): Promise<void> {
  if (!_incentivesActive(timestamp)) {
    return;
  }

  let entity: LiquidityProviderIncentivesStat =
    await _getOrCreateLiquidityProviderIncentivesStat(
      account,
      glvOrMarketAddress,
      type,
      period,
      timestamp,
      chainId,
      context
    );

  if (entity.updatedTimestamp == 0) {
    let liquidityProviderInfo = await _getLiquidityProviderInfo(
      account,
      glvOrMarketAddress,
      type,
      chainId,
      context
    );

    let timeInSeconds = BigInt(timestamp - entity.timestamp);

    entity = {
      ...entity,
      cumulativeTimeByTokensBalance:
        liquidityProviderInfo.tokensBalance * timeInSeconds,
      lastTokensBalance:
        liquidityProviderInfo.tokensBalance +
        BigInt(marketTokenBalanceDelta.toString()),
    };
  } else {
    let timeInSeconds = BigInt(timestamp - entity.updatedTimestamp);
    entity = {
      ...entity,
      cumulativeTimeByTokensBalance:
        entity.cumulativeTimeByTokensBalance +
        entity.lastTokensBalance * timeInSeconds,
      lastTokensBalance:
        entity.lastTokensBalance +
        BigInt(marketTokenBalanceDelta.toString()),
    };
  }

  let endTimestamp = entity.timestamp + SECONDS_IN_WEEK;
  let extrapolatedTimeByMarketTokensBalance =
    entity.lastTokensBalance * BigInt(endTimestamp - timestamp);
  entity = {
    ...entity,
    weightedAverageTokensBalance:
      entity.cumulativeTimeByTokensBalance +
      extrapolatedTimeByMarketTokensBalance / BigInt(SECONDS_IN_WEEK),
    updatedTimestamp: timestamp,
  };

  context.LiquidityProviderIncentivesStat.set(entity);
}

async function _getOrCreateLiquidityProviderIncentivesStat(
  account: string,
  glvOrMarketAddress: string,
  type: string,
  period: string,
  timestamp: number,
  chainId: number,
  context: any
): Promise<LiquidityProviderIncentivesStat> {
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id =
    account +
    ":" +
    glvOrMarketAddress +
    ":" +
    period +
    ":" +
    startTimestamp.toString();

  let entity: LiquidityProviderIncentivesStat | undefined =
    await context.LiquidityProviderIncentivesStat.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      chainId: chainId,
      timestamp: startTimestamp,
      period: period,
      account: account,
      glvOrMarketAddress: glvOrMarketAddress,
      typeGm: _mapGlvOrMarketType(type),
      updatedTimestamp: 0,
      lastTokensBalance: ZERO,
      cumulativeTimeByTokensBalance: ZERO,
      weightedAverageTokensBalance: ZERO,
    };
  }

  return entity!;
}

export async function saveLiquidityProviderInfo(
  account: string,
  glvOrMarketAddress: string,
  type: string,
  tokensDelta: BigInt,
  chainId: number,
  context: any
): Promise<void> {
  let entity = await _getLiquidityProviderInfo(
    account,
    glvOrMarketAddress,
    type,
    chainId,
    context
  );
  entity = {
    ...entity,
    tokensBalance: entity.tokensBalance + BigInt(tokensDelta.toString()),
  };
  context.LiquidityProviderInfo.set(entity);
}

export async function saveUserGlpGmMigrationStatGmData(
  account: string,
  timestamp: number,
  depositUsd: BigInt,
  chainId: number,
  context: any
): Promise<void> {
  if (!_incentivesActive(timestamp)) {
    return;
  }

  let entity = await _getOrCreateUserGlpGmMigrationStatGlpData(
    account,
    timestamp,
    chainId,
    context
  );

  let eligibleDiff = await _getCappedEligibleRedemptionDiff(
    entity.gmDepositUsd,
    entity.gmDepositUsd + BigInt(depositUsd.toString()),
    entity.glpRedemptionUsd,
    chainId,
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

  await _saveGlpGmMigrationStat(eligibleDiff, chainId, context);
}

export async function saveMarketIncentivesStat(
  eventData: EventLog1Item,
  event: any,
  chainId: number,
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
  let entity = await _getOrCreateIncentivesStat(
    marketAddress,
    "Market",
    event.block.timestamp,
    chainId,
    context
  );

  if (entity.updatedTimestamp == 0) {
    // new entity was created
    // interpolate cumulative time * tokensBalance starting from the beginning of the period

    let marketInfo = await getMarketInfo(marketAddress, chainId, context);
    let lastTokensSupply =
      marketInfo.marketTokensSupplyFromPoolUpdated == undefined
        ? marketInfo.marketTokensSupply
        : marketInfo.marketTokensSupplyFromPoolUpdated;
    let timeInSeconds = event.block.timestamp - entity.timestamp;
    entity = {
      ...entity,
      cumulativeTimeByTokensSupply: lastTokensSupply * BigInt(timeInSeconds),
    };
  } else {
    let timeInSeconds = event.block.timestamp - entity.updatedTimestamp;
    entity = {
      ...entity,
      cumulativeTimeByTokensSupply:
        entity.cumulativeTimeByTokensSupply +
        entity.lastTokensSupply * BigInt(timeInSeconds),
    };
  }

  entity = {
    ...entity,
    lastTokensSupply: BigInt(data.marketTokensSupply.toString()),
    updatedTimestamp: event.block.timestamp,
  };

  let endTimestamp = entity.timestamp + SECONDS_IN_WEEK;
  let extrapolatedTimeByMarketTokensSupply =
    entity.lastTokensSupply * BigInt(endTimestamp) - event.block.timestamp;

  entity = {
    ...entity,
    weightedAverageTokensSupply:
      entity.cumulativeTimeByTokensSupply +
      extrapolatedTimeByMarketTokensSupply / BigInt(SECONDS_IN_WEEK),
  };

  context.IncentivesStat.set(entity);
}

async function _getLiquidityProviderInfo(
  account: string,
  glvOrMarketAddress: string,
  type: string,
  chainId: number,
  context: any
): Promise<LiquidityProviderInfo> {
  let id = account + ":" + glvOrMarketAddress;
  let entity: LiquidityProviderInfo | undefined =
    await context.LiquidityProviderInfo.get(id);
  if (entity == undefined) {
    entity = {
      id: id,
      chainId: chainId,
      tokensBalance: ZERO,
      account: account,
      glvOrMarketAddress: glvOrMarketAddress,
      typeGm: _mapGlvOrMarketType(type),
    };
  }
  return entity!;
}

async function _getOrCreateIncentivesStat(
  glvOrMarketAddress: string,
  type: string,
  timestamp: number,
  chainId: number,
  context: any
): Promise<IncentivesStat> {
  let period = "1w";
  let startTimestamp = timestampToPeriodStart(timestamp, period);
  let id = glvOrMarketAddress + ":" + period + ":" + startTimestamp.toString();

  let entity: IncentivesStat | undefined = await context.IncentivesStat.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      chainId: chainId,
      timestamp: startTimestamp,
      period: period,
      glvOrMarketAddress: glvOrMarketAddress,
      typeGm: _mapGlvOrMarketType(type),

      updatedTimestamp: 0,
      lastTokensSupply: ZERO,
      cumulativeTimeByTokensSupply: ZERO,
      weightedAverageTokensSupply: ZERO,
    };
  }

  return entity;
}

function _mapGlvOrMarketType(actionType: string): GlvOrMarketType_t {
  switch (actionType.toLowerCase()) {
    case "glv":
      return "Glv";
    case "market":
      return "Market";
    default:
      throw new Error(`Invalid GlvOrMarketType: ${actionType}`);
  }
}
