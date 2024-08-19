import {
  UserGmTokensBalanceChange,
  Transaction,
  User,
  LatestUserGmTokensBalanceChangeRef,
} from "generated";
import { ONE, ZERO } from "../utils/number";
import { getOrCreateCollectedMarketFees } from "./fee";

export async function saveUserGmTokensBalanceChange(
  account: string,
  marketAddress: string,
  value: BigInt,
  transaction: Transaction,
  transactionLogIndex: BigInt,
  context: any
): Promise<void> {
  let prevEntity = await getLatestUserGmTokensBalanceChange(
    account,
    marketAddress,
    context
  );

  let isDeposit = BigInt(value.toString()) > ZERO;
  let entity = await _createUserGmTokensBalanceChange(
    account,
    marketAddress,
    transaction,
    transactionLogIndex,
    isDeposit ? "in" : "out",
    context
  );

  let totalFees = await context.CollectedMarketFeesInfo.get(
    marketAddress + ":total"
  );
  let prevBalance = prevEntity ? prevEntity.tokensBalance : ZERO;
  let prevCumulativeIncome = prevEntity ? prevEntity.cumulativeIncome : ZERO;

  let income = await calcIncomeForEntity(prevEntity, isDeposit);

  entity = {
    ...entity,
    tokensBalance: prevBalance + BigInt(value.toString()),
    cumulativeIncome: prevCumulativeIncome + BigInt(income.toString()),
    index: prevEntity ? prevEntity.index + ONE : ZERO,
  };

  if (totalFees) {
    entity = {
      ...entity,
      cumulativeFeeUsdPerGmToken: isDeposit
        ? totalFees.prevCumulativeFeeUsdPerGmToken
        : totalFees.cumulativeFeeUsdPerGmToken,
    };
  }

  context.UserGmTokensBalanceChange.set(entity);

  await saveLatestUserGmTokensBalanceChange(entity, context);
}

async function getLatestUserGmTokensBalanceChange(
  account: string,
  marketAddress: string,
  context: any
): Promise<UserGmTokensBalanceChange | null> {
  let id = account + ":" + marketAddress;
  let latestRef = await context.LatestUserGmTokensBalanceChangeRef.get(id);

  if (!latestRef) return null;

  let latestId = latestRef.getLatestUserGmTokensBalanceChange;

  if (!latestId) {
    context.log.warn(
      "LatestUserGmTokensBalanceChangeRef.latestUserGmTokensBalanceChange is null: {}",
      [id]
    );
    throw new Error(
      "LatestUserGmTokensBalanceChangeRef.latestUserGmTokensBalanceChange is null"
    );
  }

  return await context.UserGmTokensBalanceChange.get(latestId);

  return null;
}

async function _createUserGmTokensBalanceChange(
  account: string,
  marketAddress: string,
  transaction: Transaction,
  transactionLogIndex: BigInt,
  postfix: string,
  context: any
): Promise<UserGmTokensBalanceChange> {
  let id =
    account +
    ":" +
    marketAddress +
    ":" +
    transaction.hash +
    ":" +
    transactionLogIndex.toString() +
    ":" +
    postfix;
  let entity = await context.UserGmTokensBalanceChange.get(id);

  if (entity) {
    context.log.warn("UserGmTokensBalanceChange already exists: {}", [
      entity.id,
    ]);
    throw new Error("UserGmTokensBalanceChange already exists");
  }

  let newEntity: UserGmTokensBalanceChange = {
    id: id,
    account: account,
    marketAddress: marketAddress,
    index: ZERO,
    tokensBalance: ZERO,
    timestamp: transaction.timestamp,
    cumulativeIncome: ZERO,
    cumulativeFeeUsdPerGmToken: ZERO,
  };

  return newEntity;
}

async function calcIncomeForEntity(
  entity: UserGmTokensBalanceChange | null,
  isDeposit: boolean
): Promise<BigInt> {
  if (!entity) return ZERO;
  if (entity.tokensBalance == ZERO) return ZERO;

  let currentFees = await getOrCreateCollectedMarketFees(
    entity.marketAddress,
    0,
    "total",
    context
  );
  let latestCumulativeFeePerGm = isDeposit
    ? currentFees.prevCumulativeFeeUsdPerGmToken
    : currentFees.cumulativeFeeUsdPerGmToken;
  let feeUsdPerGmToken =
    latestCumulativeFeePerGm - entity.cumulativeFeeUsdPerGmToken;

  return (feeUsdPerGmToken * entity.tokensBalance) / BigInt(10) ** BigInt(18);
}

async function saveLatestUserGmTokensBalanceChange(
  change: UserGmTokensBalanceChange,
  context: any
): Promise<void> {
  let id = change.account + ":" + change.marketAddress;
  let latestRef: LatestUserGmTokensBalanceChangeRef | undefined =
    context.LatestUserGmTokensBalanceChangeRef.get(id);

  if (latestRef == undefined) {
    latestRef = {
      id: id,
      latestUserGmTokensBalanceChange_id: change.id,
    };
  }

  latestRef = {
    ...latestRef,
    latestUserGmTokensBalanceChange_id: change.id,
  };

  context.entity.set(latestRef);
}
