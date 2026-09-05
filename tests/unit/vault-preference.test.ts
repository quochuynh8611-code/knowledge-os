import { describe, it, expect, beforeEach } from "vitest";
import {
  getRecentVaults,
  saveRecentVault,
  clearRecentVaults,
  RECENT_VAULTS_KEY,
} from "../../src/lib/vault-preference";

describe("Phase P4.3D: Vault Preference & Recent Vaults", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty array when no recent vaults are stored", () => {
    expect(getRecentVaults()).toEqual([]);
  });

  it("saves a recent vault into localStorage", () => {
    saveRecentVault("vault-1");
    expect(getRecentVaults()).toEqual(["vault-1"]);
    expect(JSON.parse(localStorage.getItem(RECENT_VAULTS_KEY) || "[]")).toEqual(["vault-1"]);
  });

  it("limits recent vaults to a maximum of 3 items", () => {
    saveRecentVault("vault-1");
    saveRecentVault("vault-2");
    saveRecentVault("vault-3");
    saveRecentVault("vault-4");

    const recent = getRecentVaults();
    expect(recent).toHaveLength(3);
    expect(recent).toEqual(["vault-4", "vault-3", "vault-2"]);
  });

  it("deduplicates and moves the most recently selected vault to the top", () => {
    saveRecentVault("vault-1");
    saveRecentVault("vault-2");
    saveRecentVault("vault-3");
    // Re-select vault-1
    saveRecentVault("vault-1");

    expect(getRecentVaults()).toEqual(["vault-1", "vault-3", "vault-2"]);
  });

  it("handles corrupted localStorage gracefully by returning an empty array", () => {
    localStorage.setItem(RECENT_VAULTS_KEY, "{invalid-json");
    expect(getRecentVaults()).toEqual([]);
  });

  it("clears recent vaults on clearRecentVaults()", () => {
    saveRecentVault("vault-1");
    clearRecentVaults();
    expect(getRecentVaults()).toEqual([]);
    expect(localStorage.getItem(RECENT_VAULTS_KEY)).toBeNull();
  });
});
