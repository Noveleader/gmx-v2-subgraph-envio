import sqlite3 from "sqlite3";

const db = new sqlite3.Database("cache/cache.db");

class CacheBase {
  public readonly key: string;

  public constructor(key: string) {
    this.key = key;
  }

  public async createTableIfNotExists() {
    const query = `
        CREATE TABLE IF NOT EXISTS ${this.key} (
          id TEXT PRIMARY KEY,
          value TEXT
        )`;
    await new Promise<void>((resolve, reject) => {
      db.run(query, (err) => {
        if (err) {
          console.error("Error creating table:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public read(id: string): Promise<string | null> {
    const query = `SELECT value FROM ${this.key} WHERE id = ?`;
    return new Promise((resolve, reject) => {
      db.get(query, [id], (err, row: any) => {
        if (err) {
          console.error("Error executing read query:", err);
          reject(err);
        } else {
          resolve(row ? row.value : null);
        }
      });
    });
  }

  public add(id: string, value: string) {
    const query = `INSERT INTO ${this.key} (id, value) VALUES (?, ?)`;
    return new Promise<void>((resolve, reject) => {
      db.run(query, [id, value], (err) => {
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
  static async init() {
    const cache = new PoolValueCache("pool_value_cache");
    await cache.createTableIfNotExists();
    return cache;
  }
}

export class MarketTokensSupplyCache extends CacheBase {
  static async init() {
    const cache = new MarketTokensSupplyCache("market_tokens_supply_cache");
    await cache.createTableIfNotExists();
    return cache;
  }
}
