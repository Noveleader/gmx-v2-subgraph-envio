import sqlite3 from "sqlite3";

const tableName = "pool_value_cache"; // Replace with your table name
const chainId = 43114;

const countRows = (chainId: number): Promise<number> => {
  const db = new sqlite3.Database(`cache/${chainId}/${tableName}/cache.db`);

  return new Promise((resolve, reject) => {
    const query = `SELECT COUNT(*) as count FROM ${tableName}`;
    db.get(query, (err: any, row: any) => {
      if (err) {
        console.error("Error executing count query:", err);
        reject(err);
      } else {
        resolve(row.count);
      }
    });
  });
};

(async () => {
  try {
    const rowCount = await countRows(chainId);
    console.log(
      `Number of rows in ${tableName} for chain ID ${chainId}: ${rowCount}`
    );
  } catch (error) {
    console.error("Error counting rows:", error);
  }
})();
