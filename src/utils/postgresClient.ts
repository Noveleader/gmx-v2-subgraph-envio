import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config();

const { Client } = pg;
let postgresClient: pg.Client | null = null;

export async function getPostgresClient(context: any) {
  if (!postgresClient) {
    postgresClient = new Client({
      host: "localhost",
      user: process.env.USERNAME,
      database: process.env.DATABASE_NAME,
      password: process.env.PASSWORD,
      port: Number(process.env.PORT),
    });

    await postgresClient.connect();
    context.log.info(`Connected to the postgres client`);
  }

  return postgresClient;
}
