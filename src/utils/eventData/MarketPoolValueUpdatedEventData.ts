import { EventLog1Item } from "../../interfaces/interface";

/*
EventLog1: MarketPoolValueUpdated
    market: 0x70d95587d40A2caf56bd97485aB3Eec10Bee6336 (address)
    longTokenAmount: 6088502165509350933813 (uint)
    shortTokenAmount: 8119820180338 (uint)
    longTokenUsd: 9633508212528878869740167823194370000 (uint)
    shortTokenUsd: 8120756882794003791680000000000000000 (uint)
    totalBorrowingFees: 24253064237319177760800158997305547 (uint)
    borrowingFeePoolFactor: 630000000000000000000000000000 (uint)
    impactPoolAmount: 166464092070843159 (uint)
    marketTokensSupply: 19248245443925757180323660 (uint)
    poolValue: 17737043886648522121801267453574866671 (int)
    longPnl: -141367923758120031205672774014364584 (int)
    shortPnl: 173605186765705231507747816140980407 (int)
    netPnl: 32237263007585200302075042126615823 (int)
    actionType: 0x607991fc5963e264f1a94faa126c63482fdc5af14a656f08751dc8b0c5d47630 (bytes32)
    tradeKey: 0xabbce870896391ae4548dd2ed4fe3505b0c1a4d7f343bde492ec89717c8d30e5 (bytes32)
*/
export class MarketPoolValueUpdatedEventData {
  constructor(private eventData: EventLog1Item) {}

  get market(): string {
    return this.eventData.eventData_addressItems_items[0]!;
  }

  get longTokenAmount(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[0])!;
  }

  get shortTokenAmount(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[1])!;
  }

  get longTokenUsd(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[2])!;
  }

  get shortTokenUsd(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[3])!;
  }

  get totalBorrowingFees(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[4])!;
  }

  get borrowingFeePoolFactor(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[5])!;
  }

  get impactPoolAmount(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[6])!;
  }

  get marketTokensSupply(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[7])!;
  }

  get poolValue(): BigInt {
    return BigInt(this.eventData.eventData_intItems_items[0])!;
  }

  get longPnl(): BigInt {
    return BigInt(this.eventData.eventData_intItems_items[1])!;
  }

  get shortPnl(): BigInt {
    return BigInt(this.eventData.eventData_intItems_items[2])!;
  }

  get netPnl(): BigInt {
    return BigInt(this.eventData.eventData_intItems_items[3])!;
  }

  get actionType(): string {
    return this.eventData.eventData_bytes32Items_items[0]!;
  }

  get tradeKey(): string {
    return this.eventData.eventData_bytes32Items_items[1]!;
  }
}
