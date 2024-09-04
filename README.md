# GMX v2 subgraph using Envio

This Envio indexer indexes the GMX v2 smart contracts by cloning the current behaviour of GMX subgraphs.

## Caching

For this section, make sure you have already installed postgres locally.

Caching is used for storing the pool value and market tokens supply of a market at a particular block.

The above mapping returns a BigInt value stored against that key.

There are two major tables which are `pool_value_cache` and `market_token_supply_cache`.

Enter the postgres CLI:

```bash
# Enter the postgres CLI as user postgres
sudo -i -u postgres

psql
```

Create the database and two tables:

```bash
# Create DB for pool value caching
CREATE DATABASE on_chain_data_cache;

# Connect to the pool value DB
\c on_chain_data_cache

# Create the table pool_value_cache in the DB
CREATE TABLE pool_value_cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

# Create the table market_token_supply_cache in the DB
CREATE TABLE market_token_supply_cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

```
