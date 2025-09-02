import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index";
import { ENV } from "../../config/env";

if (!ENV.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not provided. Database features will be disabled.");
}

// Create PostgreSQL connection pool
const pool = ENV.DATABASE_URL ? new Pool({
  connectionString: ENV.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}) : null;

// Initialize Drizzle with the connection pool and schema
export const db = pool ? drizzle(pool, { schema }) : null;

// Export the pool for direct access if needed
export { pool };

// Graceful shutdown
process.on("SIGINT", async () => {
  if (pool) {
    console.log("Closing database connection pool...");
    await pool.end();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (pool) {
    console.log("Closing database connection pool...");
    await pool.end();
  }
  process.exit(0);
});