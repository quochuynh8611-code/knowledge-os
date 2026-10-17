import { describe, it, expect } from 'vitest';
import {
  resolveMarkdownAnchor,
  AnchorTarget,
  HeadingSection,
  normalizeAnchorText,
} from '../../src/lib/markdownHighlightAnchor';

describe('Phase R3d-A Lớp A: Pure Utility Markdown Highlight Anchor Engine', () => {
  const sampleDocument = `# Nghiên Cứu Bản Thể Luận

## 1. Bản Thể Học Đại Cương
Bản thể luận là nhánh triết học nghiên cứu về bản chất của sự tồn tại.
Khái niệm bản thể học khởi nguồn từ triết học Hy Lạp cổ đại.

## 2. Nhận Thức Luận So Sánh
Nhận thức luận nghiên cứu về nguồn gốc và giới hạn của tri thức nhân loại.
Trong triết học hiện đại, bản thể luận vẫn giữ vai trò nền tảng.
Tuy nhiên, phương pháp luận cần phải được làm rõ trước khi kết luận.
`;

  it('1. matches unique text accurately without ambiguity', () => {
    const target: AnchorTarget = {
      selectedText: 'nghiên cứu về bản chất của sự tồn tại',
      contextPrefix: 'Bản thể luận là nhánh triết học ',
      contextSuffix: '.',
    };

    const result = resolveMarkdownAnchor(sampleDocument, target);

    expect(result.success).toBe(true);
    expect(result.match).toBeDefined();
    expect(result.match?.matchedText).toBe('nghiên cứu về bản chất của sự tồn tại');
    expect(sampleDocument.slice(result.match!.startIndex, result.match!.endIndex)).toBe(
      'nghiên cứu về bản chất của sự tồn tại'
    );
  });

  it('2. disambiguates repeated phrase using contextPrefix and contextSuffix', () => {
    // 'bản thể luận' appears twice in sampleDocument:
    // 1st: "Bản thể luận là nhánh triết học" (under section 1)
    // 2nd: "Trong triết học hiện đại, bản thể luận vẫn giữ vai trò" (under section 2)

    const targetSecondOccurrence: AnchorTarget = {
      selectedText: 'bản thể luận',
      contextPrefix: 'Trong triết học hiện đại, ',
      contextSuffix: ' vẫn giữ vai trò nền tảng.',
    };

    const result = resolveMarkdownAnchor(sampleDocument, targetSecondOccurrence);

    expect(result.success).toBe(true);
    expect(result.match).toBeDefined();
    expect(result.match?.matchedText).toBe('bản thể luận');

    // Verify it matched the SECOND occurrence, not the first
    const prefixInDoc = sampleDocument.slice(result.match!.startIndex - 26, result.match!.startIndex);
    expect(prefixInDoc).toContain('Trong triết học hiện đại, ');
  });

  it('3. fails closed when repeated phrase has ambiguous context matching multiple candidates', () => {
    const repeatedTextDoc = `
Đoạn thứ nhất: mô hình này rất quan trọng đối với hệ thống dữ liệu lớn.
Đoạn thứ hai: mô hình này rất quan trọng đối với hệ thống dữ liệu lớn.
`;
    const ambiguousTarget: AnchorTarget = {
      selectedText: 'mô hình này',
      contextPrefix: 'Đoạn thứ ',
      contextSuffix: ' rất quan trọng',
    };

    const result = resolveMarkdownAnchor(repeatedTextDoc, ambiguousTarget);

    expect(result.success).toBe(false);
    expect(result.match).toBeUndefined();
    expect(result.failReason).toBe('ambiguous');
  });

  it('4. fails closed when content is stale and cannot be found or verified', () => {
    const staleTarget: AnchorTarget = {
      selectedText: 'nghiên cứu về bản chất của sự tồn tại',
      contextPrefix: 'Đoạn văn này hoàn toàn không tồn tại trong tài liệu ',
      contextSuffix: ' và ngữ cảnh bị sai lệch.',
    };

    const result = resolveMarkdownAnchor(sampleDocument, staleTarget);

    expect(result.success).toBe(false);
    expect(result.match).toBeUndefined();
    expect(['not_found', 'stale_context']).toContain(result.failReason);
  });

  it('5. allows matching legacy excerpt without context if selectedText is strictly unique in document', () => {
    const legacyUniqueTarget: AnchorTarget = {
      selectedText: 'nguồn gốc và giới hạn của tri thức nhân loại',
      contextPrefix: null,
      contextSuffix: null,
    };

    const result = resolveMarkdownAnchor(sampleDocument, legacyUniqueTarget);

    expect(result.success).toBe(true);
    expect(result.match).toBeDefined();
    expect(result.match?.matchedText).toBe('nguồn gốc và giới hạn của tri thức nhân loại');
  });

  it('6. fails closed for legacy excerpt without context when selectedText is repeated in document', () => {
    // 'bản thể luận' appears twice in sampleDocument
    const legacyRepeatedTarget: AnchorTarget = {
      selectedText: 'bản thể luận',
      contextPrefix: null,
      contextSuffix: null,
    };

    const result = resolveMarkdownAnchor(sampleDocument, legacyRepeatedTarget);

    expect(result.success).toBe(false);
    expect(result.match).toBeUndefined();
    expect(result.failReason).toBe('ambiguous');
  });

  it('7. uses headingId as coarse filter when specified', () => {
    const sections: HeadingSection[] = [
      { id: '1-ban-the-hoc-dai-cuong', startIndex: 27, endIndex: 172 },
      { id: '2-nhan-thuc-luan-so-sanh', startIndex: 173, endIndex: sampleDocument.length },
    ];

    // 'bản thể luận' under Section 2
    const targetWithHeading: AnchorTarget = {
      selectedText: 'bản thể luận',
      headingId: '2-nhan-thuc-luan-so-sanh',
      contextPrefix: 'Trong triết học hiện đại, ',
      contextSuffix: ' vẫn giữ vai trò',
    };

    const result = resolveMarkdownAnchor(sampleDocument, targetWithHeading, sections);

    expect(result.success).toBe(true);
    expect(result.match).toBeDefined();
    expect(result.match!.startIndex).toBeGreaterThanOrEqual(173);

    // If headingId does not match the actual section, fail closed
    const targetWithWrongHeading: AnchorTarget = {
      ...targetWithHeading,
      headingId: '1-ban-the-hoc-dai-cuong',
    };

    const mismatchResult = resolveMarkdownAnchor(sampleDocument, targetWithWrongHeading, sections);
    expect(mismatchResult.success).toBe(false);
    expect(mismatchResult.failReason).toBe('heading_mismatch');
  });

  it('8. normalizes irregular whitespace across line breaks and tabs', () => {
    const docWithTabsAndNewlines = "Đây là    câu văn\n\tnghiên cứu  khoa học.";
    const target: AnchorTarget = {
      selectedText: "câu văn nghiên cứu",
      contextPrefix: "Đây là ",
      contextSuffix: " khoa học.",
    };

    const result = resolveMarkdownAnchor(docWithTabsAndNewlines, target);
    expect(result.success).toBe(true);
    expect(result.match).toBeDefined();
  });
});
