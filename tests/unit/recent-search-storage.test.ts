import { describe, it, expect, beforeEach } from "vitest";
import {
  getRecentSearchQueries,
  saveRecentSearchQuery,
  removeRecentSearchQuery,
  clearRecentSearchQueries,
  RECENT_SEARCH_QUERIES_STORAGE_KEY,
  MAX_RECENT_SEARCH_QUERIES,
} from "../../src/lib/recentSearchStorage";

describe("P7.2a: Recent Search Storage Helper", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("1. returns empty array when storage is empty or invalid", () => {
    expect(getRecentSearchQueries()).toEqual([]);

    localStorage.setItem(RECENT_SEARCH_QUERIES_STORAGE_KEY, "INVALID_JSON{{");
    expect(getRecentSearchQueries()).toEqual([]);

    localStorage.setItem(RECENT_SEARCH_QUERIES_STORAGE_KEY, JSON.stringify({ not: "an array" }));
    expect(getRecentSearchQueries()).toEqual([]);
  });

  it("2. saves valid query, trims whitespace, and puts it at front", () => {
    const res1 = saveRecentSearchQuery("  Tâm Vương  ");
    expect(res1).toEqual(["Tâm Vương"]);
    expect(getRecentSearchQueries()).toEqual(["Tâm Vương"]);

    const res2 = saveRecentSearchQuery("Duyên Hệ");
    expect(res2).toEqual(["Duyên Hệ", "Tâm Vương"]);
  });

  it("3. ignores queries shorter than 2 characters or empty strings", () => {
    saveRecentSearchQuery("Tâm Vương");
    const res = saveRecentSearchQuery(" a ");
    expect(res).toEqual(["Tâm Vương"]);

    const resEmpty = saveRecentSearchQuery("");
    expect(resEmpty).toEqual(["Tâm Vương"]);
  });

  it("4. deduplicates case-insensitively while preserving the newest casing and promoting to front", () => {
    saveRecentSearchQuery("tâm vương");
    saveRecentSearchQuery("Bát Nhã");
    expect(getRecentSearchQueries()).toEqual(["Bát Nhã", "tâm vương"]);

    // Re-save with proper casing -> moves to front
    const updated = saveRecentSearchQuery("TÂM VƯƠNG");
    expect(updated).toEqual(["TÂM VƯƠNG", "Bát Nhã"]);
    expect(getRecentSearchQueries()).toEqual(["TÂM VƯƠNG", "Bát Nhã"]);
  });

  it("5. enforces max limit of 8 items in LRU order", () => {
    for (let i = 1; i <= 12; i++) {
      saveRecentSearchQuery(`Query ${i}`);
    }

    const current = getRecentSearchQueries();
    expect(current.length).toBe(MAX_RECENT_SEARCH_QUERIES);
    expect(current[0]).toBe("Query 12");
    expect(current[current.length - 1]).toBe("Query 5");
  });

  it("6. removes specific query case-insensitively", () => {
    saveRecentSearchQuery("Tâm Vương");
    saveRecentSearchQuery("Bát Nhã");
    saveRecentSearchQuery("Duyên Hệ");

    const afterRemove = removeRecentSearchQuery("bát nhã");
    expect(afterRemove).toEqual(["Duyên Hệ", "Tâm Vương"]);
    expect(getRecentSearchQueries()).toEqual(["Duyên Hệ", "Tâm Vương"]);
  });

  it("7. clears all recent queries", () => {
    saveRecentSearchQuery("Tâm Vương");
    saveRecentSearchQuery("Bát Nhã");

    clearRecentSearchQueries();
    expect(getRecentSearchQueries()).toEqual([]);
  });
});
