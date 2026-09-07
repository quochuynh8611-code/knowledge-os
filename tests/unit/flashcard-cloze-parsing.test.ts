import { describe, it, expect } from "vitest";
import { parseClozeDeletions } from "../../src/lib/clozeParser";

describe("Phase F1B: Flashcard Cloze Parsing Test Suite", () => {
  it("Bóc tách thành công 1 cloze deletion đơn giản {{c1::answer}}", () => {
    const text = "Huyệt {{c1::Hợp Cốc}} là nguyên huyệt.";
    const result = parseClozeDeletions(text);

    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(1);
    expect(result[0].answer).toBe("Hợp Cốc");
    expect(result[0].prompt).toBe("Huyệt [...] là nguyên huyệt.");
  });

  it("Bóc tách thành công nhiều cloze deletions độc lập (c1, c2, c3)", () => {
    const text =
      "Huyệt {{c1::Hợp Cốc}} là nguyên huyệt của kinh {{c2::Đại Trường}}, chủ trị vùng {{c3::đầu mặt}}.";
    const result = parseClozeDeletions(text);

    expect(result).toHaveLength(3);

    expect(result[0].index).toBe(1);
    expect(result[0].answer).toBe("Hợp Cốc");
    expect(result[0].prompt).toBe(
      "Huyệt [...] là nguyên huyệt của kinh Đại Trường, chủ trị vùng đầu mặt.",
    );

    expect(result[1].index).toBe(2);
    expect(result[1].answer).toBe("Đại Trường");
    expect(result[1].prompt).toBe(
      "Huyệt Hợp Cốc là nguyên huyệt của kinh [...], chủ trị vùng đầu mặt.",
    );

    expect(result[2].index).toBe(3);
    expect(result[2].answer).toBe("đầu mặt");
    expect(result[2].prompt).toBe(
      "Huyệt Hợp Cốc là nguyên huyệt của kinh Đại Trường, chủ trị vùng [...].",
    );
  });

  it("Hỗ trợ cloze có gợi ý {{c1::answer::hint}}", () => {
    const text = "Kinh lạc: {{c1::Thủ Dương Minh::kinh dương ở tay}}.";
    const result = parseClozeDeletions(text);

    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(1);
    expect(result[0].answer).toBe("Thủ Dương Minh");
    expect(result[0].prompt).toContain("[...]");
  });

  it("Gộp các cloze có cùng chỉ số index (cùng che trên 1 thẻ)", () => {
    const text = "Cặp kinh biểu lý: {{c1::Phế}} và {{c1::Đại Trường}}.";
    const result = parseClozeDeletions(text);

    // Chỉ sinh ra 1 card cloze duy nhất che cả 2 vị trí
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(1);
    expect(result[0].answer).toContain("Phế");
    expect(result[0].answer).toContain("Đại Trường");
    expect(result[0].prompt).toBe("Cặp kinh biểu lý: [...] và [...].");
  });

  it("Trả về mảng rỗng và không sập app khi văn bản không chứa cloze deletion", () => {
    const plainText = "Đây là văn bản ghi chú bình thường không có cloze.";
    const result = parseClozeDeletions(plainText);
    expect(result).toEqual([]);
  });

  it("Xử lý an toàn khi chuỗi rỗng hoặc có cú pháp đóng mở lộn xộn", () => {
    expect(parseClozeDeletions("")).toEqual([]);
    expect(parseClozeDeletions("{{c1::chưa đóng")).toEqual([]);
    expect(parseClozeDeletions("đóng muộn::từ}}")).toEqual([]);
  });
});
