import { User, UserStat } from "generated/src/Types.gen";
import { timestampToPeriodStart } from "../utils/time";

export async function getOrCreateUserStat(
  timestamp: number,
  period: string,
  context: any
): Promise<UserStat> {
  let timestampGroup = timestampToPeriodStart(timestamp, period);
  let userId = period == "total" ? "total" : timestampGroup.toString();
  let user: UserStat | undefined = await context.UserStat.get(userId);
  if (user == undefined) {
    let newUserStatEntity: UserStat = {
      id: userId,
      period: period,
      totalPositionCount: 0,
      totalSwapCount: 0,
      totalDepositCount: 0,
      totalWithdrawalCount: 0,
      uniqueUsers: 0,
      timestamp: timestampGroup,
    };

    return newUserStatEntity;
  }

  return user;
}

export async function saveUserStat(
  type: string,
  account: string,
  timestamp: number,
  context: any
): Promise<void> {
  let totalUserStats = await getOrCreateUserStat(timestamp, "total", context);
  let dailyUserStats = await getOrCreateUserStat(timestamp, "1d", context);

  let userData: User | undefined = await context.User.get(account);

  if (userData == undefined) {
    let newUserDataEntity: User = {
      id: account,
      totalSwapCount: 0,
      totalPositionCount: 0,
      totalDepositCount: 0,
      totalWithdrawalCount: 0,
      account: account,
    };

    userData = newUserDataEntity;

    if (account) {
      totalUserStats = {
        ...totalUserStats,
        uniqueUsers: totalUserStats.uniqueUsers + 1,
      };

      dailyUserStats = {
        ...dailyUserStats,
        uniqueUsers: dailyUserStats.uniqueUsers + 1,
      };
    }
  }

  if (type == "swap") {
    totalUserStats = {
      ...totalUserStats,
      totalSwapCount: totalUserStats.totalSwapCount + 1,
    };

    dailyUserStats = {
      ...dailyUserStats,
      totalSwapCount: dailyUserStats.totalSwapCount + 1,
    };

    userData = {
      ...userData,
      totalSwapCount: userData.totalSwapCount + 1,
    };
  }

  if (type == "margin") {
    totalUserStats = {
      ...totalUserStats,
      totalPositionCount: totalUserStats.totalPositionCount + 1,
    };

    dailyUserStats = {
      ...dailyUserStats,
      totalPositionCount: dailyUserStats.totalPositionCount + 1,
    };

    userData = {
      ...userData,
      totalPositionCount: userData.totalPositionCount + 1,
    };
  }

  if (type == "deposit") {
    totalUserStats = {
      ...totalUserStats,
      totalDepositCount: totalUserStats.totalDepositCount + 1,
    };

    dailyUserStats = {
      ...dailyUserStats,
      totalDepositCount: dailyUserStats.totalDepositCount + 1,
    };

    userData = {
      ...userData,
      totalDepositCount: userData.totalDepositCount + 1,
    };
  }

  if (type == "withdrawal") {
    totalUserStats = {
      ...totalUserStats,
      totalWithdrawalCount: totalUserStats.totalWithdrawalCount + 1,
    };

    dailyUserStats = {
      ...dailyUserStats,
      totalWithdrawalCount: dailyUserStats.totalWithdrawalCount + 1,
    };

    userData = {
      ...userData,
      totalWithdrawalCount: userData.totalWithdrawalCount + 1,
    };
  }

  context.UserStat.set(totalUserStats);
  context.UserStat.set(dailyUserStats);
  context.UserStat.set(userData);
}
