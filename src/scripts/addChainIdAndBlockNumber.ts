import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

class DatabaseUpdater {
  private static DB_FOLDER_PATH = path.join(__dirname, "..", "..", "cache");

  constructor() {}

  public async updateDatabases() {
    // Get all the database paths
    const chains = ["42161", "43114"];
    const subfolders = ["pool_value_cache", "market_tokens_supply_cache"];

    for (const chain of chains) {
      for (const subfolder of subfolders) {
        const dbPath = path.join(
          DatabaseUpdater.DB_FOLDER_PATH,
          chain,
          subfolder,
          "cache.db"
        );
        if (fs.existsSync(dbPath)) {
          console.log(`Updating database at: ${dbPath}`);
          await this.updateDatabase(dbPath, chain, subfolder);
        } else {
          console.error(`Database not found at: ${dbPath}`);
        }
      }
    }
  }

  private updateDatabase(dbPath: string, chain: string, subfolder: string) {
    return new Promise<void>((resolve, reject) => {
      const db = new sqlite3.Database(dbPath);

      // Add chainId and blockNumber columns if they don't exist for the specific table
      db.run(`ALTER TABLE ${subfolder} ADD COLUMN chainId INTEGER`, (err) => {
        if (err && !err.message.includes("duplicate column")) {
          return reject(err);
        }

        db.run(
          `ALTER TABLE ${subfolder} ADD COLUMN blockNumber INTEGER`,
          async (err) => {
            if (err && !err.message.includes("duplicate column")) {
              return reject(err);
            }

            // Now update all rows to populate chainId and blockNumber
            await this.updateRows(db, chain, subfolder);
            db.close();
            resolve();
          }
        );
      });
    });
  }

  private updateRows(db: sqlite3.Database, chain: string, subfolder: string) {
    return new Promise<void>((resolve, reject) => {
      const chainId = chain === "43114" ? 43114 : 42161;

      db.all(`SELECT id FROM ${subfolder}`, [], (err, rows) => {
        if (err) {
          return reject(err);
        }

        const updates = rows.map((row: any) => {
          const [marketAddress, blockNumberStr] = row.id.split(":");
          const blockNumber = parseInt(blockNumberStr, 10);

          return new Promise<void>((resolve, reject) => {
            db.run(
              `UPDATE ${subfolder} SET blockNumber = ?, chainId = ? WHERE id = ?`,
              [blockNumber, chainId, row.id],
              (err) => {
                if (err) {
                  return reject(err);
                }
                resolve();
              }
            );
          });
        });

        Promise.all(updates)
          .then(() => resolve())
          .catch(reject);
      });
    });
  }
}

// Example Usage
const updater = new DatabaseUpdater();
updater.updateDatabases().catch((err) => {
  console.error("Error updating databases:", err);
});
