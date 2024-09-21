import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";

// Set up the directories
const cacheRoot = path.join(__dirname, "..", "..", "cache");
const chainIds = ["42161", "43114"]; // Your chain folders

const renameDbFiles = async () => {
  for (const chainId of chainIds) {
    const chainFolderPath = path.join(cacheRoot, chainId);
    const subFolders = ["market_tokens_supply_cache", "pool_value_cache"];

    for (const subFolder of subFolders) {
      const folderPath = path.join(chainFolderPath, subFolder);
      const dbFiles = fs
        .readdirSync(folderPath)
        .filter((file) => file.endsWith(".db"));

      // Iterate over each db file
      for (let index = 0; index < dbFiles.length; index++) {
        const dbFilePath = path.join(folderPath, dbFiles[index]);
        const startBlock = await getStartBlock(dbFilePath, subFolder); // Pass the table name
        const newFileName = `cache_${index + 1}_${startBlock}.db`;
        const newFilePath = path.join(folderPath, newFileName);

        // Rename the file
        fs.renameSync(dbFilePath, newFilePath);
        console.log(`Renamed ${dbFilePath} to ${newFileName}`);
      }
    }
  }
};

// Function to retrieve the startBlock from the database
const getStartBlock = (
  dbFilePath: string,
  tableName: string
): Promise<number> => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbFilePath);
    const query = `SELECT MIN(blockNumber) as startBlock FROM ${tableName} LIMIT 1`; // Dynamically use the table name

    db.get(query, (err, row: { startBlock: number }) => {
      // Explicitly type the row result
      if (err) {
        console.error(`Error fetching start block from ${dbFilePath}:`, err);
        reject(err);
      } else {
        resolve(row?.startBlock || 0); // Safely resolve startBlock, fallback to 0 if undefined
      }
      db.close();
    });
  });
};

// Start the renaming process
renameDbFiles()
  .then(() => {
    console.log("Renaming process completed.");
  })
  .catch((err) => {
    console.error("Error during renaming process:", err);
  });
