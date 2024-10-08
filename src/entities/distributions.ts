import { Distribution } from "generated/src/Types.gen";
import { getTokenPrice } from "./prices";

export async function saveDistribution(
  receiver: string,
  token: string,
  amount: BigInt,
  typeId: number,
  txHash: string,
  blockNumber: number,
  timestamp: number,
  chainId: number,
  context: any
): Promise<void> {
  let id = receiver + ":" + txHash + ":" + typeId.toString();
  let entity: Distribution | undefined = await context.Distribution.get(id);

  if (entity == undefined) {
    entity = {
      id: id,
      chainId: chainId,
      tokens: new Array<string>(0),
      amounts: new Array<bigint>(0),
      amountsInUsd: new Array<bigint>(0),
      receiver: "",
      typeId: 0,
      transactionHash: "",
      blockNumber: 0,
      timestamp: 0,
    };
  }

  let tokens = entity.tokens;
  tokens.push(token);

  let amounts = entity.amounts;
  amounts.push(BigInt(amount.toString()));

  let amountsInUsd = entity.amountsInUsd;
  amountsInUsd.push(
    BigInt((await _getAmountInUsd(token, amount, context)).toString())
  );

  entity = {
    ...entity,
    tokens: tokens,
    amounts: amounts,
    amountsInUsd: amountsInUsd,
    typeId: typeId,
    receiver: receiver,
    blockNumber: blockNumber,
    transactionHash: txHash,
    timestamp: timestamp,
  };

  context.Distribution.set(entity);
}

async function _getAmountInUsd(
  token: string,
  amount: BigInt,
  context: any
): Promise<BigInt> {
  let tokenPrice = await getTokenPrice(token, context);
  return BigInt(tokenPrice.toString()) * BigInt(amount.toString());
}
