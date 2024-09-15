import { Transaction } from "generated/src/Types.gen";

export function getIdFromEvent(event: any): string {
  return event.transaction.hash.toString() + ":" + event.logIndex.toString();
}

export async function getOrCreateTransaction(
  event: any,
  chainId: number,
  context: any
): Promise<Transaction> {
  let id = event.transaction.hash.toString();
  let entity: Transaction | undefined = await context.Transaction.get(id);
  if (entity == undefined) {
    entity = {
      id: id,
      chainId: chainId,
      hash: event.transaction.hash.toString(),
      timestamp: Number(event.block.timestamp),
      blockNumber: Number(event.block.number),
      transactionIndex: Number(event.transaction.transactionIndex),
      from: event.transaction.from.toString(),
      to: event.transaction.to.toString() == null ? "" : event.transaction.to,
    };
    context.Transaction.set(entity);
  }

  return entity as Transaction;
}
