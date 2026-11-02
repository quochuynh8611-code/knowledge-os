/**
 * Isolated DB Client Factory for Prisma 7 (Driver Adapter Pattern)
 *
 * CRITICAL INVARIANTS:
 * 1. NEVER imports or reuses production `prisma` singleton from `src/lib/prisma.ts`.
 * 2. NEVER reads application `DATABASE_URL` or .env fallback.
 * 3. Uses `@prisma/adapter-pg` with `pg.Pool` explicitly constructed with validated test URL.
 * 4. Executes mandatory SQL identity probe (`current_database()`, `current_schema()`, `current_user`)
 *    before releasing the client to test runners.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import {
  validateTestDbPreflight,
  validateProbedDatabaseIdentity,
  type TestDbTargetConfig,
  type ProbedDatabaseIdentity,
} from "./testDbGuard";

export interface IsolatedTestDbContext {
  prisma: PrismaClient;
  pool: pg.Pool;
  probedIdentity: ProbedDatabaseIdentity;
  disconnect: () => Promise<void>;
}

/**
 * Creates an isolated, fail-closed Prisma 7 Client.
 * Throws TestDbGuardError if preflight or probed identity fails.
 */
export async function createIsolatedTestDbClient(
  targetConfig: TestDbTargetConfig,
  env: Record<string, string | undefined> = process.env
): Promise<IsolatedTestDbContext> {
  // Preflight validation: opt-in, test URL, exact host/port/db/schema/role
  const { testDatabaseUrl } = validateTestDbPreflight(env, targetConfig);

  const pool = new pg.Pool({
    connectionString: testDatabaseUrl,
    connectionTimeoutMillis: targetConfig.connectTimeoutMs || 3000,
    max: 5,
  });

  // Execute mandatory identity probe before touching Prisma
  let client: pg.PoolClient | null = null;
  let probedIdentity: ProbedDatabaseIdentity;
  try {
    client = await pool.connect();
    const result = await client.query(`
      SELECT
        current_database() as "currentDatabase",
        current_schema() as "currentSchema",
        current_user as "currentUser",
        inet_server_addr() as "serverAddr"
    `);

    if (!result.rows || result.rows.length === 0) {
      throw new Error("Empty identity probe response from database.");
    }

    probedIdentity = {
      currentDatabase: result.rows[0].currentDatabase,
      currentSchema: result.rows[0].currentSchema,
      currentUser: result.rows[0].currentUser,
      serverAddr: result.rows[0].serverAddr ? String(result.rows[0].serverAddr) : undefined,
    };
  } finally {
    if (client) {
      client.release();
    }
  }

  // Validate probed identity matches expected target
  validateProbedDatabaseIdentity(probedIdentity, targetConfig);

  // Initialize Prisma 7 with PrismaPg driver adapter
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
    log: ["error"],
  });

  const disconnect = async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // safe cleanup
    }
    try {
      await pool.end();
    } catch {
      // safe cleanup
    }
  };

  return {
    prisma,
    pool,
    probedIdentity,
    disconnect,
  };
}
