import { SwapVolumeInfo, VolumeInfo } from "generated";
import { timestampToPeriodStart } from "../utils/time";
import { ZERO } from "../utils/number";

async function getOrCreateSwapVolumeInfo(
  timestamp: number,
  tokenIn: string,
  tokenOut: string,
  period: string,
  context: any
): Promise<SwapVolumeInfo> {
  let timestampGroup = timestampToPeriodStart(timestamp, period);

  let id = getVolumeInfoId(tokenIn, tokenOut) + ":" + period;
  if (period != "total") {
    id = id + ":" + timestampGroup.toString();
  }
  let volumeInfo: SwapVolumeInfo | undefined = await context.SwapVolumeInfo.get(
    id
  );

  if (volumeInfo == undefined) {
    volumeInfo = {
      id: id,
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      timestamp: timestampGroup,
      period: period,
      volumeUsd: BigInt(0),
    };
  }
  return volumeInfo as SwapVolumeInfo;
}

export async function saveSwapVolumeInfo(
  timestamp: number,
  tokenIn: string,
  tokenOut: string,
  volumeUsd: BigInt,
  context: any
): Promise<void> {
  let hourlyVolumeInfo = await getOrCreateSwapVolumeInfo(
    timestamp,
    tokenIn,
    tokenOut,
    "1h",
    context
  );

  let dailyVolumeInfo = await getOrCreateSwapVolumeInfo(
    timestamp,
    tokenIn,
    tokenOut,
    "1d",
    context
  );

  let totalVolumeInfo = await getOrCreateSwapVolumeInfo(
    timestamp,
    tokenIn,
    tokenOut,
    "total",
    context
  );

  hourlyVolumeInfo = {
    ...hourlyVolumeInfo,
    volumeUsd: BigInt(Number(hourlyVolumeInfo.volumeUsd) + Number(volumeUsd)),
  };

  dailyVolumeInfo = {
    ...dailyVolumeInfo,
    volumeUsd: BigInt(Number(dailyVolumeInfo.volumeUsd) + Number(volumeUsd)),
  };

  totalVolumeInfo = {
    ...totalVolumeInfo,
    volumeUsd: BigInt(Number(totalVolumeInfo.volumeUsd) + Number(volumeUsd)),
  };

  context.SwapVolumeInfo.set(hourlyVolumeInfo);
  context.SwapVolumeInfo.set(dailyVolumeInfo);
  context.SwapVolumeInfo.set(totalVolumeInfo);
}

export async function saveVolumeInfo(
  type: string,
  timestamp: number,
  volume: BigInt,
  context: any
) {
  let hourlyVolumeInfo = await getOrCreateVolumeInfo(timestamp, "1h", context);
  let dailyVolumeInfo = await getOrCreateVolumeInfo(timestamp, "1d", context);
  let totalVolumeInfo = await getOrCreateVolumeInfo(
    timestamp,
    "total",
    context
  );

  hourlyVolumeInfo = {
    ...hourlyVolumeInfo,
    volumeUsd: BigInt(Number(hourlyVolumeInfo.volumeUsd) + Number(volume)),
  };

  dailyVolumeInfo = {
    ...dailyVolumeInfo,
    volumeUsd: BigInt(Number(dailyVolumeInfo.volumeUsd) + Number(volume)),
  };

  totalVolumeInfo = {
    ...totalVolumeInfo,
    volumeUsd: BigInt(Number(totalVolumeInfo.volumeUsd) + Number(volume)),
  };

  if (type == "swap") {
    hourlyVolumeInfo = {
      ...hourlyVolumeInfo,
      swapVolumeUsd: BigInt(
        Number(hourlyVolumeInfo.swapVolumeUsd) + Number(volume)
      ),
    };

    dailyVolumeInfo = {
      ...dailyVolumeInfo,
      swapVolumeUsd: BigInt(
        Number(dailyVolumeInfo.swapVolumeUsd) + Number(volume)
      ),
    };

    totalVolumeInfo = {
      ...totalVolumeInfo,
      swapVolumeUsd: BigInt(
        Number(totalVolumeInfo.swapVolumeUsd) + Number(volume)
      ),
    };
  }

  if (type == "deposit") {
    hourlyVolumeInfo = {
      ...hourlyVolumeInfo,
      depositVolumeUsd: BigInt(
        Number(hourlyVolumeInfo.depositVolumeUsd) + Number(volume)
      ),
    };

    dailyVolumeInfo = {
      ...dailyVolumeInfo,
      depositVolumeUsd: BigInt(
        Number(dailyVolumeInfo.depositVolumeUsd) + Number(volume)
      ),
    };

    totalVolumeInfo = {
      ...totalVolumeInfo,
      depositVolumeUsd: BigInt(
        Number(totalVolumeInfo.depositVolumeUsd) + Number(volume)
      ),
    };
  }

  if (type == "withdrawal") {
    hourlyVolumeInfo = {
      ...hourlyVolumeInfo,
      withdrawalVolumeUsd: BigInt(
        Number(hourlyVolumeInfo.withdrawalVolumeUsd) + Number(volume)
      ),
    };

    dailyVolumeInfo = {
      ...dailyVolumeInfo,
      withdrawalVolumeUsd: BigInt(
        Number(dailyVolumeInfo.withdrawalVolumeUsd) + Number(volume)
      ),
    };

    totalVolumeInfo = {
      ...totalVolumeInfo,
      withdrawalVolumeUsd: BigInt(
        Number(totalVolumeInfo.withdrawalVolumeUsd) + Number(volume)
      ),
    };
  }

  if (type == "margin") {
    hourlyVolumeInfo = {
      ...hourlyVolumeInfo,
      marginVolumeUsd: BigInt(
        Number(hourlyVolumeInfo.marginVolumeUsd) + Number(volume)
      ),
    };

    dailyVolumeInfo = {
      ...dailyVolumeInfo,
      marginVolumeUsd: BigInt(
        Number(dailyVolumeInfo.marginVolumeUsd) + Number(volume)
      ),
    };

    totalVolumeInfo = {
      ...totalVolumeInfo,
      marginVolumeUsd: BigInt(
        Number(totalVolumeInfo.marginVolumeUsd) + Number(volume)
      ),
    };
  }
}

async function getOrCreateVolumeInfo(
  timestamp: number,
  period: string,
  context: any
): Promise<VolumeInfo> {
  let timestampGroup = timestampToPeriodStart(timestamp, period);
  let volumeId = period;
  if (period != "total") {
    volumeId = volumeId + ":" + timestampGroup.toString();
  }
  let volumeInfo: VolumeInfo | undefined = await context.VolumeInfo.get(
    volumeId
  );
  if (volumeInfo == undefined) {
    volumeInfo = {
      id: volumeId,
      period: period,
      volumeUsd: ZERO,
      swapVolumeUsd: ZERO,
      marginVolumeUsd: ZERO,
      depositVolumeUsd: ZERO,
      withdrawalVolumeUsd: ZERO,
      timestamp: timestampGroup,
    };
  }

  return volumeInfo as VolumeInfo;
}

function getVolumeInfoId(tokenA: string, tokenB: string): string {
  return tokenA + ":" + tokenB;
}
