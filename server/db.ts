import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import path from "node:path";
import { env } from "./env";
import * as schema from "./schema";

export const pool = mysql.createPool({ uri: env.databaseUrl, connectionLimit: 8, decimalNumbers: true });
export const db = drizzle(pool, { schema, mode: "default" });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/** Aplica las migraciones pendientes al arrancar: no hay que correr SQL a mano. */
export async function runMigrations() {
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
}
