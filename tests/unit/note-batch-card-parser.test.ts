import { describe, it, expect } from "vitest";
import {
  parseNoteBulletListToCards,
  MAX_BATCH_LIMIT,
  type ParsedCard,
} from "../../src/lib/noteBatchCardParser";

describe("Phase F6.10: US3 — Note-to-Card Batch Parser Unit Tests", () => {
  it("parses bullet lines '- Front :: Back' into array of basic cards", () => {
    const input = `- Thuật ngữ :: Định nghĩa\n- Khái niệm :: Ý nghĩa`;
    const results: ParsedCard[] = parseNoteBulletListToCards(input);

    expect(results).toEqual([
      { front: "Thuật ngữ", back: "Định nghĩa", type: "basic" },
      { front: "Khái niệm", back: "Ý nghĩa", type: "basic" },
    ]);
  });

  it("parses separator with colon '- Thuật ngữ: Định nghĩa' into front and back", () => {
    const input = `- Thuật ngữ: Định nghĩa\n- Khái niệm: Ý nghĩa`;
    const results: ParsedCard[] = parseNoteBulletListToCards(input);

    expect(results).toEqual([
      { front: "Thuật ngữ", back: "Định nghĩa", type: "basic" },
      { front: "Khái niệm", back: "Ý nghĩa", type: "basic" },
    ]);
  });

  it("parses separator with dash '- Khái niệm - Ý nghĩa' into front and back", () => {
    const input = `- Khái niệm - Ý nghĩa`;
    const results: ParsedCard[] = parseNoteBulletListToCards(input);

    expect(results).toEqual([
      { front: "Khái niệm", back: "Ý nghĩa", type: "basic" },
    ]);
  });

  it("marks card as type: 'cloze' if bullet line contains {{c1::...}} syntax", () => {
    const input = `- {{c1::A}} là gì?`;
    const results: ParsedCard[] = parseNoteBulletListToCards(input);

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("cloze");
    expect(results[0].front).toBe("{{c1::A}} là gì?");
    expect(results[0].back).toBeUndefined();
  });

  it("ignores non-bullet lines, empty lines, and markdown headings (# Title)", () => {
    const input = `
# Title
- Front 1 :: Back 1

Some random paragraph text
## Subtitle
- Another 2 :: Card 2
`;
    const results: ParsedCard[] = parseNoteBulletListToCards(input);

    expect(results).toEqual([
      { front: "Front 1", back: "Back 1", type: "basic" },
      { front: "Another 2", back: "Card 2", type: "basic" },
    ]);
  });

  it("enforces MAX_BATCH_LIMIT = 50, truncating excess items", () => {
    const lines = Array.from({ length: 60 }, (_, i) => `- Câu hỏi ${i + 1} :: Câu trả lời ${i + 1}`).join("\n");
    const results: ParsedCard[] = parseNoteBulletListToCards(lines);

    expect(MAX_BATCH_LIMIT).toBe(50);
    expect(results).toHaveLength(50);
    expect(results[0].front).toBe("Câu hỏi 1");
    expect(results[49].front).toBe("Câu hỏi 50");
  });
});
