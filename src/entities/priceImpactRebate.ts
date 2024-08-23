import { ClaimableCollateral, ClaimableCollateralGroup } from "generated";
import { EventLog1Item } from "../interfaces/interface";
import { CollateralClaimedEventData } from "../utils/eventData/CollateralClaimedEventData";
import { ClaimableCollateralUpdatedEventData } from "../utils/eventData/ClaimableCollateralUpdatedEventData";

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
    };
  }

  return entity;
}
