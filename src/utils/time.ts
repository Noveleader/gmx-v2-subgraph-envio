export function timestampToPeriodStart(timestamp: number, period: string) {
  let seconds = periodToSeconds(period);

  if (period == "1w") {
    timestamp += 86400;
  }

  let start = (timestamp / seconds) * seconds;

  if (period == "1w") {
    start -= 86400;
  }

  return start;
}

export function periodToSeconds(period: string): number {
  let seconds: number = 0;

  if (period == "5m") {
    seconds = 5 * 60;
  } else if (period == "15m") {
    seconds = 15 * 60;
  } else if (period == "1h") {
    seconds = 60 * 60;
  } else if (period == "4h") {
    seconds = 4 * 60 * 60;
  } else if (period == "1d") {
    seconds = 24 * 60 * 60;
  } else if (period == "1w") {
    seconds = 7 * 24 * 60 * 60;
  } else if (period == "total") {
    seconds = 1;
  }

  return seconds;
}
