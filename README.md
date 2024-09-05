# GMX v2 subgraph using Envio

This Envio indexer indexes the GMX v2 smart contracts by cloning the current behaviour of GMX subgraphs.

## Caching

For persistent caching sqlite3 is used which stores the cache at `cache/cache.db`. If the cache folder doesn't exist, create it in the root directory.