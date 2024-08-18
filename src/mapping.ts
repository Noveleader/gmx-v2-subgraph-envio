import {
  EventEmitter_EventLog1_eventArgs,
  SellUSDG,
  Vault_SellUSDG_eventArgs,
} from "generated/src/Types.gen";
import { saveUserGlpGmMigrationStatGlpData } from "./entities/liquidityIncentives";
let ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
let SELL_USDG_ID = "last";

export function handleSellUSDG(event: any, context: any): void {
  let sellUsdgEntity: SellUSDG = {
    id: SELL_USDG_ID,
    txHash: event.transactionHash.toString(),
    logIndex: event.logIndex.toString(),
    feeBasisPoints: event.params.feeBasisPoints,
  };
  context.SellUSDG.set(sellUsdgEntity);
}

export async function handleRemoveLiquidity(
  event: any,
  context: any
): Promise<void> {
  let sellUsdgEntity: SellUSDG | undefined = await context.SellUSDG.get(
    SELL_USDG_ID
  );

  if (sellUsdgEntity == undefined) {
    context.log.error("No SellUSDG entity tx: {}", [
      event.transactionHash.toString(),
    ]);
    throw new Error("No SellUSDG entity");
  }

  if (sellUsdgEntity.txHash != event.transactionHash.toString()) {
    context.log.error(
      "SellUSDG entity tx hashes don't match: expected {} actual {}",
      [event.transaction.hash.toHexString(), sellUsdgEntity.txHash]
    );

    throw new Error("SellUSDG entity tx hashes don't match");
  }

  let expectedLogIndex = Number(event.logIndex.toString()) - 1;

  if (sellUsdgEntity.logIndex != expectedLogIndex) {
    context.log.error(
      "SellUSDG entity incorrect log index: expected {} got {}",
      [
        expectedLogIndex.toString(),
        (sellUsdgEntity.logIndex as number).toString(),
      ]
    );

    throw new Error("SellUSDG entity tx hashes don't match");
  }

  saveUserGlpGmMigrationStatGlpData(
    event.params.account.toString(),
    Number(event.blockTimestamp),
    event.params.usdgAmount,
    sellUsdgEntity.feeBasisPoints,
    context
  );
}
