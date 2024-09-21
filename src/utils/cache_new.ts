import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

const MAX_DB_SIZE = 90 * 1024 * 1024; // 90 MB in bytes

class CacheBase {
  public readonly key: string;
  public db: sqlite3.Database;
  public dbFilePath: string;
  public startBlock: number;
  public endBlock: number | null;

  public constructor(
    key: string,
    dbFilePath: string,
    startBlock: number,
    endBlock: number | null
  ) {
    this.key = key;
    this.dbFilePath = dbFilePath;
    this.startBlock = startBlock;
    this.endBlock = endBlock;
    this.db = new sqlite3.Database(dbFilePath);
  }

  // Ensure folder structure and create DB file
  public static async init(key: string, chainId: number, blockNumber: number) {
    const { dbFilePath, startBlock, endBlock } = await this.getDbFilePath(
      key,
      chainId,
      blockNumber
    );
    const cache = new CacheBase(key, dbFilePath, startBlock, endBlock);
    await cache.createTableIfNotExists();
    return cache;
  }

  // Partition logic based on block number or chainId
  public static async getDbFilePath(
    key: string,
    chainId: number,
    blockNumber: number
  ): Promise<{
    dbFilePath: string;
    startBlock: number;
    endBlock: number | null;
  }> {
    const folderPath = path.join(
      __dirname,
      "..",
      "..",
      "cache",
      `${chainId}`,
      `${key}`
    );

    // Ensure the folder exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Get all existing .db files in the folder
    const dbFiles = fs
      .readdirSync(folderPath)
      .filter((file) => file.endsWith(".db"));

    let dbFile = "";
    let startBlock = blockNumber;
    let endBlock: number | null = null;

    // Iterate over the DB files and find the one that contains the blockNumber
    for (const file of dbFiles) {
      const filePath = path.join(folderPath, file);
      const [fileStartBlock, fileEndBlock] = this.extractBlockRange(file);

      if (
        blockNumber >= fileStartBlock &&
        blockNumber <= (fileEndBlock ?? Infinity)
      ) {
        dbFile = filePath;
        startBlock = fileStartBlock;
        endBlock = fileEndBlock;
        break;
      }

      // Check if the DB file is full and create a new one if necessary
      const stats = fs.statSync(filePath);
      if (stats.size >= MAX_DB_SIZE) {
        const currentFileName = path.basename(filePath, ".db");
        const newFileName = `${currentFileName}_${blockNumber}.db`;
        fs.renameSync(filePath, path.join(folderPath, newFileName));
        continue;
      } else {
        dbFile = filePath;
        startBlock = fileStartBlock;
        endBlock = fileEndBlock;
        break;
      }
    }

    // If no suitable file is found, create a new DB file starting from the current blockNumber
    if (!dbFile) {
      dbFile = `${folderPath}/cache_${dbFiles.length + 1}_${blockNumber}.db`;
      startBlock = blockNumber;
    }

    return { dbFilePath: dbFile, startBlock, endBlock };
  }

  // Extract the block range from the file name (assuming format: cache_{index}_{startBlock}_{endBlock}.db)
  private static extractBlockRange(fileName: string): [number, number | null] {
    const parts = fileName.split("_");
    const startBlock = parseInt(parts[2]);
    const endBlock = parts[3] ? parseInt(parts[3].replace(".db", "")) : null;
    return [startBlock, endBlock];
  }

  public async createTableIfNotExists() {
    const query = `
        CREATE TABLE IF NOT EXISTS ${this.key} (
          id TEXT PRIMARY KEY,
          value TEXT,
          chainId INTEGER,
          blockNumber INTEGER
        )`;
    await new Promise<void>((resolve, reject) => {
      this.db.run(query, (err) => {
        if (err) {
          console.error("Error creating table:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public read(id: string, blockNumber: number): Promise<string | null> {
    const query = `SELECT value FROM ${this.key} WHERE id = ? AND blockNumber <= ? ORDER BY blockNumber DESC LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.db.get(query, [id, blockNumber], (err, row: any) => {
        if (err) {
          console.error("Error executing read query:", err);
          reject(err);
        } else {
          resolve(row ? row.value : null);
        }
      });
    });
  }

  public add(id: string, value: string, chainId: number, blockNumber: number) {
    const query = `INSERT INTO ${this.key} (id, value, chainId, blockNumber) VALUES (?, ?, ?, ?)`;
    return new Promise<void>((resolve, reject) => {
      this.db.run(query, [id, value, chainId, blockNumber], (err) => {
        if (err) {
          console.error("Error executing add query:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

export class PoolValueCache extends CacheBase {
  static async initialize(chainId: number, blockNumber: number) {
    return CacheBase.init("pool_value_cache", chainId, blockNumber);
  }
}

export class MarketTokensSupplyCache extends CacheBase {
  static async initialize(chainId: number, blockNumber: number) {
    return CacheBase.init("market_tokens_supply_cache", chainId, blockNumber);
  }
}
