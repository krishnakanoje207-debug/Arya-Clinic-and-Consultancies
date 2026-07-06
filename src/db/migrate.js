/**
 * Apply the hand-written SQL migrations in ./drizzle using the neon-http
 * migrator (reads drizzle/meta/_journal.json).
 *
 *   node --env-file=.env src/db/migrate.js
 */
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

// Local dev only — mirror the proxy routing in src/db/index.js. No-op in prod.
if (process.env.DATABASE_URL?.includes("db.localtest.me")) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("✓ Migrations applied.");
process.exit(0);
