import { ClaimableCollateral, ClaimableCollateralGroup } from "generated";
import { EventLog1Item, EventLog2Item } from "../interfaces/interface";
import { CollateralClaimedEventData } from "../utils/eventData/CollateralClaimedEventData";
import { ClaimableCollateralUpdatedEventData } from "../utils/eventData/ClaimableCollateralUpdatedEventData";
import { SetClaimableCollateralFactorForTimeEventData } from "../utils/eventData/SetClaimableCollateralFactorForTime";
import { SetClaimableCollateralFactorForAccountEventData } from "../utils/eventData/SetClaimableCollateralFactorForAccount";

export async function handleCollateralClaimed(
  eventData: EventLog1Item,
  context: any
): Promise<void> {
  let data = new CollateralClaimedEventData(eventData);

  let entity = await getOrCreateClaimableCollateral(
    data.account,
    data.market,
    data.token,
    data.timeKey,
    context
  );

  entity = {
    ...entity,
    claimed: true,
  };

  context.ClaimableCollateral.set(entity);
}

async function getOrCreateClaimableCollateral(
  account: string,
  market: string,
  token: string,
  timeKey: string,
  context: any
): Promise<ClaimableCollateral> {
  let id = account + ":" + market + ":" + token + ":" + timeKey;

  let entity: ClaimableCollateral | undefined =
    await context.ClaimableCollateral.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      account: account,
      marketAddress: market,
      tokenAddress: token,
      timeKey: timeKey,
      claimed: false,
      factor: BigInt(0),
      value: BigInt(0),
      factorByTime: BigInt(0),
    };
  }

  return entity as ClaimableCollateral;
}

export async function handleClaimableCollateralUpdated(
  eventData: EventLog1Item,
  context: any
): Promise<void> {
  let data = new ClaimableCollateralUpdatedEventData(eventData);
  let entity = await getOrCreateClaimableCollateral(
    data.account,
    data.market,
    data.token,
    data.timeKey,
    context
  );
  let groupEntity = await getOrCreateClaimableCollateralGroup(
    data.market,
    data.token,
    data.timeKey,
    context
  );

  entity = {
    ...entity,
    value: BigInt(data.nextValue.toString()),
    factorByTime: groupEntity.factor,
  };

  let claimables = groupEntity.claimables;
  if (!claimables.includes(entity.id)) {
    claimables.push(entity.id);
  }

  groupEntity = {
    ...groupEntity,
    claimables: claimables,
  };

  context.ClaimableCollateral.set(entity);
  context.ClaimableCollateralGroup.set(entity);
}

export async function handleSetClaimableCollateralFactorForTime(
  eventData: EventLog2Item,
  context: any
): Promise<void> {
  let data = new SetClaimableCollateralFactorForTimeEventData(eventData);

  let entity = await getOrCreateClaimableCollateralGroup(
    data.market,
    data.token,
    data.timeKey,
    context
  );

  entity = {
    ...entity,
    factor: BigInt(Number(data.factor)),
  };

  let claimables = entity.claimables;

  for (let i = 0; i < claimables.length; i++) {
    let id = claimables[i];

    if (!id) {
      context.log.warn(
        `ClaimableCollateral id is undefined {} ${[i.toString()]}`
      );
      throw new Error("ClaimableCollateral id is undefined");
    }

    let claimable: ClaimableCollateral | undefined =
      await context.ClaimableCollateral.get(id);

    if (claimable == undefined) {
      context.log.warn(`ClaimableCollateral not found {} ${[id]}`);
      throw new Error("ClaimableCollateral not found");
    }

    claimable = {
      ...claimable,
      factorByTime: BigInt(data.factor.toString()),
    };

    context.ClaimableCollateral.set(claimable);
  }

  context.ClaimableCollateralGroup.set(entity);
}

export async function handleSetClaimableCollateralFactorForAccount(
  eventData: EventLog2Item,
  context: any
): Promise<void> {
  let data = new SetClaimableCollateralFactorForAccountEventData(eventData);

  let entity = await getOrCreateClaimableCollateral(
    data.account,
    data.market,
    data.token,
    data.timeKey,
    context
  );

  entity = {
    ...entity,
    factor: BigInt(Number(data.factor)),
  };

  context.ClaimableCollateral.set(entity);
}

async function getOrCreateClaimableCollateralGroup(
  market: string,
  token: string,
  timeKey: string,
  context: any
): Promise<ClaimableCollateralGroup> {
  let id = market + ":" + token + ":" + timeKey.toString();
  let entity: ClaimableCollateralGroup | undefined =
    await context.ClaimableCollateralGroup.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      marketAddress: market,
      tokenAddress: token,
      timeKey: timeKey,
      factor: BigInt(0),
      claimables: new Array<string>(0),
    };
  }

  return entity;
}
