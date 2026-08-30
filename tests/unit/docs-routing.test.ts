import { describe, it, expect } from "vitest";
import {
  parseLocationHash,
  buildLocationHash,
  VALID_TABS,
} from "../../src/lib/urlRouting";

describe("Phase P12.3: Docs URL Routing & Deep-Linking Contract", () => {
  it("1. includes 'docs' tab in VALID_TABS", () => {
    expect(VALID_TABS).toContain("docs");
  });

  it("2. parses '#/docs' hash into activeTab='docs'", () => {
    const result = parseLocationHash("#/docs");
    expect(result.activeTab).toBe("docs");
    expect(result.selectedTopicId).toBeNull();
  });

  it("3. builds location hash correctly for activeTab='docs'", () => {
    const hash = buildLocationHash({
      activeTab: "docs",
      selectedTopicId: null,
      searchQuery: "",
      selectedCategoryFilter: null,
      selectedTagFilter: null,
    });
    expect(hash).toBe("#/docs");
  });
});
