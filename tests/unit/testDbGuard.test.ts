/**
 * Test Suite: Fail-Closed Test DB Guard Unit Tests (Non-Connecting)
 *
 * Verifies that all unsafe or unverified database targets are strictly blocked
 * before ANY live network or database call can take place.
 *
 * Scenarios:
 * 1. Missing explicit opt-in (TEST_DB_ALLOW_MUTATION !== 'true') -> blocked.
 * 2. Missing TEST_DATABASE_URL -> blocked (no fallback to DATABASE_URL).
 * 3. TEST_DATABASE_URL matches live DATABASE_URL -> blocked.
 * 4. Target host/port/database/schema/role differs from expected allowlist -> blocked.
 * 5. Probed live identity differs from target config -> blocked.
 * 6. Teardown target pointing to protected or foreign database -> blocked.
 * 7. Valid config and matching probed identity -> passes cleanly.
 */

import { describe, it, expect } from "vitest";
import {
  validateTestDbPreflight,
  validateProbedDatabaseIdentity,
  validateTeardownTargetSafety,
  TestDbGuardError,
  type TestDbTargetConfig,
  type ProbedDatabaseIdentity,
} from "../helpers/testDbGuard";

describe("Test DB Connection Guard (Fail-Closed Architecture)", () => {
  const allowlistedConfig: TestDbTargetConfig = {
    expectedHost: "localhost",
    expectedPort: 5432,
    expectedDatabase: "knowledge_os_disposable_test",
    expectedSchema: "public",
    expectedRole: "test_runner",
    connectTimeoutMs: 3000,
  };

  const validTestUrl =
    "postgresql://test_runner:secret@localhost:5432/knowledge_os_disposable_test?schema=public";

  it("1. Blocks when explicit opt-in flag TEST_DB_ALLOW_MUTATION is missing or false", () => {
    expect(() =>
      validateTestDbPreflight(
        {
          TEST_DATABASE_URL: validTestUrl,
        },
        allowlistedConfig
      )
    ).toThrow(TestDbGuardError);

    expect(() =>
      validateTestDbPreflight(
        {
          TEST_DB_ALLOW_MUTATION: "false",
          TEST_DATABASE_URL: validTestUrl,
        },
        allowlistedConfig
      )
    ).toThrow(/Missing or invalid opt-in/);
  });

  it("2. Blocks when TEST_DATABASE_URL is missing, refusing fallback to DATABASE_URL", () => {
    expect(() =>
      validateTestDbPreflight(
        {
          TEST_DB_ALLOW_MUTATION: "true",
          DATABASE_URL:
            "postgresql://postgres:pass@localhost:5432/knowledge_os?schema=public",
        },
        allowlistedConfig
      )
    ).toThrow(/Missing test database URL/);
  });

  it("3. Blocks when TEST_DATABASE_URL matches application DATABASE_URL", () => {
    expect(() =>
      validateTestDbPreflight(
        {
          TEST_DB_ALLOW_MUTATION: "true",
          DATABASE_URL: validTestUrl,
          TEST_DATABASE_URL: validTestUrl,
        },
        allowlistedConfig
      )
    ).toThrow(/TEST_DATABASE_URL matches application DATABASE_URL/);
  });

  it("4. Blocks when database name is identified as live/production 'knowledge_os'", () => {
    const liveConfig: TestDbTargetConfig = {
      ...allowlistedConfig,
      expectedDatabase: "knowledge_os",
    };

    expect(() =>
      validateTestDbPreflight(
        {
          TEST_DB_ALLOW_MUTATION: "true",
          TEST_DATABASE_URL:
            "postgresql://test_runner:secret@localhost:5432/knowledge_os?schema=public",
        },
        liveConfig
      )
    ).toThrow(/CRITICAL GUARD TRIGGERED/);
  });

  it("5. Blocks when host, port, database, schema, or role differs from allowlist", () => {
    // Sai port
    expect(() =>
      validateTestDbPreflight(
        {
          TEST_DB_ALLOW_MUTATION: "true",
          TEST_DATABASE_URL:
            "postgresql://test_runner:secret@localhost:5433/knowledge_os_disposable_test?schema=public",
        },
        allowlistedConfig
      )
    ).toThrow(/Disallowed port '5433'/);

    // Sai database
    expect(() =>
      validateTestDbPreflight(
        {
          TEST_DB_ALLOW_MUTATION: "true",
          TEST_DATABASE_URL:
            "postgresql://test_runner:secret@localhost:5432/other_db?schema=public",
        },
        allowlistedConfig
      )
    ).toThrow(/Disallowed database 'other_db'/);

    // Sai role
    expect(() =>
      validateTestDbPreflight(
        {
          TEST_DB_ALLOW_MUTATION: "true",
          TEST_DATABASE_URL:
            "postgresql://postgres:secret@localhost:5432/knowledge_os_disposable_test?schema=public",
        },
        allowlistedConfig
      )
    ).toThrow(/Disallowed role 'postgres'/);
  });

  it("6. Blocks when post-connection probed identity does not match expected target", () => {
    const fakeProbedMismatchDb: ProbedDatabaseIdentity = {
      currentDatabase: "different_db",
      currentSchema: "public",
      currentUser: "test_runner",
    };

    expect(() =>
      validateProbedDatabaseIdentity(fakeProbedMismatchDb, allowlistedConfig)
    ).toThrow(/connected database is 'different_db'/);

    const fakeProbedMismatchRole: ProbedDatabaseIdentity = {
      currentDatabase: "knowledge_os_disposable_test",
      currentSchema: "public",
      currentUser: "postgres",
    };

    expect(() =>
      validateProbedDatabaseIdentity(fakeProbedMismatchRole, allowlistedConfig)
    ).toThrow(/connected role is 'postgres'/);
  });

  it("7. Blocks teardown if target does not strictly match session disposable database or if executed from wrong connection", () => {
    // Teardown kết nối vào chính target test -> bị chặn
    expect(() =>
      validateTeardownTargetSafety(
        { database: "knowledge_os_disposable_test", schema: "public" },
        allowlistedConfig,
        "knowledge_os_disposable_test"
      )
    ).toThrow(/Unsafe teardown connection: cannot teardown target database/);

    // Teardown kết nối từ database khác ngoài 'postgres' -> bị chặn
    expect(() =>
      validateTeardownTargetSafety(
        { database: "knowledge_os_disposable_test", schema: "public" },
        allowlistedConfig,
        "other_maintenance_db"
      )
    ).toThrow(/Disallowed teardown connection database 'other_maintenance_db'/);

    expect(() =>
      validateTeardownTargetSafety(
        { database: "knowledge_os", schema: "public" },
        allowlistedConfig,
        "postgres"
      )
    ).toThrow(/Cannot teardown protected database 'knowledge_os'/);

    expect(() =>
      validateTeardownTargetSafety(
        { database: "postgres", schema: "public" },
        { ...allowlistedConfig, expectedDatabase: "postgres" },
        "postgres"
      )
    ).toThrow(/Cannot teardown protected database 'postgres'/);
  });

  it("8. Allows connection preflight, identity check, and safe teardown when all parameters match allowlist", () => {
    const preflight = validateTestDbPreflight(
      {
        TEST_DB_ALLOW_MUTATION: "true",
        TEST_DATABASE_URL: validTestUrl,
      },
      allowlistedConfig
    );

    expect(preflight.testDatabaseUrl).toBe(validTestUrl);

    const matchingProbed: ProbedDatabaseIdentity = {
      currentDatabase: "knowledge_os_disposable_test",
      currentSchema: "public",
      currentUser: "test_runner",
    };

    expect(() =>
      validateProbedDatabaseIdentity(matchingProbed, allowlistedConfig)
    ).not.toThrow();

    // Teardown an toàn khi kết nối từ 'postgres' và target đúng session target
    expect(() =>
      validateTeardownTargetSafety(
        { database: "knowledge_os_disposable_test", schema: "public" },
        allowlistedConfig,
        "postgres"
      )
    ).not.toThrow();
  });
});
