import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon over HTTP: each query is a fetch, ideal for serverless — no pool to
 * leak, and Neon auto-wakes from scale-to-zero in <1s. HTTP mode has no
 * session, so multi-statement transactions use db.batch() or the SQL-level
 * patterns in src/lib/booking.js.
 */
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
