import { EventLog1Item } from "../../interfaces/interface";

/*
EventLog1: ClaimableCollateralUpdated

market: 0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9 (address)
token: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 (address)
account: 0xC91CC0d42A48bCE63C4223C630daecF364E451C9 (address)
timeKey: 473159 (uint)
delta: 4101823255 (uint)
nextValue: 4101823255 (uint)
nextPoolValue: 45965608008 (uint)
*/

export class ClaimableCollateralUpdatedEventData {
  constructor(private eventData: EventLog1Item) {}

  get market(): string {
    return this.eventData.eventData_addressItems_items[0]!;
  }

  get token(): string {
    return this.eventData.eventData_addressItems_items[1]!;
  }

  get account(): string {
    return this.eventData.eventData_addressItems_items[2]!;
  }

  get timeKey(): string {
    return this.eventData.eventData_uintItems_items[0]!;
  }

  get delta(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[1]!);
  }

  get nextValue(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[2]!);
  }

  get nextPoolValue(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[3]!);
  }
}
