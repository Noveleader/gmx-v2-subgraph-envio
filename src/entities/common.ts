import { Transaction } from "ethers";

export async function getOrCreateTransaction(
  event: any,
  context: any
): Promise<Transaction> {
  let id = event.transactionHash.toString();
  let entity: Transaction | undefined = await context.Transaction.get(id);
  if (entity == undefined) {
    let entity = {
      id: id,
      hash: event.transactionHash.toString(),
      timestamp: Number(event.blockTimestamp),
      blockNumber: Number(event.blockNumber),
      transactionIndex: Number(event.transactionIndex),
      from: event.srcAddress.toString(),
      to: event.txTo == null ? "" : event.txTo,
    };
    context.Transaction.set(entity);
  }

  return entity as Transaction;
}
