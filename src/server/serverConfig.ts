/**
 * Server Configuration & Port Resolver
 *
 * Provides robust resolution and validation for the server listening port.
 * Allows configuration via `PORT` environment variable while falling back
 * safely to default port 3000.
 */

/**
 * Resolves and strictly validates the server port from an environment variable or raw value.
 *
 * @param rawPort - Value from process.env.PORT or custom input
 * @param defaultPort - Default fallback port (default: 3000)
 * @returns Validated integer port between 1 and 65535
 * @throws Error if rawPort is provided but invalid
 */
export function resolveServerPort(
  rawPort: string | number | undefined = process.env.PORT,
  defaultPort = 3000,
): number {
  if (rawPort === undefined || rawPort === null) {
    return defaultPort;
  }

  if (typeof rawPort === "string") {
    const trimmed = rawPort.trim();
    if (trimmed === "") {
      return defaultPort;
    }

    if (!/^\d+$/.test(trimmed)) {
      throw new Error(
        `Invalid PORT value "${rawPort}". PORT must be a valid integer between 1 and 65535.`,
      );
    }

    const portNum = Number(trimmed);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      throw new Error(
        `Invalid PORT value "${rawPort}". PORT must be a valid integer between 1 and 65535.`,
      );
    }

    return portNum;
  }

  if (typeof rawPort === "number") {
    if (!Number.isInteger(rawPort) || rawPort < 1 || rawPort > 65535) {
      throw new Error(
        `Invalid PORT value "${rawPort}". PORT must be a valid integer between 1 and 65535.`,
      );
    }

    return rawPort;
  }

  throw new Error(
    `Invalid PORT value "${String(rawPort)}". PORT must be a valid integer between 1 and 65535.`,
  );
}
