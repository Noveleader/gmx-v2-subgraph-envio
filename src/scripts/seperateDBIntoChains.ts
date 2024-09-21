import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

class DatabaseSplitter {
  private db: sqlite3.Database;
  private static DB_FOLDER_PATH = path.join(__dirname, "cache");

  constructor(private dbFilePath: string) {
    this.db = new sqlite3.Database(dbFilePath);
  }

  public async splitDatabase() {
    // Ensure the required folders exist
    this.ensureFolderStructure();

    // Read all data from the original database
    const data = await this.readDataFromDB();

    // Process and separate data
    await this.processData(data);

    console.log("Database split successfully!");
  }

  private ensureFolderStructure() {
    const chains = ["42161", "43114"];
    const subfolders = ["pool_value_cache", "market_tokens_supply_cache"];

    chains.forEach((chain) => {
      const chainFolder = path.join(DatabaseSplitter.DB_FOLDER_PATH, chain);
      if (!fs.existsSync(chainFolder)) {
        fs.mkdirSync(chainFolder, { recursive: true });
      }

      // Create subfolders for each chain
      subfolders.forEach((subfolder) => {
        const subfolderPath = path.join(chainFolder, subfolder);
        if (!fs.existsSync(subfolderPath)) {
          fs.mkdirSync(subfolderPath, { recursive: true });
        }
      });
    });
  }

  private readDataFromDB(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT id, value FROM pool_value_cache UNION ALL SELECT id, value FROM market_tokens_supply_cache`,
        [],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  private processData(rows: any[]) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        for (const row of rows) {
          const { id, value } = row;
          const [marketAddress, blockNumberStr] = id.split(":");
          const blockNumber = parseInt(blockNumberStr, 10);

          // Determine which chain the data belongs to
          const chain = blockNumber < 100_000_000 ? "43114" : "42161";

          // Determine which subfolder to store the data in
          const subfolder = id.includes("poolValue")
            ? "pool_value_cache"
            : "market_tokens_supply_cache";

          // Insert the data into the appropriate chain and subfolder database
          await this.insertDataIntoNewDB(chain, subfolder, id, value);
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  private insertDataIntoNewDB(
    chain: string,
    subfolder: string,
    id: string,
    value: string
  ) {
    return new Promise<void>((resolve, reject) => {
      const newDBPath = path.join(
        DatabaseSplitter.DB_FOLDER_PATH,
        chain,
        subfolder,
        "cache.db"
      );
      const newDB = new sqlite3.Database(newDBPath);

      // Create table if it doesn't exist
      newDB.run(
        `CREATE TABLE IF NOT EXISTS ${subfolder} (
          id TEXT PRIMARY KEY,
          value TEXT
        )`,
        (err) => {
          if (err) {
            return reject(err);
          }

          // Insert data into the new DB
          newDB.run(
            `INSERT INTO ${subfolder} (id, value) VALUES (?, ?)`,
            [id, value],
            (err) => {
              if (err) {
                console.error(
                  `Error inserting data into ${chain}/${subfolder}:`,
                  err
                );
                return reject(err);
              }
              newDB.close(); // Close the new DB connection after insert
              resolve();
            }
          );
        }
      );
    });
  }
}

// Example Usage
const splitter = new DatabaseSplitter("cache/cache.db");
splitter.splitDatabase().catch((err) => {
  console.error("Error splitting database:", err);
});
