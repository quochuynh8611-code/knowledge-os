import { describe, it, expect } from "vitest";
import {
  sanitizeString,
  sanitizeEvidenceValue,
} from "../../src/server/services/providers/evidenceSanitizer";

describe("Evidence Sanitizer", () => {
  it("1. Bearer token is redacted", () => {
    const { sanitized } = sanitizeString("Authorization: Bearer secrettoken1234567890");
    expect(sanitized).toContain("[REDACTED_BEARER_TOKEN]");
    expect(sanitized).not.toContain("secrettoken1234567890");
  });

  it("2. API key is redacted", () => {
    const { sanitized } = sanitizeString("Found Google API key AIzaSyA1234567890123456789012345678901 in logs");
    expect(sanitized).toContain("[REDACTED_API_KEY]");
  });

  it("3. Password is redacted", () => {
    const { sanitized } = sanitizeString("Database config: password=SuperSecretPassword123!");
    expect(sanitized).toContain("[REDACTED_CREDENTIAL]");
  });

  it("4. Authorization header pattern is redacted", () => {
    const { sanitized } = sanitizeString("auth_token=abcdef1234567890");
    expect(sanitized).toContain("[REDACTED_CREDENTIAL]");
  });

  it("5. Cookie is redacted", () => {
    const { sanitized } = sanitizeString("Cookie: session=abc123456");
    expect(sanitized).toContain("[REDACTED_COOKIE]");
  });

  it("6. Private key block is redacted", () => {
    const key = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----";
    const { sanitized } = sanitizeString(`Cert:\n${key}`);
    expect(sanitized).toContain("[REDACTED_PRIVATE_KEY]");
    expect(sanitized).not.toContain("MIIEvgIBADANBgkqhkiG9w0BAQEFAASC");
  });

  it("7. Disallowed raw source field is rejected", () => {
    const res = sanitizeEvidenceValue({ rawSource: "secret source code contents" });
    expect(res.sanitized).toBe(false);
    expect(res.rejectedFields).toContain("rawSource");
  });

  it("8. Filesystem path in string is redacted", () => {
    const { sanitized } = sanitizeString("Error reading /Users/mr.chem/Documents/file.txt");
    expect(sanitized).toContain("[REDACTED_PATH]");
    expect(sanitized).not.toContain("/Users/mr.chem");
  });

  it("9. Disallowed env dump field is rejected", () => {
    const res = sanitizeEvidenceValue({ envDump: { NODE_ENV: "production" } });
    expect(res.sanitized).toBe(false);
    expect(res.rejectedFields).toContain("envDump");
  });

  it("10. process.env references in string are redacted", () => {
    const { sanitized } = sanitizeString("Loaded from process.env.API_SECRET_KEY");
    expect(sanitized).toContain("[REDACTED_ENV_VAR]");
  });

  it("11. Provider instance field is rejected", () => {
    const res = sanitizeEvidenceValue({ providerInstance: { client: {} } });
    expect(res.sanitized).toBe(false);
    expect(res.rejectedFields).toContain("providerInstance");
  });

  it("12. Socket field is rejected", () => {
    const res = sanitizeEvidenceValue({ socket: { remotePort: 443 } });
    expect(res.sanitized).toBe(false);
    expect(res.rejectedFields).toContain("socket");
  });

  it("13. Shell command field is rejected", () => {
    const res = sanitizeEvidenceValue({ shellCommand: "rm -rf /" });
    expect(res.sanitized).toBe(false);
    expect(res.rejectedFields).toContain("shellCommand");
  });

  it("14. Stack trace field is rejected", () => {
    const res = sanitizeEvidenceValue({ stackTrace: "Error: failed\n at file.ts:1" });
    expect(res.sanitized).toBe(false);
    expect(res.rejectedFields).toContain("stackTrace");
  });

  it("15. Database URL in string is redacted", () => {
    const { sanitized } = sanitizeString("Connect to postgres://user:pass@localhost:5432/db");
    expect(sanitized).toContain("[REDACTED_DATABASE_URL]");
    expect(sanitized).not.toContain("postgres://user:pass");
  });

  it("16. Allowed enum is preserved", () => {
    const res = sanitizeEvidenceValue("READY_FOR_MANUAL_REVIEW");
    expect(res.sanitized).toBe(true);
    expect(res.value).toBe("READY_FOR_MANUAL_REVIEW");
  });

  it("17. Allowed boolean is preserved", () => {
    const res = sanitizeEvidenceValue(false);
    expect(res.sanitized).toBe(true);
    expect(res.value).toBe(false);
  });

  it("18. Allowed count / number is preserved", () => {
    const res = sanitizeEvidenceValue(42);
    expect(res.sanitized).toBe(true);
    expect(res.value).toBe(42);
  });

  it("19. Fingerprint is preserved", () => {
    const hash = "a".repeat(64);
    const res = sanitizeEvidenceValue(hash);
    expect(res.sanitized).toBe(true);
    expect(res.value).toBe(hash);
  });

  it("20. Input object is not mutated", () => {
    const obj = { name: "test", count: 5 };
    const cloned = { ...obj };
    sanitizeEvidenceValue(obj);
    expect(obj).toEqual(cloned);
  });

  it("21. Sanitizer is deterministic", () => {
    const input = { text: "Path: /home/user/app", status: "PASS" };
    const r1 = sanitizeEvidenceValue(input);
    const r2 = sanitizeEvidenceValue(input);
    expect(r1).toEqual(r2);
  });

  it("22. Sanitizer handles null and undefined safely", () => {
    expect(sanitizeEvidenceValue(null).value).toBeNull();
    expect(sanitizeEvidenceValue(undefined).value).toBeUndefined();
  });

  it("23. Complex non-plain object instances are rejected", () => {
    class CustomClass {}
    const instance = new CustomClass();
    const res = sanitizeEvidenceValue(instance);
    expect(res.sanitized).toBe(false);
  });

  it("24. Array of items is sanitized recursively", () => {
    const array = ["item 1", "/var/log/syslog", "item 3"];
    const res = sanitizeEvidenceValue(array);
    expect(res.sanitized).toBe(true);
    expect(Array.isArray(res.value)).toBe(true);
    expect((res.value as string[])[1]).toContain("[REDACTED_PATH]");
  });

  it("25. Sanitization result is JSON-serializable", () => {
    const input = { summary: "Test check passed", safe: true };
    const res = sanitizeEvidenceValue(input);
    const serialized = JSON.stringify(res);
    expect(serialized).toBeDefined();
    expect(JSON.parse(serialized).sanitized).toBe(true);
  });
});
