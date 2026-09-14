import { prisma as defaultPrisma } from "../../src/lib/prisma";
import {
  executeLegacyEconomyCleanup,
  TARGET_ROOT_CATEGORY_IDS,
  type CleanupDbClient,
  type CleanupResultSummary,
} from "./cleanupLegacyEconomyCore";

export const REQUIRED_CONFIRMATION_PHRASE = "XOA KINH TE VA KINH TE HOC";

export interface ParsedCliArgs {
  valid: boolean;
  mode: "dry-run" | "execute";
  exitCode?: number;
  errorMessage?: string;
}

export interface CliDependencies {
  prisma: CleanupDbClient & { $disconnect: () => Promise<void> };
  executeCleanup: (
    db: CleanupDbClient,
    options: { dryRun: boolean; databaseTarget: string }
  ) => Promise<CleanupResultSummary>;
  databaseUrl?: string;
}

/**
 * Sanitizes connection string to show only host:port/database without credentials.
 */
export function sanitizeDatabaseUrl(url?: string): string {
  if (!url || typeof url !== "string") {
    return "unknown-database";
  }
  try {
    const parsed = new URL(url);
    const host = parsed.host || "localhost:5432";
    const pathname = parsed.pathname || "/knowledge_os";
    return `${host}${pathname}`;
  } catch {
    // If not a full URL, strip out user:pass@ if present
    const cleaned = url.replace(/^[^:]+:\/\/[^@]+@/, "");
    return cleaned.split("?")[0] || "unknown-database";
  }
}

/**
 * Pure CLI argument parser with strict validation.
 */
export function parseCliArgs(args: string[]): ParsedCliArgs {
  let mode: "dry-run" | "execute" = "dry-run";
  let hasExecute = false;
  let confirmValue: string | null = null;

  for (const arg of args) {
    if (arg === "--dry-run") {
      mode = "dry-run";
    } else if (arg === "--execute") {
      hasExecute = true;
      mode = "execute";
    } else if (arg.startsWith("--confirm=")) {
      let raw = arg.slice("--confirm=".length);
      if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
      ) {
        raw = raw.slice(1, -1);
      }
      confirmValue = raw;
    } else {
      return {
        valid: false,
        mode: "dry-run",
        exitCode: 2,
        errorMessage: `Unknown or disallowed argument: ${arg}`,
      };
    }
  }

  if (hasExecute) {
    if (!confirmValue) {
      return {
        valid: false,
        mode: "execute",
        exitCode: 2,
        errorMessage: `Missing required --confirm parameter for --execute. Must pass: --confirm="${REQUIRED_CONFIRMATION_PHRASE}"`,
      };
    }
    if (confirmValue !== REQUIRED_CONFIRMATION_PHRASE) {
      return {
        valid: false,
        mode: "execute",
        exitCode: 2,
        errorMessage: `Invalid confirmation phrase "${confirmValue}". Required: "${REQUIRED_CONFIRMATION_PHRASE}"`,
      };
    }
  }

  return {
    valid: true,
    mode,
  };
}

/**
 * Main CLI runner with guaranteed disconnect and exit code management.
 */
export async function runCleanupCli(
  args: string[],
  deps: CliDependencies
): Promise<number> {
  const { prisma, executeCleanup, databaseUrl } = deps;
  let exitCode = 0;

  try {
    const parsed = parseCliArgs(args);
    if (!parsed.valid) {
      console.error(`\n❌ [CLI ERROR] ${parsed.errorMessage}\n`);
      exitCode = parsed.exitCode ?? 2;
      return exitCode;
    }

    const effectiveDbUrl =
      databaseUrl !== undefined
        ? databaseUrl
        : (process.env.DATABASE_URL || "");

    if (!effectiveDbUrl || effectiveDbUrl.trim() === "") {
      console.error("\n❌ [ENVIRONMENT ERROR] DATABASE_URL is missing or empty.\n");
      exitCode = 3;
      return exitCode;
    }

    const sanitizedDb = sanitizeDatabaseUrl(effectiveDbUrl);
    const dryRun = parsed.mode === "dry-run";

    // Print initial configuration to stdout
    console.log(
      JSON.stringify(
        {
          status: "STARTING",
          mode: parsed.mode,
          database: sanitizedDb,
          targetRootIds: Array.from(TARGET_ROOT_CATEGORY_IDS),
        },
        null,
        2
      )
    );

    const result = await executeCleanup(prisma, {
      dryRun,
      databaseTarget: sanitizedDb,
    });

    // Output machine-readable JSON result
    console.log(JSON.stringify(result, null, 2));
    exitCode = 0;
  } catch (error) {
    console.error(
      "\n❌ [RUNTIME ERROR] Execution failed:",
      error instanceof Error ? error.message : error
    );
    exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }

  return exitCode;
}

// Auto-run if executed directly via tsx/node
const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("cleanup-legacy-economy.ts") ||
    process.argv[1].endsWith("cleanup-legacy-economy.js"));

if (isDirectExecution) {
  const args = process.argv.slice(2);
  runCleanupCli(args, {
    prisma: defaultPrisma,
    executeCleanup: executeLegacyEconomyCleanup,
    databaseUrl: process.env.DATABASE_URL,
  }).then((code) => {
    process.exitCode = code;
  });
}
