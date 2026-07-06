import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

/**
 * Neon over HTTP: each query is a fetch, ideal for serverless — no pool to
 * leak, and Neon auto-wakes from scale-to-zero in <1s. HTTP mode has no
 * session, so multi-statement transactions use db.batch() or the SQL-level
 * patterns in src/lib/booking.js.
 */
// A syntactically-valid placeholder keeps `neon()` from throwing at import
// time when DATABASE_URL is absent (e.g. during `next build` before the
// database is provisioned). Real queries then fail at call time and are
// caught by the safe() wrappers in the data layer.
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

// Local dev only: when pointed at the Neon HTTP proxy from docker-compose.yml
// (host db.localtest.me → 127.0.0.1), send the driver's fetches to it over
// plain HTTP on :4444 instead of https://<host>/sql. No-op in production,
// where the host is the real *.neon.tech endpoint.
if (connectionString.includes("db.localtest.me")) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
