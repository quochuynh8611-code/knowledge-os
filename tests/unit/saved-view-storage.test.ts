import { describe, it, expect, beforeEach } from "vitest";
import {
  getSavedSearchViews,
  createSavedSearchView,
  updateSavedSearchView,
  saveSavedSearchView,
  deleteSavedSearchView,
  togglePinSavedSearchView,
  clearSavedSearchViews,
  hasNonDefaultFilters,
  isSavedViewInputValid,
  SAVED_SEARCH_VIEWS_STORAGE_KEY,
  MAX_SAVED_SEARCH_VIEWS,
  SavedSearchView,
} from "../../src/lib/savedViewStorage";

describe("Phase P7.3a: Saved Views Storage Helper", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("1. returns empty array on empty or corrupted localStorage", () => {
    expect(getSavedSearchViews()).toEqual([]);

    localStorage.setItem(SAVED_SEARCH_VIEWS_STORAGE_KEY, "INVALID_JSON{{{");
    expect(getSavedSearchViews()).toEqual([]);

    localStorage.setItem(SAVED_SEARCH_VIEWS_STORAGE_KEY, JSON.stringify({ not: "an array" }));
    expect(getSavedSearchViews()).toEqual([]);
  });

  it("2. saves a new view with auto-generated id, ISO timestamps, and strict boolean pinned", () => {
    const views = createSavedSearchView({
      name: "Khảo sát Tâm Vương",
      query: "Tâm Vương",
      filters: {
        domain: "phat-hoc",
        status: "in_progress",
      },
    });

    expect(views.length).toBe(1);
    const view = views[0];
    expect(view.name).toBe("Khảo sát Tâm Vương");
    expect(view.query).toBe("Tâm Vương");
    expect(view.filters?.domain).toBe("phat-hoc");
    expect(view.filters?.status).toBe("in_progress");
    expect(view.pinned).toBe(false);
    expect(typeof view.pinned).toBe("boolean");
    expect(view.id).toBeTruthy();
    expect(view.createdAt).toBeTruthy();
    expect(view.updatedAt).toBeTruthy();
    expect(getSavedSearchViews()).toHaveLength(1);
  });

  it("3. allows empty query string if non-default filters exist", () => {
    // 3.1. Non-default domain filter with empty query
    const domainViews = createSavedSearchView({
      name: "Bộ Lọc Phật Học",
      query: "",
      filters: {
        domain: "phat-hoc",
      },
    });
    expect(domainViews.length).toBe(1);
    expect(domainViews[0].query).toBe("");
    expect(domainViews[0].filters?.domain).toBe("phat-hoc");

    // 3.2. Tag filter with empty query
    const tagViews = createSavedSearchView({
      name: "Chuyên Đề Abhidharma",
      query: "   ",
      filters: {
        tag: "Abhidharma",
      },
    });
    expect(tagViews.length).toBe(2);
    expect(tagViews[0].name).toBe("Chuyên Đề Abhidharma");
    expect(tagViews[0].query).toBe("");

    // 3.3. Status filter with empty query
    const statusViews = createSavedSearchView({
      name: "Đang Nghiên Cứu",
      query: "",
      filters: {
        status: "in_progress",
      },
    });
    expect(statusViews.length).toBe(3);
  });

  it("4. rejects views when both query and filters are empty or default", () => {
    // Empty name
    const res1 = createSavedSearchView({
      name: "   ",
      query: "Valid Query",
    });
    expect(res1).toEqual([]);

    // Empty query with no filters
    const res2 = createSavedSearchView({
      name: "Góc nhìn trống",
      query: "   ",
    });
    expect(res2).toEqual([]);

    // Empty query with all-default filters
    const res3 = createSavedSearchView({
      name: "Góc nhìn default",
      query: "",
      filters: {
        domain: "all",
        categoryId: null,
        tag: null,
        status: "all",
      },
    });
    expect(res3).toEqual([]);
  });

  it("5. explicitly updates an existing view by id preserving createdAt and pinned state", () => {
    const initial = createSavedSearchView({
      name: "Góc nhìn sơ khởi",
      query: "Duyên Hệ",
    });
    const id = initial[0].id;
    const initialCreatedAt = initial[0].createdAt;

    const updated = updateSavedSearchView(id, {
      name: "Góc nhìn cập nhật 24 Duyên",
      query: "24 Duyên",
      filters: {
        tag: "Abhidharma",
      },
    });

    expect(updated.length).toBe(1);
    expect(updated[0].id).toBe(id);
    expect(updated[0].name).toBe("Góc nhìn cập nhật 24 Duyên");
    expect(updated[0].query).toBe("24 Duyên");
    expect(updated[0].filters?.tag).toBe("Abhidharma");
    expect(updated[0].pinned).toBe(false); // pinned remains unchanged by update
    expect(updated[0].createdAt).toBe(initialCreatedAt);
  });

  it("6. toggles pinned state and deterministically sorts pinned items to the top", () => {
    createSavedSearchView({ name: "View 1", query: "Query 1" });
    createSavedSearchView({ name: "View 2", query: "Query 2" });
    const views = createSavedSearchView({ name: "View 3", query: "Query 3" });

    const view2 = views.find((v) => v.name === "View 2")!;
    const afterPin = togglePinSavedSearchView(view2.id);

    // Pinned item must be first
    expect(afterPin[0].id).toBe(view2.id);
    expect(afterPin[0].pinned).toBe(true);

    // Toggle unpin returns to standard updatedAt desc
    const afterUnpin = togglePinSavedSearchView(view2.id);
    expect(afterUnpin.find((v) => v.id === view2.id)?.pinned).toBe(false);
  });

  it("7. deletes an existing view by id", () => {
    createSavedSearchView({ name: "View A", query: "Query A" });
    const views = createSavedSearchView({ name: "View B", query: "Query B" });
    const viewA = views.find((v) => v.name === "View A")!;

    const remaining = deleteSavedSearchView(viewA.id);
    expect(remaining.length).toBe(1);
    expect(remaining[0].name).toBe("View B");
    expect(getSavedSearchViews().map((v) => v.name)).toEqual(["View B"]);
  });

  it("8. caps total views at MAX_SAVED_SEARCH_VIEWS (20 items)", () => {
    for (let i = 1; i <= 25; i++) {
      createSavedSearchView({
        name: `View ${i}`,
        query: `Query ${i}`,
      });
    }

    const allViews = getSavedSearchViews();
    expect(allViews.length).toBe(MAX_SAVED_SEARCH_VIEWS);
  });

  it("9. clears all saved views", () => {
    createSavedSearchView({ name: "View 1", query: "Query 1" });
    createSavedSearchView({ name: "View 2", query: "Query 2" });

    clearSavedSearchViews();
    expect(getSavedSearchViews()).toEqual([]);
  });

  it("10. helper function validation contract", () => {
    expect(hasNonDefaultFilters(null)).toBe(false);
    expect(hasNonDefaultFilters({ domain: "all", categoryId: null, tag: null, status: "all" })).toBe(false);
    expect(hasNonDefaultFilters({ domain: "phat-hoc" })).toBe(true);
    expect(hasNonDefaultFilters({ tag: "Pali" })).toBe(true);

    expect(isSavedViewInputValid("", "query")).toBe(false);
    expect(isSavedViewInputValid("name", "")).toBe(false);
    expect(isSavedViewInputValid("name", "", { domain: "huyen-hoc" })).toBe(true);
  });
});
