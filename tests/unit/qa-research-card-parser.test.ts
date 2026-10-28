import { describe, it, expect } from "vitest";
import { extractFlashcardsFromResearchResult } from "../../src/lib/noteBatchCardParser";

describe("extractFlashcardsFromResearchResult", () => {
  it("1. Trả về mảng rỗng khi input rỗng hoặc không hợp lệ", () => {
    expect(extractFlashcardsFromResearchResult("")).toEqual([]);
    expect(extractFlashcardsFromResearchResult(null as any)).toEqual([]);
    expect(extractFlashcardsFromResearchResult(undefined as any)).toEqual([]);
  });

  it("2. Trích xuất thành công các cặp Q: và A: cơ bản", () => {
    const text = `
Q: Khổ Thánh Đế là gì?
A: Là chân lý về sự bất toại nguyện và biến dịch của vạn vật.

Q: Tập Thánh Đế là gì?
A: Là chân lý về nguồn gốc của khổ đau, bắt nguồn từ tham ái.
    `;

    const cards = extractFlashcardsFromResearchResult(text);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe("Khổ Thánh Đế là gì?");
    expect(cards[0].back).toBe("Là chân lý về sự bất toại nguyện và biến dịch của vạn vật.");
    expect(cards[0].type).toBe("basic");
    expect(cards[1].front).toBe("Tập Thánh Đế là gì?");
    expect(cards[1].back).toBe("Là chân lý về nguồn gốc của khổ đau, bắt nguồn từ tham ái.");
  });

  it("3. Trích xuất thành công định dạng **Q1:** và **A1:** có in đậm và đánh số", () => {
    const text = `
**Q1: Khái niệm Duyên Khởi là gì?**
**A1: Vạn pháp do duyên sinh, không có tự tính độc lập.**

**Q2: Bát Chánh Đạo gồm những chi phần nào?**
**A2: Chánh kiến, Chánh tư duy, Chánh ngữ, Chánh nghiệp, Chánh mạng, Chánh tinh tấn, Chánh niệm, Chánh định.**
    `;

    const cards = extractFlashcardsFromResearchResult(text);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe("Khái niệm Duyên Khởi là gì?");
    expect(cards[0].back).toBe("Vạn pháp do duyên sinh, không có tự tính độc lập.");
    expect(cards[1].front).toBe("Bát Chánh Đạo gồm những chi phần nào?");
    expect(cards[1].back).toContain("Chánh kiến");
  });

  it("4. Trích xuất thành công tiếng Việt: Câu hỏi / Trả lời", () => {
    const text = `
1. **Câu hỏi:** Nguyên lý vận hành của Spaced Repetition (SRS)?
   **Trả lời:** Tăng dần khoảng cách thời gian giữa các lần ôn tập dựa trên độ quên lãng của não bộ.

2. **Câu hỏi:** Hệ số Ease Factor trong SM-2 có ý nghĩa gì?
   **Trả lời:** Đo lường độ khó tương đối của một thẻ kiến thức, mặc định là 2.5.
    `;

    const cards = extractFlashcardsFromResearchResult(text);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe("Nguyên lý vận hành của Spaced Repetition (SRS)?");
    expect(cards[0].back).toContain("Tăng dần khoảng cách thời gian");
    expect(cards[1].front).toBe("Hệ số Ease Factor trong SM-2 có ý nghĩa gì?");
    expect(cards[1].back).toContain("mặc định là 2.5");
  });

  it("5. Fallback về bullet list parser khi không có Q&A header (Front :: Back)", () => {
    const text = `
Dưới đây là các điểm mấu chốt:
- Tứ Diệu Đế :: Khung lý thuyết căn bản của Phật học
- Bát Chánh Đạo :: Con đường thực hành chuyển hóa
- Thập Nhị Nhân Duyên :: Mối quan hệ tương tức của các pháp
    `;

    const cards = extractFlashcardsFromResearchResult(text);
    expect(cards).toHaveLength(3);
    expect(cards[0].front).toBe("Tứ Diệu Đế");
    expect(cards[0].back).toBe("Khung lý thuyết căn bản của Phật học");
    expect(cards[1].front).toBe("Bát Chánh Đạo");
    expect(cards[1].back).toBe("Con đường thực hành chuyển hóa");
  });

  it("6. Giới hạn tối đa 50 thẻ để tránh quá tải bộ nhớ", () => {
    let hugeText = "";
    for (let i = 1; i <= 70; i++) {
      hugeText += `\nQ${i}: Câu hỏi số ${i}?\nA${i}: Câu trả lời số ${i}.\n`;
    }

    const cards = extractFlashcardsFromResearchResult(hugeText);
    expect(cards.length).toBe(50);
    expect(cards[0].front).toBe("Câu hỏi số 1?");
    expect(cards[49].front).toBe("Câu hỏi số 50?");
  });

  it("7. Trích xuất thành công khối mã CSV chuẩn RFC 4180 (Basic & Cloze, escaped quotes)", () => {
    const text = `
Dưới đây là các thẻ ghi nhớ đã trích xuất:

\`\`\`csv
front,back,type
"Khái niệm ""Spaced Repetition"" là gì?","Kỹ thuật lặp lại ngắt quãng tối ưu hóa việc ghi nhớ","basic"
"{{c1::Solanum procumbens}} là tên khoa học của cây cà gai leo","Cà gai leo","cloze"
\`\`\`
    `;

    const cards = extractFlashcardsFromResearchResult(text);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe('Khái niệm "Spaced Repetition" là gì?');
    expect(cards[0].back).toBe("Kỹ thuật lặp lại ngắt quãng tối ưu hóa việc ghi nhớ");
    expect(cards[0].type).toBe("basic");

    expect(cards[1].front).toBe("{{c1::Solanum procumbens}} là tên khoa học của cây cà gai leo");
    expect(cards[1].back).toBe("Cà gai leo");
    expect(cards[1].type).toBe("cloze");
  });

  it("8. Trích xuất thành công CSV trần không có code fence", () => {
    const text = `front,back,type
"Active Recall là gì?","Chủ động gợi nhớ thông tin từ não bộ thay vì đọc thụ động","basic"
"Hệ số Ease Factor mặc định là bao nhiêu?","2.5","basic"`;

    const cards = extractFlashcardsFromResearchResult(text);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe("Active Recall là gì?");
    expect(cards[0].back).toContain("Chủ động gợi nhớ");
    expect(cards[1].front).toContain("Ease Factor");
    expect(cards[1].back).toBe("2.5");
  });
});
