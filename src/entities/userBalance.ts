import { Transaction } from "ethers";

export function saveUserGmTokensBalanceChange(
  account: string,
  marketAddress: string,
  value: BigInt,
  transaction: Transaction,
  transactionLogIndex: BigInt
): void {}
