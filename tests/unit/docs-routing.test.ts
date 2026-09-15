import { describe, it, expect } from "vitest";
import {
  parseLocationHash,
  buildLocationHash,
  VALID_TABS,
} from "../../src/lib/urlRouting";

describe("Commercial Reset: Library (EPUB) URL Routing & Deep-Linking Contract", () => {
  it("1. includes 'library' tab in VALID_TABS", () => {
    expect(VALID_TABS).toContain("library");
  });

  it("2. parses '#/library' hash into activeTab='library'", () => {
    const result = parseLocationHash("#/library");
    expect(result.activeTab).toBe("library");
    expect(result.selectedTopicId).toBeNull();
  });

  it("3. builds location hash correctly for activeTab='library'", () => {
    const hash = buildLocationHash({
      activeTab: "library",
      selectedTopicId: null,
      searchQuery: "",
      selectedCategoryFilter: null,
      selectedTagFilter: null,
    });
    expect(hash).toBe("#/library");
  });
});
