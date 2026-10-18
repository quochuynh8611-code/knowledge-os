import { describe, it, expect, vi } from "vitest";

describe("ADR-077 — Hermetic Test Network Guard", () => {
  it("Scenario A: blocks unmocked live network calls to localhost with [Hermetic Guard]", async () => {
    await expect(fetch("http://localhost:3000/api/test")).rejects.toThrow(
      "[Hermetic Guard] Unmocked live network call blocked: http://localhost:3000/api/test"
    );
  });

  it("Scenario B: allows explicitly mocked fetch to execute cleanly without interference", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("offline"));
    globalThis.fetch = mockFetch;

    await expect(fetch("http://localhost:3000/api/test")).rejects.toThrow("offline");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("http://localhost:3000/api/test");
  });

  it("Scenario C: blocks unmocked live network calls to external URLs", async () => {
    await expect(fetch("https://api.external.com/v1/resource")).rejects.toThrow(
      "[Hermetic Guard] Unmocked live network call blocked: https://api.external.com/v1/resource"
    );
  });
});
