export function getSwapInfoId(orderKey: string, marketAddress: string): string {
  return orderKey + ":" + marketAddress;
}
