import { EventLog1Item } from "../../interfaces/interface";

/*
token: 0xCcF73F4Dcbbb573296BFA656b754Fe94BB957d62 (address)
minPrice: 307124596764500000000000000 (uint)
maxPrice: 307136214319700000000000000 (uint)
timestamp: 1698042828 (uint)
priceSourceType: 2 (uint)
*/

export class OraclePriceUpdateEventData {
  constructor(private eventData: EventLog1Item) {}

  get token(): string {
    return this.eventData.eventData_addressItems_items[0]!;
  }

  get minPrice(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[0]!);
  }

  get maxPrice(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[1]!);
  }

  get timestamp(): BigInt {
    return BigInt(this.eventData.eventData_uintItems_items[2]!);
  }

  get priceSourceType(): BigInt {
    return BigInt(2);
  }
}
