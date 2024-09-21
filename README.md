# GMX V2 Indexer

The [Envio](https://envio.dev/) multi-chain indexer is designed to index GMX V2 smart contracts, replicating the functionality of the [GMX synthetics subgraphs](https://github.com/gmx-io/gmx-subgraph/tree/master/synthetics-stats).

Developed by [Noveleader](https://x.com/0xnoveleader). You can give me a follow :)

Following are the supported chains by the indexer, the indexer is scalable in nature and can expand to multiple chains as GMX scale itself:

- Arbitrum One (chainId: 42161)
- Avalanche (chainId: 43114)

## Run Locally

1. Clone the repository: `git clone https://github.com/Noveleader/gmx-v2-subgraph-envio.git`
2. Go into specific directory: `cd gmx-v2-subgraph-envio`
3. Install dependencies: `pnpm i`
4. Run codegen to generate the required files: `pnpm run codegen`
5. Run the indexer: `pnpm dev`

Now the indexing will start and it will also utilize the `cache` built already which stores GMX pool value and market tokens supply. Since this data comes from making RPC requests, caching acts like a persistent storage for older block states.

In order to view the data and make queries, visit `http://localhost:8080`. The local password is `testing`.

## Querying the data

This section outlines the various queries that can be made regarding the following entities:

- [Order](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L36): Queries the essential details of an `order` in GMX contracts.
- [Position Increase](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L76): Represents a type of order, represents opening a `position` in the GMX market.
- [Position Decrease](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L108): resents a type of order, represents closing a `position` in the GMX market.
- [Position FeesInfo](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L139): Stores all information related to fees collected from `positions` and `rebates` given to traders.
- [Claimable Collateral](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L167): Refers to the `collateral` that an account can still claim.
- [Swap Info](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L192): Represents a type of `order` made for token swaps in a specific market.
- [Swap Fees Info](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L211): Queries information related to fees for swaps within a market.
- [Trade Action](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L263): Queries and stores data related to any `trade action` performed on the exchange.
- [Token Price](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L309): Stores the price of `tokens`.
- [User](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L446): Stores global details related to a user's swaps, positions, deposits, and withdrawals.

In every entity, we also store `chain ID` in order to filter data based on multiple chains. 

### Order

Order is a generic entity and includes all types of order including position and swap related requests.

The following query gets the order data for arbitrum one having chain ID `42161`:

```bash
query GetOrderArbitrumOne {
  Order(limit: 10, where: {chainId: {_eq: 42161}}) {
    acceptablePrice
    account
    frozenReason
    frozenReasonBytes
    initialCollateralDeltaAmount
    initialCollateralTokenAddress
    isLong
    marketAddress
    minOutputAmount
    orderType
    receiver
    sizeDeltaUsd
    swapPath
    triggerPrice
  }
}
```

Find all the other fields related to the Order Entity [here](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L36)

### Position Increase

This entity stores any data relating to opening a position, position increase simply means a position is iniitiated and it stores all the details regarding the same. It is also a type of `Order`.

The following query gets the `Position Increase` data for chain Avalanche having chain ID `43114`:

```bash
query GetPositionIncreaseAvalanche {
  PositionIncrease(limit: 10, where: {chainId: {_eq: 43114}}) {
    account
    basePnlUsd
    borrowingFactor
    collateralAmount
    executionPrice
    isLong
    sizeDeltaUsd
    sizeInUsd
  }
}
```

Find all the other fields related to `Position Increase` Entity [here](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L76)

### Position Decrease

This entity stores any data relating to closing a position, position decrease simply means a position is closed and it stores all the details regarding the same. It is also a type of `Order`.

The following query gets the `Position Decrease` data for chain Avalanche having chain ID `43114`:

```bash
query GetPositionDecreaseAvalanche {
  PositionDecrease(limit: 10, where: {chainId: {_eq: 43114}}) {
    account
    borrowingFactor
    collateralAmount
    isLong
    marketAddress
    sizeInUsd
    sizeDeltaUsd
    priceImpactAmount
    priceImpactUsd
    shortTokenFundingAmountPerSize
  }
}
```
Find all the other fields related to `Position Decrease` Entity [here](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L108)

### Position Fees Info

This entity helps in querying position `fees` and `rebates` related info.

The following query get the `Position Fees Info` data for Arbitrum chain having chain ID `42161`:

```bash
query GetPositionFeesInfoArbitrumOne {
  PositionFeesInfo(limit: 10, where: {chainId: {_eq: 42161}}) {
    collateralTokenAddress
    collateralTokenPriceMax
    collateralTokenPriceMin
    marketAddress
    positionFeeAmount
    totalRebateAmount
    traderDiscountAmount
    fundingFeeAmount
    feeUsdForPool
    trader
  }
}
```
Find all the other fields related to `Positon Fees Info` [here](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L139)

### Claimable Collateral

This entity helps in querying all the collateral left to claim and maintain a boolean called `claimed` to monitor if the collateral is claimed or not. 

The following query get the `Claimable Collateral` data for Arbitrum Chain having chain ID `42161`:

```bash
query GetClaimableCollateralArbitrumOne {
  ClaimableCollateral(limit: 10, where: {chainId: {_eq: 42161}}) {
    claimed
    factor
    factorByTime
    marketAddress
    tokenAddress
    value
  }
}
```
Find all the other fields related to `Claimable Collateral` [here](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L167)


### Swap Info

This entity helps in querying any swap related info. It stores `orderKey`, `market` the trade is made in, etc.

The following query get the `Swap Info` data for Avalanche chain having chain ID `43114`:

```bash
query GetSwapInfoAvalanche {
  SwapInfo(limit: 10, where: {chainId: {_eq: 43114}}) {
    amountIn
    amountOut
    marketAddress
    priceImpactUsd
    receiver
    tokenInAddress
    tokenInPrice
    tokenOutAddress
    tokenOutPrice
  }
}
```
Find all the other fields related to `Swap Info` [here](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L192)

### Swap Fees Info

This entity stores info related to swap fees. 

The following query get the `Swap Fees Info` data for Avalanche chain having chain ID `43114`:

```bash
query GetSwapFeesInfoAvalanche {
  SwapFeesInfo(limit: 10, where: {chainId: {_eq: 43114}}) {
    feeUsdForPool
    swapFeeType
    tokenAddress
    tokenPrice
    feeReceiverAmount
  }
}
```
Find all the other fields related to `Swap Fees Info` [here](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L211)

### Trade Action

This entity stores all the data related to any trade executed through the contracts including `positions` and `swaps`. 

The following query get the `Trade Action` data for Arbitrum chain having the chain ID `42161`:

```bash
query GetTradeActionArbitrumOne {
  TradeAction(limit: 10, where: {chainId: {_eq: 42161}}) {
    account
    executionPrice
    isLong
    marketAddress
    orderType
    sizeDeltaUsd
  }
}
```
Find all the other fields related to `Trade Action` [here](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L263)

### Token Price

This entity stores the token price which is listed on the exchange.

The following query get the `Tokens` price data for Arbitrum chain having the chain ID `42161`:

```bash
query GetTokenPriceArbitrumOne {
  TokenPrice(limit: 10, where: {chainId: {_eq: 42161}}) {
    id
    maxPrice
    minPrice
  }
}
```
Find all the other fields related to `Token Price` [here](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L309)

### User

This entity stores the user data including their `swap`, `position`, `deposit`, and `withdrawal` stats.

The following query get the `User` data for Arbitrum chaing having the chain ID `42161`:

```bash
query GetUserDataArbitrumOne{
  User(limit: 10, where: {chainId: {_eq: 42161}}) {
    account
    totalDepositCount
    totalPositionCount
    totalSwapCount
    totalWithdrawalCount
  }
}
```
Find all the other fields related to `User` [here](https://github.com/Noveleader/gmx-v2-subgraph-envio/blob/b4bd7fcd95b2dffad434a18e3492424e7b377612/schema.graphql#L446)

## License

This project is licensed under the MIT License.