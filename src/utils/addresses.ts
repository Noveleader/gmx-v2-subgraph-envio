export function getReaderAddress(chainId: number): string {
  let readerAddress: string = "0x5Ca84c34a381434786738735265b9f3FD814b824";
  if (chainId == 42161) {
    readerAddress = "0x5Ca84c34a381434786738735265b9f3FD814b824";
  } else if (chainId == 43114) {
    readerAddress = "0xBAD04dDcc5CC284A86493aFA75D2BEb970C72216";
  }
  return readerAddress;
}
