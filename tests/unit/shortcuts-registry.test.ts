import { describe, it, expect } from "vitest";
import {
  SHORTCUT_REGISTRY,
  TAB_SHORTCUT_MAP,
  getHelpModalSections,
  getShortcutsByCategory,
} from "../../src/lib/shortcutsRegistry";

describe("Shortcuts Registry (Single Source of Truth)", () => {
  it("mỗi shortcut definition phải có ID duy nhất và hợp lệ", () => {
    const ids = SHORTCUT_REGISTRY.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    for (const s of SHORTCUT_REGISTRY) {
      expect(s.id).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.category).toBeTruthy();
      expect(s.scope).toBeTruthy();
      expect(s.macKeys.length).toBeGreaterThan(0);
      expect(s.winKeys.length).toBeGreaterThan(0);
    }
  });

  it("TAB_SHORTCUT_MAP phải ánh xạ chính xác 7 tab điều hướng", () => {
    expect(TAB_SHORTCUT_MAP).toEqual({
      "1": "dashboard",
      "2": "topics",
      "3": "flashcards",
      "4": "notes",
      "5": "resources",
      "6": "graph",
      "7": "library",
    });
  });

  it("getShortcutsByCategory lọc đúng danh mục", () => {
    const flashcardShortcuts = getShortcutsByCategory("flashcards");
    expect(flashcardShortcuts.length).toBeGreaterThan(0);
    expect(flashcardShortcuts.every((s) => s.category === "flashcards")).toBe(true);

    const mindmapShortcuts = getShortcutsByCategory("mindmap");
    expect(mindmapShortcuts.length).toBeGreaterThan(0);
    expect(mindmapShortcuts.every((s) => s.category === "mindmap")).toBe(true);
  });

  it("getHelpModalSections trả về các section có cấu trúc cho modal theo nền tảng Mac và Windows", () => {
    const macSections = getHelpModalSections(true);
    const winSections = getHelpModalSections(false);

    expect(macSections.length).toBeGreaterThanOrEqual(4);
    expect(winSections.length).toBeGreaterThanOrEqual(4);

    // Kiểm tra category IDs
    const sectionIds = macSections.map((sec) => sec.id);
    expect(sectionIds).toContain("general");
    expect(sectionIds).toContain("navigation");
    expect(sectionIds).toContain("flashcards");
    expect(sectionIds).toContain("mindmap");

    // Mac keys dùng ⌘ hoặc ⌥
    const macCmdK = macSections
      .find((s) => s.id === "general")
      ?.items.find((item) => item.id === "cmd-palette");
    expect(macCmdK?.keys).toEqual(["⌘", "K"]);

    // Windows keys dùng Ctrl hoặc Alt
    const winCmdK = winSections
      .find((s) => s.id === "general")
      ?.items.find((item) => item.id === "cmd-palette");
    expect(winCmdK?.keys).toEqual(["Ctrl", "K"]);
  });

  it("chứa các scoped shortcuts đã xác minh ở runtime (Flashcard review, Mind Map canvas, Quick Capture)", () => {
    const registryIds = new Set(SHORTCUT_REGISTRY.map((s) => s.id));

    // Flashcard review
    expect(registryIds.has("fc-flip")).toBe(true);
    expect(registryIds.has("fc-rate-1-4")).toBe(true);
    expect(registryIds.has("fc-quick-edit")).toBe(true);
    expect(registryIds.has("fc-history")).toBe(true);

    // Mind Map canvas
    expect(registryIds.has("mm-add-child")).toBe(true);
    expect(registryIds.has("mm-add-sibling")).toBe(true);
    expect(registryIds.has("mm-rename")).toBe(true);
    expect(registryIds.has("mm-delete")).toBe(true);
    expect(registryIds.has("mm-select-all")).toBe(true);
    expect(registryIds.has("mm-undo")).toBe(true);
    expect(registryIds.has("mm-redo")).toBe(true);

    // Quick Capture
    expect(registryIds.has("qc-submit")).toBe(true);
  });
});
