import { describe, it, expect } from "vitest";
import {
  detectClozeFromSelection,
  type ClozeDetectionResult,
} from "../../src/lib/clozeParser";

describe("Phase F6.10: US2 — Auto-detect Cloze Deletion Syntax from Note Selection", () => {
  it("detectClozeFromSelection() returns hasCloze: true and type: 'cloze' when text contains single cloze {{c1::A}}", () => {
    const input = "This is {{c1::A}} test";
    const result: ClozeDetectionResult = detectClozeFromSelection(input);

    expect(result.hasCloze).toBe(true);
    expect(result.type).toBe("cloze");
    expect(result.clozeCount).toBe(1);
    expect(result.items).toEqual([{ clozeNumber: 1, answer: "A" }]);
  });

  it("detectClozeFromSelection() parses multi-cloze {{c1::A}} and {{c2::B}} with correct cloze count", () => {
    const input = "{{c1::A}} and {{c2::B}}";
    const result: ClozeDetectionResult = detectClozeFromSelection(input);

    expect(result.hasCloze).toBe(true);
    expect(result.type).toBe("cloze");
    expect(result.clozeCount).toBe(2);
    expect(result.items).toEqual([
      { clozeNumber: 1, answer: "A" },
      { clozeNumber: 2, answer: "B" },
    ]);
  });

  it("detectClozeFromSelection() extracts hint when text has {{c1::A::hint}}", () => {
    const input = "{{c1::A::hint}}";
    const result: ClozeDetectionResult = detectClozeFromSelection(input);

    expect(result.hasCloze).toBe(true);
    expect(result.type).toBe("cloze");
    expect(result.clozeCount).toBe(1);
    expect(result.items).toEqual([
      { clozeNumber: 1, answer: "A", hint: "hint" },
    ]);
  });

  it("detectClozeFromSelection() returns hasCloze: false and type: 'basic' when text has no cloze syntax", () => {
    const input = "This is a basic question";
    const result: ClozeDetectionResult = detectClozeFromSelection(input);

    expect(result.hasCloze).toBe(false);
    expect(result.type).toBe("basic");
    expect(result.clozeCount).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("detectClozeFromSelection() safely handles unclosed or malformed braces and defaults to basic", () => {
    const malformed1 = "{{c1::unclosed";
    const malformed2 = "{{c1::A}";

    const res1 = detectClozeFromSelection(malformed1);
    expect(res1.hasCloze).toBe(false);
    expect(res1.type).toBe("basic");
    expect(res1.clozeCount).toBe(0);
    expect(res1.items).toEqual([]);

    const res2 = detectClozeFromSelection(malformed2);
    expect(res2.hasCloze).toBe(false);
    expect(res2.type).toBe("basic");
    expect(res2.clozeCount).toBe(0);
    expect(res2.items).toEqual([]);
  });
});
