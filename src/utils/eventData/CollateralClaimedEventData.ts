import { EventLog1Item } from "../../interfaces/interface";

export class CollateralClaimedEventData {
  public eventDataAddressItemsItems: any;
  public eventDataUintItemsItems: any;

  constructor(private eventData: EventLog1Item) {
    this.eventDataAddressItemsItems = eventData.eventData_addressItems_items;
    this.eventDataUintItemsItems = eventData.eventData_uintItems_items;
  }

  get market(): string {
    return this.eventDataAddressItemsItems[0]!;
  }

  get token(): string {
    return this.eventDataAddressItemsItems[2]!;
  }

  get account(): string {
    return this.eventDataAddressItemsItems[3]!;
  }

  get receiver(): string {
    return this.eventDataAddressItemsItems[4]!;
  }

  get timeKey(): string {
    return this.eventDataUintItemsItems[0];
  }

  get amount(): BigInt {
    return BigInt(this.eventDataUintItemsItems[1]!);
  }

  get nextPoolValue(): BigInt {
    return BigInt(this.eventDataUintItemsItems[2]!);
  }
}
