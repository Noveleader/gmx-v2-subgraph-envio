import { EventLog2Item } from "../../interfaces/interface";

/*
EventLog2: ClaimableCollateralUpdated

addressItems.initItems(3);
addressItems.setItem(0, "market", market);
addressItems.setItem(1, "token", token);
addressItems.setItem(2, "account", account);

uintItems.initItems(2);
uintItems.setItem(0, "timeKey", timeKey);
uintItems.setItem(1, "factor", factor);
*/

export class SetClaimableCollateralFactorForAccountEventData {
  constructor(private eventData: EventLog2Item) {}

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

  get factor(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[1]!);
  }
}
