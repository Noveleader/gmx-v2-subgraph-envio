import { CollectedMarketFeesInfo } from "generated";
import { timestampToPeriodStart } from "../utils/time";
import { ZERO } from "../utils/number";

export async function getOrCreateCollectedMarketFees(
  marketAddress: string,
  timestamp: number,
  period: string,
  context: any
): Promise<CollectedMarketFeesInfo> {
  let timestampGroup = timestampToPeriodStart(timestamp, period);

  let id = marketAddress + ":" + period;

  if (period != "total") {
    id = id + ":" + timestampGroup.toString();
  }

  let collectedFees: CollectedMarketFeesInfo | undefined =
    await context.CollectedMarketFeesInfo.get(id);

  if (collectedFees == undefined) {
    collectedFees = {
      id: id,
      marketAddress: marketAddress,
      period: period,
      timestampGroup: timestampGroup,
      feeUsdForPool: ZERO,
      cummulativeFeeUsdForPool: ZERO,
      feeUsdPerPoolValue: ZERO,
      cumulativeFeeUsdPerPoolValue: ZERO,
      feeUsdPerGmToken: ZERO,
      cumulativeFeeUsdPerGmToken: ZERO,
      prevCumulativeFeeUsdPerGmToken: ZERO,
    };
  }

  return collectedFees as CollectedMarketFeesInfo;
}
