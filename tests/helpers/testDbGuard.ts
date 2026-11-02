/**
 * Isolated Test DB Connection Guard (Fail-Closed Architecture)
 *
 * Enforces strict fail-closed criteria before ANY test code or migration
 * can interact with a PostgreSQL instance.
 *
 * Rules:
 * 1. Requires explicit opt-in via environment flag (TEST_DB_ALLOW_MUTATION=true).
 * 2. Requires explicit test connection string via dedicated variable (TEST_DATABASE_URL).
 * 3. Never falls back to application DATABASE_URL or .env values.
 * 4. Strictly validates URL host, port, database name against an exact allowlist.
 * 5. Requires post-connection identity probe (current_database, current_schema, current_user).
 *    Any mismatch between probed identity and target config results in immediate abort.
 * 6. Validates teardown target matches the session-specific disposable target.
 */

export interface TestDbTargetConfig {
  expectedHost: string;
  expectedPort: number;
  expectedDatabase: string;
  expectedSchema: string;
  expectedRole: string;
  connectTimeoutMs?: number;
}

export interface ProbedDatabaseIdentity {
  currentDatabase: string;
  currentSchema: string;
  currentUser: string;
  serverAddr?: string;
}

export class TestDbGuardError extends Error {
  constructor(message: string) {
    super(`[TEST_DB_GUARD_BLOCKED] ${message}`);
    this.name = "TestDbGuardError";
  }
}

/**
 * Validates pre-connection environment and connection parameters.
 * Throws TestDbGuardError if any condition is not met.
 */
export function validateTestDbPreflight(
  env: Record<string, string | undefined>,
  targetConfig: TestDbTargetConfig
): { testDatabaseUrl: string } {
  // Rule 1: Explicit opt-in flag required
  if (env.TEST_DB_ALLOW_MUTATION !== "true") {
    throw new TestDbGuardError(
      "Missing or invalid opt-in: TEST_DB_ALLOW_MUTATION must be explicitly set to 'true'."
    );
  }

  // Rule 2 & 3: Dedicated test URL required; no fallback allowed
  const testUrl = env.TEST_DATABASE_URL;
  if (!testUrl || testUrl.trim().length === 0) {
    throw new TestDbGuardError(
      "Missing test database URL: TEST_DATABASE_URL must be explicitly provided. Fallback to DATABASE_URL is strictly forbidden."
    );
  }

  // Prevent accidentally passing production DATABASE_URL into TEST_DATABASE_URL
  if (env.DATABASE_URL && testUrl === env.DATABASE_URL) {
    throw new TestDbGuardError(
      "Unsafe configuration: TEST_DATABASE_URL matches application DATABASE_URL. Test database must be isolated."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(testUrl);
  } catch (err) {
    throw new TestDbGuardError(`Invalid TEST_DATABASE_URL format: ${String(err)}`);
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new TestDbGuardError(
      `Invalid protocol '${parsed.protocol}'. Expected 'postgresql:' or 'postgres:'.`
    );
  }

  const hostname = parsed.hostname;
  const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
  const rawPath = parsed.pathname.replace(/^\//, "");
  const searchParams = parsed.searchParams;
  const schema = searchParams.get("schema") || "public";
  const username = decodeURIComponent(parsed.username || "");

  // Rule 4: Match exact allowlisted configuration
  if (hostname !== targetConfig.expectedHost) {
    throw new TestDbGuardError(
      `Disallowed host '${hostname}'. Expected exact match with allowlisted host '${targetConfig.expectedHost}'.`
    );
  }

  if (port !== targetConfig.expectedPort) {
    throw new TestDbGuardError(
      `Disallowed port '${port}'. Expected exact match with allowlisted port '${targetConfig.expectedPort}'.`
    );
  }

  if (rawPath !== targetConfig.expectedDatabase) {
    throw new TestDbGuardError(
      `Disallowed database '${rawPath}'. Expected exact match with allowlisted database '${targetConfig.expectedDatabase}'.`
    );
  }

  // Guard against known live/prod databases even if configured
  if (
    rawPath === "knowledge_os" ||
    rawPath.includes("prod") ||
    rawPath.includes("live")
  ) {
    throw new TestDbGuardError(
      `CRITICAL GUARD TRIGGERED: Database '${rawPath}' is identified as live/production. Mutation prohibited.`
    );
  }

  if (schema !== targetConfig.expectedSchema) {
    throw new TestDbGuardError(
      `Disallowed schema '${schema}'. Expected exact match with allowlisted schema '${targetConfig.expectedSchema}'.`
    );
  }

  if (username !== targetConfig.expectedRole) {
    throw new TestDbGuardError(
      `Disallowed role '${username}'. Expected exact match with allowlisted role '${targetConfig.expectedRole}'.`
    );
  }

  return { testDatabaseUrl: testUrl };
}

/**
 * Validates post-connection live identity probe results.
 * Throws TestDbGuardError if probed database, schema, or role differs from expected target.
 */
export function validateProbedDatabaseIdentity(
  probed: ProbedDatabaseIdentity,
  targetConfig: TestDbTargetConfig
): void {
  if (probed.currentDatabase !== targetConfig.expectedDatabase) {
    throw new TestDbGuardError(
      `Identity mismatch: connected database is '${probed.currentDatabase}', but expected '${targetConfig.expectedDatabase}'.`
    );
  }

  if (probed.currentSchema !== targetConfig.expectedSchema) {
    throw new TestDbGuardError(
      `Identity mismatch: connected schema is '${probed.currentSchema}', but expected '${targetConfig.expectedSchema}'.`
    );
  }

  if (probed.currentUser !== targetConfig.expectedRole) {
    throw new TestDbGuardError(
      `Identity mismatch: connected role is '${probed.currentUser}', but expected '${targetConfig.expectedRole}'.`
    );
  }
}

/**
 * Validates teardown action safety.
 *
 * Điều kiện kiểm soát:
 * 1. Target database cần teardown phải trùng khớp chính xác với database dùng một lần của session.
 * 2. Kết nối thực thi lệnh teardown PHẢI kết nối vào database quản trị ('postgres'), KHÔNG ĐƯỢC kết nối vào chính target test (`currentConnectedDatabase !== targetToTeardown.database`).
 * 3. Không được phép teardown các database bảo vệ (knowledge_os, postgres, prod, live).
 */
export function validateTeardownTargetSafety(
  targetToTeardown: { database: string; schema: string },
  sessionTarget: TestDbTargetConfig,
  currentConnectedDatabase?: string
): void {
  // Điều kiện 0: Không bao giờ cho phép teardown database hệ thống hoặc production
  if (
    targetToTeardown.database === "knowledge_os" ||
    targetToTeardown.database === "postgres" ||
    targetToTeardown.database.includes("prod") ||
    targetToTeardown.database.includes("live")
  ) {
    throw new TestDbGuardError(
      `CRITICAL GUARD TRIGGERED: Cannot teardown protected database '${targetToTeardown.database}'.`
    );
  }

  // Điều kiện 1: Teardown phải kết nối tới database 'postgres', không kết nối target test
  if (currentConnectedDatabase) {
    if (currentConnectedDatabase === targetToTeardown.database) {
      throw new TestDbGuardError(
        `Unsafe teardown connection: cannot teardown target database '${targetToTeardown.database}' while actively connected to it. Teardown connection must connect to maintenance database 'postgres'.`
      );
    }
    if (currentConnectedDatabase !== "postgres") {
      throw new TestDbGuardError(
        `Disallowed teardown connection database '${currentConnectedDatabase}'. Teardown must be executed from maintenance database 'postgres'.`
      );
    }
  }

  if (targetToTeardown.database !== sessionTarget.expectedDatabase) {
    throw new TestDbGuardError(
      `Unsafe teardown: target database '${targetToTeardown.database}' does not match session disposable database '${sessionTarget.expectedDatabase}'.`
    );
  }

  if (targetToTeardown.schema !== sessionTarget.expectedSchema) {
    throw new TestDbGuardError(
      `Unsafe teardown: target schema '${targetToTeardown.schema}' does not match session disposable schema '${sessionTarget.expectedSchema}'.`
    );
  }
}
