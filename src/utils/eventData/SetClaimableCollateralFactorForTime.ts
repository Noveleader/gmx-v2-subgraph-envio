import { EventLog2Item } from "../../interfaces/interface";

/*
EventLog2: ClaimableCollateralUpdated

eventData.addressItems.initItems(2);
eventData.addressItems.setItem(0, "market", market);
eventData.addressItems.setItem(1, "token", token);

eventData.uintItems.initItems(2);
eventData.uintItems.setItem(0, "timeKey", timeKey);
eventData.uintItems.setItem(1, "factor", factor);
*/

export class SetClaimableCollateralFactorForTimeEventData {
  constructor(private eventData: EventLog2Item) {}

  get market(): string {
    return this.eventData.eventData_addressItems_items[0]!;
  }

  get token(): string {
    return this.eventData.eventData_addressItems_items[1]!;
  }

  get timeKey(): string {
    return this.eventData.eventData_uintItems_items[0]!;
  }

  get factor(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[1]!);
  }
}
