import { EventLog1Item } from "../../interfaces/interface";

/*
market: 0x339eF6aAcF8F4B2AD15BdcECBEED1842Ec4dBcBf (address)
distributionAmount: 16278 (uint)
nextPositionImpactPoolAmount: 661876257 (uint)
*/

export class PositionImpactPoolDistributedEventData {
  constructor(private eventData: EventLog1Item) {}

  get market(): string {
    return this.eventData.eventData_addressItems_items[0]!;
  }

  get distributionAmount(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[0]!);
  }

  get nextPositionImpactPoolAmount(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[1]!);
  }
}
