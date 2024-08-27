function createMarketConfig(
  marketToken: string,
  indexToken: string,
  longToken: string,
  shortToken: string
): MarketConfig {
  return new MarketConfig(marketToken, indexToken, longToken, shortToken);
}

export class MarketConfig {
  constructor(
    public marketToken: string,
    public indexToken: string,
    public longToken: string,
    public shortToken: string
  ) {}
}

export let marketConfigs = new Map<string, MarketConfig>();

marketConfigs.set(
  "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
  createMarketConfig(
    "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  )
);

marketConfigs.set(
  "0x913C1F46b48b3eD35E7dc3Cf754d4ae8499F31CF",
  createMarketConfig(
    "0x913C1F46b48b3eD35E7dc3Cf754d4ae8499F31CF",
    "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"
  )
);

marketConfigs.set(
  "0x47c031236e19d024b42f8AE6780E44A573170703",
  createMarketConfig(
    "0x47c031236e19d024b42f8AE6780E44A573170703",
    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  )
);

marketConfigs.set(
  "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407",
  createMarketConfig(
    "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407",
    "0x912CE59144191C1204E64559FE8253a0e49E6548",
    "0x912CE59144191C1204E64559FE8253a0e49E6548",
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  )
);

marketConfigs.set(
  "0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4",
  createMarketConfig(
    "0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4",
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  )
);

marketConfigs.set(
  "0xB686BcB112660343E6d15BDb65297e110C8311c4",
  createMarketConfig(
    "0xB686BcB112660343E6d15BDb65297e110C8311c4",
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  )
);

marketConfigs.set(
  "0x7f1fa204bb700853D36994DA19F830b6Ad18455C",
  createMarketConfig(
    "0x7f1fa204bb700853D36994DA19F830b6Ad18455C",
    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  )
);

marketConfigs.set(
  "0xc7Abb2C5f3BF3CEB389dF0Eecd6120D451170B50",
  createMarketConfig(
    "0xc7Abb2C5f3BF3CEB389dF0Eecd6120D451170B50",
    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  )
);

marketConfigs.set(
  "0x1012daa9ee5c90136fd3e105b63094aa81a0a64c",
  createMarketConfig(
    "0x1012daa9ee5c90136fd3e105b63094aa81a0a64c",
    "0x13c52ccb49fe3228356d0c355641961646a0d9b2",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5"
  )
);

marketConfigs.set(
  "0x1529876a9348d61c6c4a3eee1fe6cbf1117ca315",
  createMarketConfig(
    "0x1529876a9348d61c6c4a3eee1fe6cbf1117ca315",
    "0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3",
    "0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3",
    "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5"
  )
);

marketConfigs.set(
  "0x1cd5fb2bc5e3071ba5bae1d2952ec0d362d81cb7",
  createMarketConfig(
    "0x1cd5fb2bc5e3071ba5bae1d2952ec0d362d81cb7",
    "0x0000000000000000000000000000000000000000",
    "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5",
    "0xbfcbcdcbcc1b765843dce4df044b92fe68182a62"
  )
);

marketConfigs.set(
  "0x22b9076bbcd93e491999aa748fdd6623fa019532",
  createMarketConfig(
    "0x22b9076bbcd93e491999aa748fdd6623fa019532",
    "0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3",
    "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5",
    "0x7b7c6c49fa99b37270077fbfa398748c27046984"
  )
);
marketConfigs.set(
  "0x339ef6aacf8f4b2ad15bdcecbeed1842ec4dbcbf",
  createMarketConfig(
    "0x339ef6aacf8f4b2ad15bdcecbeed1842ec4dbcbf",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5"
  )
);

marketConfigs.set(
  "0x4370ad7cb842df8ba2b27d07763908561ba61771",
  createMarketConfig(
    "0x4370ad7cb842df8ba2b27d07763908561ba61771",
    "0x5f8a8f06da2848f846a2b5e3e42a4a2eec5f337b",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x7b7c6c49fa99b37270077fbfa398748c27046984"
  )
);

marketConfigs.set(
  "0x68ddc36f80199411ba54df30c982255d51a9d358",
  createMarketConfig(
    "0x68ddc36f80199411ba54df30c982255d51a9d358",
    "0xa076e6db62f61bd1a4fc283f84739d2b0c80e2a3",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x7b7c6c49fa99b37270077fbfa398748c27046984"
  )
);

marketConfigs.set(
  "0x72349b00768601d9598084220224948ce5b6ebdd",
  createMarketConfig(
    "0x72349b00768601d9598084220224948ce5b6ebdd",
    "0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3",
    "0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3",
    "0x7b7c6c49fa99b37270077fbfa398748c27046984"
  )
);

marketConfigs.set(
  "0x72b11c5589b41aea9cdcd814bfb19b557aae2844",
  createMarketConfig(
    "0x72b11c5589b41aea9cdcd814bfb19b557aae2844",
    "0x6debb9cc48819941f797a2f0c63f9168c19fd057",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5"
  )
);

marketConfigs.set(
  "0x76451d352e6d0032694f4db89a6520ab1aa702e2",
  createMarketConfig(
    "0x76451d352e6d0032694f4db89a6520ab1aa702e2",
    "0x7a9ba06548d0499f6debf97809cc351c1e85795d",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x7b7c6c49fa99b37270077fbfa398748c27046984"
  )
);

marketConfigs.set(
  "0xb883cabec015c36104ab8779e7f3ca96f6073294",
  createMarketConfig(
    "0xb883cabec015c36104ab8779e7f3ca96f6073294",
    "0xe39ab88f8a4777030a534146a9ca3b52bd5d43a3",
    "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5",
    "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5"
  )
);

marketConfigs.set(
  "0xbdf740564ba0caa5d74c30c530d63f9f3dfdcc86",
  createMarketConfig(
    "0xbdf740564ba0caa5d74c30c530d63f9f3dfdcc86",
    "0x9a98a11279faeb0ff695dfec3c4b8a29138d0a2f",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5"
  )
);

marketConfigs.set(
  "0xbdf85aaf3c63cce42ee2f18d75f9fd8aca4d5923",
  createMarketConfig(
    "0xbdf85aaf3c63cce42ee2f18d75f9fd8aca4d5923",
    "0x55602a94239a7926d92da5c53fb96e80372382aa",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x7b7c6c49fa99b37270077fbfa398748c27046984"
  )
);

marketConfigs.set(
  "0xd886e20f64093ab6e24795952aebc60d012abc9a",
  createMarketConfig(
    "0xd886e20f64093ab6e24795952aebc60d012abc9a",
    "0x7361d58cbc6495b6419397dfd5ebe2e2017f23e9",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5"
  )
);

marketConfigs.set(
  "0xda83ad3090a4d0861c5bea3f56c082e57bc47c14",
  createMarketConfig(
    "0xda83ad3090a4d0861c5bea3f56c082e57bc47c14",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5",
    "0xbfcbcdcbcc1b765843dce4df044b92fe68182a62"
  )
);

marketConfigs.set(
  "0xdb6b41bf877a7ca9988efc451922c687ba1a5e2d",
  createMarketConfig(
    "0xdb6b41bf877a7ca9988efc451922c687ba1a5e2d",
    "0xd98d28787f5598749331052f952196428f61e3ad",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x04fc936a15352a1b15b3b9c56ea002051e3db3e5"
  )
);

marketConfigs.set(
  "0xe501731e05b3af8fe09587057b4884d4b66d2cea",
  createMarketConfig(
    "0xe501731e05b3af8fe09587057b4884d4b66d2cea",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x7b7c6c49fa99b37270077fbfa398748c27046984"
  )
);

marketConfigs.set(
  "0xfb5e4faa671cd65e97d23cdaa70d67bca7e11845",
  createMarketConfig(
    "0xfb5e4faa671cd65e97d23cdaa70d67bca7e11845",
    "0x3e2fa75b78edf836299127fbaa776304b4712972",
    "0xccf73f4dcbbb573296bfa656b754fe94bb957d62",
    "0x7b7c6c49fa99b37270077fbfa398748c27046984"
  )
);
