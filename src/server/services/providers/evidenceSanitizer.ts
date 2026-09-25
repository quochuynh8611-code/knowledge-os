/**
 * Evidence Sanitizer for Operator Preflight Evidence Bundles.
 *
 * Enforces pure, deterministic, fail-closed sanitization on all evidence fields.
 * Strips secrets, tokens, credentials, raw source, filesystem paths, and env vars.
 *
 * Invariant: realExecutionAllowed === false, networkAllowed === false, credentialsAllowed === false.
 */

export interface EvidenceSanitizationResult {
  readonly sanitized: boolean;
  readonly value: unknown;
  readonly redactions: readonly string[];
  readonly rejectedFields: readonly string[];
}

const REDACTION_PATTERNS = [
  { pattern: /AIza[0-9A-Za-z-_]{30,40}/g, replacement: "[REDACTED_API_KEY]" },
  { pattern: /bearer\s+[a-zA-Z0-9_\-\.]{10,}/gi, replacement: "[REDACTED_BEARER_TOKEN]" },
  { pattern: /(?:api[_-]?key|apikey|secret|password|passwd|auth[_-]?token|access[_-]?token|private[_-]?key)\s*[:=]\s*['"]?[a-zA-Z0-9_\-\.\$\+\/]{8,}['"]?/gi, replacement: "[REDACTED_CREDENTIAL]" },
  { pattern: /ya29\.[a-zA-Z0-9_\-]{20,}/gi, replacement: "[REDACTED_OAUTH_TOKEN]" },
  { pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, replacement: "[REDACTED_PRIVATE_KEY]" },
  { pattern: /set-cookie:\s*[^;\r\n]+/gi, replacement: "[REDACTED_COOKIE]" },
  { pattern: /cookie:\s*[^;\r\n]+/gi, replacement: "[REDACTED_COOKIE]" },
  { pattern: /(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^\s]+/gi, replacement: "[REDACTED_DATABASE_URL]" },
  { pattern: /(?:\/(?:Users|home|var|tmp|etc|root|private)\/[^\s"']+)/g, replacement: "[REDACTED_PATH]" },
  { pattern: /(?:[a-zA-Z]:\\[^\s"']+)/g, replacement: "[REDACTED_PATH]" },
  { pattern: /process\.env\.[A-Za-z0-9_]+/g, replacement: "[REDACTED_ENV_VAR]" },
];

const DISALLOWED_KEYWORD_PATTERNS = [
  /secret/i,
  /apikey/i,
  /api_key/i,
  /api-key/i,
  /token/i,
  /password/i,
  /passwd/i,
  /credential/i,
  /cookie/i,
  /rawsource/i,
  /raw_source/i,
  /sourcetext/i,
  /source_text/i,
  /fullpayload/i,
  /requestbody/i,
  /responsebody/i,
  /stacktrace/i,
  /stack_trace/i,
  /processenv/i,
  /process_env/i,
  /envdump/i,
  /environmentdump/i,
  /providerinstance/i,
  /provider_instance/i,
  /socket/i,
  /shellcommand/i,
  /shell_command/i,
  /databaseurl/i,
  /database_url/i,
  /credentialpath/i,
  /credential_path/i,
];

function isDisallowedKey(key: string): boolean {
  return DISALLOWED_KEYWORD_PATTERNS.some((pattern) => pattern.test(key));
}


/**
 * Sanitizes a string value by removing sensitive tokens, paths, and patterns.
 */
export function sanitizeString(input: string): { sanitized: string; redactions: string[] } {
  let result = input;
  const redactions: string[] = [];

  for (const { pattern, replacement } of REDACTION_PATTERNS) {
    const reg = new RegExp(pattern.source, pattern.flags);
    if (reg.test(result)) {
      redactions.push(replacement);
      result = result.replace(new RegExp(pattern.source, pattern.flags), replacement);
    }
  }

  // Bounded length to prevent payload flooding
  if (result.length > 2000) {
    result = result.substring(0, 2000) + "...[TRUNCATED]";
    redactions.push("[TRUNCATED_OVERSIZED]");
  }

  return { sanitized: result, redactions };
}

/**
 * Pure recursive sanitization for evidence structures.
 * Enforces strict allowlisting of scalar types and denies disallowed field names.
 */
export function sanitizeEvidenceValue(value: unknown, depth = 0): EvidenceSanitizationResult {
  if (depth > 8) {
    return {
      sanitized: false,
      value: null,
      redactions: ["[MAX_DEPTH_EXCEEDED]"],
      rejectedFields: ["nested_too_deep"],
    };
  }

  if (value === null || value === undefined) {
    return {
      sanitized: true,
      value: value,
      redactions: [],
      rejectedFields: [],
    };
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return {
      sanitized: true,
      value: value,
      redactions: [],
      rejectedFields: [],
    };
  }

  if (typeof value === "string") {
    const { sanitized, redactions } = sanitizeString(value);
    return {
      sanitized: true,
      value: sanitized,
      redactions,
      rejectedFields: [],
    };
  }

  if (Array.isArray(value)) {
    const sanitizedArray: unknown[] = [];
    const allRedactions: string[] = [];
    const allRejectedFields: string[] = [];
    let isSanitized = true;

    for (let i = 0; i < value.length; i++) {
      const itemResult = sanitizeEvidenceValue(value[i], depth + 1);
      if (!itemResult.sanitized) {
        isSanitized = false;
      }
      sanitizedArray.push(itemResult.value);
      allRedactions.push(...itemResult.redactions);
      allRejectedFields.push(...itemResult.rejectedFields);
    }

    return {
      sanitized: isSanitized,
      value: Object.freeze(sanitizedArray),
      redactions: Object.freeze(Array.from(new Set(allRedactions))),
      rejectedFields: Object.freeze(Array.from(new Set(allRejectedFields))),
    };
  }

  if (typeof value === "object") {
    // Disallow non-plain objects or instances of complex classes
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype) {
      return {
        sanitized: false,
        value: null,
        redactions: ["[REJECTED_COMPLEX_OBJECT]"],
        rejectedFields: ["complex_object_instance"],
      };
    }

    const record = value as Record<string, unknown>;
    const sanitizedRecord: Record<string, unknown> = {};
    const allRedactions: string[] = [];
    const allRejectedFields: string[] = [];
    let isSanitized = true;

    for (const key of Object.keys(record)) {
      if (isDisallowedKey(key)) {
        isSanitized = false;
        allRejectedFields.push(key);
        allRedactions.push(`[DISALLOWED_FIELD:${key}]`);
        continue;
      }

      const fieldResult = sanitizeEvidenceValue(record[key], depth + 1);
      if (!fieldResult.sanitized) {
        isSanitized = false;
      }
      sanitizedRecord[key] = fieldResult.value;
      allRedactions.push(...fieldResult.redactions);
      allRejectedFields.push(...fieldResult.rejectedFields);
    }

    return {
      sanitized: isSanitized,
      value: Object.freeze(sanitizedRecord),
      redactions: Object.freeze(Array.from(new Set(allRedactions))),
      rejectedFields: Object.freeze(Array.from(new Set(allRejectedFields))),
    };
  }

  // Reject functions, symbols, bigints
  return {
    sanitized: false,
    value: null,
    redactions: ["[REJECTED_UNSUPPORTED_TYPE]"],
    rejectedFields: [typeof value],
  };
}
