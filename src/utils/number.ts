export let ZERO = BigInt(0);
export let ONE = BigInt(1);

export function expandDecimals(n: BigInt, decimals: number): BigInt {
  return BigInt(n.toString()) * BigInt(10) ** BigInt(decimals);
}
