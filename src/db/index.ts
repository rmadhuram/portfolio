import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined;
  return mysql.createPool({
    uri: url,
    ssl,
    connectionLimit: 5,
    waitForConnections: true,
    timezone: "Z",
  });
}

// Reuse the pool across hot reloads (dev) and warm serverless invocations.
const globalForDb = globalThis as unknown as { __mysqlPool?: mysql.Pool };
const pool = globalForDb.__mysqlPool ?? createPool();
globalForDb.__mysqlPool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export type Db = typeof db;
export { schema };
