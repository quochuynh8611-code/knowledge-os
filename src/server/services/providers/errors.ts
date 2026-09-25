/**
 * Production Error Taxonomy & Sanitization for Research Provider Architecture
 * (Phase 4.1 Error Framework)
 */

import { ProviderErrorCode } from "./types";

export interface RetryPolicyRule {
  readonly retry: boolean;
  readonly fallback: boolean;
}

export const ERROR_RETRY_POLICY: Readonly<Record<ProviderErrorCode, RetryPolicyRule>> = Object.freeze({
  INVALID_ARGUMENT: Object.freeze({ retry: false, fallback: false }),
  AUTHENTICATION_FAILED: Object.freeze({ retry: false, fallback: false }),
  PERMISSION_DENIED: Object.freeze({ retry: false, fallback: false }),
  CAPABILITY_UNSUPPORTED: Object.freeze({ retry: false, fallback: false }),
  PROVIDER_TIMEOUT: Object.freeze({ retry: false, fallback: false }),
  PROVIDER_UNAVAILABLE: Object.freeze({ retry: true, fallback: true }),
  IDEMPOTENCY_CONFLICT: Object.freeze({ retry: false, fallback: false }),
  INTERNAL_ERROR: Object.freeze({ retry: false, fallback: false }),
});

const VALID_ERROR_CODES = new Set<string>([
  "INVALID_ARGUMENT",
  "AUTHENTICATION_FAILED",
  "PERMISSION_DENIED",
  "CAPABILITY_UNSUPPORTED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_UNAVAILABLE",
  "IDEMPOTENCY_CONFLICT",
  "INTERNAL_ERROR",
]);

export function isProviderErrorCode(value: unknown): value is ProviderErrorCode {
  return typeof value === "string" && VALID_ERROR_CODES.has(value);
}

export function sanitizeProviderErrorMessage(message: string): string {
  if (!message || typeof message !== "string") {
    return "";
  }

  let sanitized = message;

  // 1. Che Private Key blocks
  sanitized = sanitized.replace(
    /-----BEGIN[ A-Z_-]*PRIVATE KEY-----[\s\S]*?-----END[ A-Z_-]*PRIVATE KEY-----/g,
    "[REDACTED_PRIVATE_KEY]"
  );

  // 2. Che Bearer Tokens
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]");

  // 3. Che Google API Keys (AIzaSy...)
  sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, "[REDACTED_API_KEY]");

  // 4. Che Database Connection string passwords
  sanitized = sanitized.replace(/(:\/\/[^:]+:)([^@]+)(@)/g, "$1[REDACTED]$3");

  return sanitized;
}

export class ProviderException extends Error {
  public readonly errorCode: ProviderErrorCode;
  public readonly correlationId?: string;
  public readonly providerId?: string;
  public readonly retryable: boolean;
  public readonly rawDetails?: unknown;

  constructor(
    errorCode: ProviderErrorCode,
    message: string,
    correlationId?: string,
    providerId?: string,
    retryable: boolean = false,
    rawDetails?: unknown
  ) {
    const cleanMessage = sanitizeProviderErrorMessage(message);
    super(cleanMessage);
    this.name = "ProviderException";
    this.errorCode = errorCode;
    this.correlationId = correlationId;
    this.providerId = providerId;
    this.retryable = retryable;
    this.rawDetails = rawDetails;

    // Maintain prototype chain in ES5/ES6 environments
    Object.setPrototypeOf(this, ProviderException.prototype);
  }
}
