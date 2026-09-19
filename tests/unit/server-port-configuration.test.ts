import { describe, it, expect } from "vitest";
import { resolveServerPort } from "../../src/server/serverConfig";

describe("Server Port Configuration & Validation (Unit Tests)", () => {
  describe("Default Fallback", () => {
    it("returns default port 3000 when rawPort is undefined", () => {
      expect(resolveServerPort(undefined)).toBe(3000);
    });

    it("returns default port 3000 when rawPort is empty string", () => {
      expect(resolveServerPort("")).toBe(3000);
    });

    it("returns default port 3000 when rawPort is whitespace only", () => {
      expect(resolveServerPort("   ")).toBe(3000);
    });

    it("supports custom defaultPort fallback", () => {
      expect(resolveServerPort(undefined, 8080)).toBe(8080);
      expect(resolveServerPort("", 4000)).toBe(4000);
    });
  });

  describe("Valid Ports", () => {
    it("parses valid port numbers from string", () => {
      expect(resolveServerPort("3001")).toBe(3001);
      expect(resolveServerPort("8080")).toBe(8080);
    });

    it("handles trimmed string with whitespace", () => {
      expect(resolveServerPort(" 3001 ")).toBe(3001);
      expect(resolveServerPort("\t8080\n")).toBe(8080);
    });

    it("accepts valid port numbers as number input", () => {
      expect(resolveServerPort(3001)).toBe(3001);
      expect(resolveServerPort(80)).toBe(80);
    });

    it("accepts valid boundary port values (1 and 65535)", () => {
      expect(resolveServerPort("1")).toBe(1);
      expect(resolveServerPort("65535")).toBe(65535);
      expect(resolveServerPort(1)).toBe(1);
      expect(resolveServerPort(65535)).toBe(65535);
    });
  });

  describe("Invalid Ports - Strict Rejection", () => {
    it("rejects port 0", () => {
      expect(() => resolveServerPort("0")).toThrow(/Invalid PORT value/);
      expect(() => resolveServerPort(0)).toThrow(/Invalid PORT value/);
    });

    it("rejects negative port numbers", () => {
      expect(() => resolveServerPort("-1")).toThrow(/Invalid PORT value/);
      expect(() => resolveServerPort(-3000)).toThrow(/Invalid PORT value/);
    });

    it("rejects port numbers above 65535", () => {
      expect(() => resolveServerPort("65536")).toThrow(/Invalid PORT value/);
      expect(() => resolveServerPort(70000)).toThrow(/Invalid PORT value/);
    });

    it("rejects non-numeric strings", () => {
      expect(() => resolveServerPort("abc")).toThrow(/Invalid PORT value/);
      expect(() => resolveServerPort("3000abc")).toThrow(/Invalid PORT value/);
      expect(() => resolveServerPort("PORT_3000")).toThrow(/Invalid PORT value/);
    });

    it("rejects floating point port numbers", () => {
      expect(() => resolveServerPort("3000.5")).toThrow(/Invalid PORT value/);
      expect(() => resolveServerPort(3000.5)).toThrow(/Invalid PORT value/);
    });

    it("rejects NaN values", () => {
      expect(() => resolveServerPort(NaN)).toThrow(/Invalid PORT value/);
      expect(() => resolveServerPort("NaN")).toThrow(/Invalid PORT value/);
    });
  });
});
