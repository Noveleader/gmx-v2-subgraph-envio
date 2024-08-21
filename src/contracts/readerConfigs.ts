class ReaderContractConfig {
  public readerContractAddress: string;
  public dataStoreAddress: string;
  constructor(
    readerContractAddress: string,
    dataStoreAddress: string,
    public blockNumber: number
  ) {
    this.readerContractAddress = readerContractAddress;
    this.dataStoreAddress = dataStoreAddress;
  }
}

let readerContractByNetwork = new Map<string, ReaderContractConfig>();

readerContractByNetwork.set(
  "arbitrum",
  new ReaderContractConfig(
    "0x38d91ED96283d62182Fc6d990C24097A918a4d9b",
    "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8",
    112723063 + 1
  )
);

readerContractByNetwork.set(
  "avalanche",
  new ReaderContractConfig(
    "0xd868eF2fa279b510F64F44C66F08a0AEeBcBdB6b",
    "0x2F0b22339414ADeD7D5F06f9D604c7fF5b2fe3f6",
    32500437 + 1
  )
);

export function getReaderContractConfigByNetwork(
  network: string,
  context: any
): ReaderContractConfig {
  let contract = readerContractByNetwork.get(network);
  if (!contract) {
    context.log.warn(`Contract address not found for network {} ${[network]}`);
    throw new Error("Contract address not found for network");
  }

  return contract;
}
