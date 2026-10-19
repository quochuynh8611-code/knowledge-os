import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  MarkdownReaderAdapter,
  extractMarkdownToc,
} from '../../src/components/reader/adapters/MarkdownReaderAdapter';
import {
  normalizeMarkdownForDisplay,
  MarkdownReadabilityRenderer,
} from '../../src/lib/markdownReadability';
import { HeadingSlugger } from '../../src/lib/headingSlugger';

describe('Markdown Symbol & Math Typography Rendering (Red Stage)', () => {
  // ── Nhóm A: Markdown symbol rendering ────────────────────────────────────────

  it('should_render_arrow_symbols_correctly in prose text', () => {
    const markdown = `
# Phân Tích Quy Trình
Bước 1 -> Bước 2 --> Bước 3.
Điều kiện A => Kết quả B.
Quan hệ hai chiều: X <-> Y hoặc P <=> Q.
`;
    render(<MarkdownReaderAdapter content={markdown} documentId="doc-arrows" />);

    // Prose text should render readable Unicode arrows
    const body = screen.getByText(/Bước 1/i);
    expect(body.textContent).toMatch(/Bước 1 → Bước 2 → Bước 3/);
    expect(screen.getByText(/Điều kiện A/i).textContent).toMatch(/Điều kiện A ⇒ Kết quả B/);
    expect(screen.getByText(/Quan hệ hai chiều/i).textContent).toMatch(/X ↔ Y|P ⇔ Q/);
  });

  it('should_render_math_symbols_without_glyph_loss and without sanitizer corruption', () => {
    const mathMarkdown = `
# Công Thức Nghiên Cứu
Ta có tổng: ∑ x_i với điều kiện i ∈ [1, n].
Tích phân: ∫ f(x) dx ≈ 3.14159.
Bất đẳng thức: α ≤ β và x ≥ y với a ≠ b và sai số ± 0.05.
Vô cực: lim f(x) = ∞ khi x -> ∞.
Tập hợp: A ∩ B ⊂ C ∪ D.
`;
    render(<MarkdownReaderAdapter content={mathMarkdown} documentId="doc-math" />);

    // None of these mathematical glyphs should be stripped or corrupted
    expect(screen.getByText(/Ta có tổng:/i).textContent).toContain('∑');
    expect(screen.getByText(/Ta có tổng:/i).textContent).toContain('∈');
    expect(screen.getByText(/Tích phân:/i).textContent).toContain('∫');
    expect(screen.getByText(/Tích phân:/i).textContent).toContain('≈');
    expect(screen.getByText(/Bất đẳng thức:/i).textContent).toContain('≤');
    expect(screen.getByText(/Bất đẳng thức:/i).textContent).toContain('≥');
    expect(screen.getByText(/Bất đẳng thức:/i).textContent).toContain('≠');
    expect(screen.getByText(/Bất đẳng thức:/i).textContent).toContain('±');
    expect(screen.getByText(/Vô cực:/i).textContent).toContain('∞');
    expect(screen.getByText(/Tập hợp:/i).textContent).toContain('∩');
    expect(screen.getByText(/Tập hợp:/i).textContent).toContain('∪');
  });

  it('should_preserve_symbol_readability_in_inline_code_and_paragraphs without altering code syntax', () => {
    const mixedMarkdown = `
Đoạn văn có mũi tên: A -> B.
Nhưng trong mã nguồn inline \`const fn = () => a -> b\` và \`x <= y\` phải giữ nguyên.

\`\`\`typescript
const transform = (x: number) => {
  return x <= 10 ? x : x -> 2;
};
\`\`\`
`;
    render(<MarkdownReaderAdapter content={mixedMarkdown} documentId="doc-code-preserve" />);

    // In prose: transformed
    expect(screen.getByText(/Đoạn văn có mũi tên:/i).textContent).toContain('A → B');

    // In inline code: MUST NOT be transformed to '→' or '≤'
    const inlineCodes = document.querySelectorAll('code');
    const inlineCodeTexts = Array.from(inlineCodes).map((el) => el.textContent);
    expect(inlineCodeTexts.some((t) => t?.includes('() => a -> b'))).toBe(true);
    expect(inlineCodeTexts.some((t) => t?.includes('x <= y'))).toBe(true);
  });

  it('should_not_break_heading_anchor_resolution_when_special_symbols_exist', () => {
    const headingMarkdown = `
# Chương 1: A -> B & α ≤ β
Nội dung chương 1.

## Mục 1.1: Tỷ lệ ∑(x_i) ≈ 100%
Nội dung mục 1.1.
`;
    const toc = extractMarkdownToc(headingMarkdown);
    expect(toc).toHaveLength(2);
    expect(toc[0].id).toBeDefined();
    expect(toc[0].id.length).toBeGreaterThan(0);
    expect(toc[1].id).toBeDefined();
    expect(toc[1].id.length).toBeGreaterThan(0);

    render(<MarkdownReaderAdapter content={headingMarkdown} documentId="doc-heading-symbols" />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveAttribute('id', toc[0].id);

    const h2 = screen.getByRole('heading', { level: 2 });
    expect(h2).toHaveAttribute('id', toc[1].id);
  });

  // ── Nhóm B: Markdown typography/readability ──────────────────────────────────

  it('should_apply_readable_rendering_for_mixed_symbols_and_text with proper diacritic normalization', () => {
    // Decomposed Unicode (NFD) string commonly created by macOS keyboard inputs
    const originalText = 'Chương 1: Nghiên cứu Đông Y -> YHCT';
    const nfdText = originalText.normalize('NFD');
    expect(nfdText).not.toBe(originalText); // Confirm it is truly decomposed NFD

    const normalized = normalizeMarkdownForDisplay(nfdText);

    // After display normalization, should be NFC normalized and typography enhanced
    expect(normalized.normalize('NFC')).toBe(normalized);
    expect(normalized).toContain('→');
    expect(normalized).toContain('Nghiên cứu');
  });

  it('should_keep_selection_and_highlight_flow_working_with_special_symbols', () => {
    const onTextSelection = vi.fn();
    const markdown = `
# Tiêu Đề Bài Viết
Khái niệm cốt lõi: Năng lượng E = mc² và quan hệ A → B là trọng tâm.
`;
    render(
      <MarkdownReaderAdapter
        content={markdown}
        documentId="doc-selection"
        onTextSelection={onTextSelection}
      />
    );

    // Verify text with special symbols renders intact inside viewport
    expect(
      screen.getByText(/Năng lượng E = mc² và quan hệ A → B là trọng tâm/i)
    ).toBeInTheDocument();
  });

  // ── Nhóm C: Punctuation boundaries & Operator conversions (Failing Tests) ────

  it('should_convert_arrow_and_equivalence_operators_surrounded_by_brackets_and_punctuation', () => {
    const raw = `
Suy luận: (A=>B) và [C->D] dẫn đến {P<=>Q} và (X<->Y).
Kết thúc câu bằng dấu chấm: A=>B.
Phép gán logic với dấu phẩy: A=>B, C=>D;
`;
    const normalized = normalizeMarkdownForDisplay(raw);

    expect(normalized).toContain('(A⇒B)');
    expect(normalized).toContain('[C→D]');
    expect(normalized).toContain('{P⇔Q}');
    expect(normalized).toContain('(X↔Y)');
    expect(normalized).toContain('A⇒B.');
    expect(normalized).toContain('A⇒B,');
  });

  it('should_convert_math_comparison_operators_in_prose_while_preserving_code', () => {
    const mixed = `
Trong văn xuôi: điều kiện x <= y và biến số a >= b cùng sai số m != n.
Trong biểu thức ngoặc: (x<=y) và (a>=b).
Nhưng trong inline code: \`x <= y\` và \`a >= b\` và \`c != d\` không được đổi.
`;
    const normalized = normalizeMarkdownForDisplay(mixed);

    // In prose text:
    expect(normalized).toContain('x ≤ y');
    expect(normalized).toContain('a ≥ b');
    expect(normalized).toContain('m ≠ n');
    expect(normalized).toContain('(x≤y)');
    expect(normalized).toContain('(a≥b)');

    // In inline code: must be preserved literally
    expect(normalized).toContain('`x <= y`');
    expect(normalized).toContain('`a >= b`');
    expect(normalized).toContain('`c != d`');
  });

  // ── Nhóm D: Semantic Heading Slugger for Math and Arrow Symbols (Failing Tests) ──

  it('should_generate_semantic_slugs_for_headings_with_arrows_and_math_symbols', () => {
    // 1. Arrow heading: '→' or '->' should map to 'to'
    const slugArrow1 = HeadingSlugger.slugify('Chương 1: A -> B');
    expect(slugArrow1).toBe('chuong-1-a-to-b');

    const slugArrow2 = HeadingSlugger.slugify('Chương 1: A → B');
    expect(slugArrow2).toBe('chuong-1-a-to-b');

    // 2. Math sum heading: '∑' should map to 'sum', and underscores normalize to hyphens (x-i)
    const slugSum = HeadingSlugger.slugify('Mục 2: ∑(x_i) = 0');
    expect(slugSum).toBe('muc-2-sum-x-i-0');

    // 3. Math relation heading: '≤' / '<=' should map to 'le', '≥' / '>=' to 'ge', '≠' / '!=' to 'ne'
    const slugRel = HeadingSlugger.slugify('Định lý: α <= β và x >= y và a != b');
    expect(slugRel).toContain('alpha-le-beta');
    expect(slugRel).toContain('x-ge-y');
    expect(slugRel).toContain('a-ne-b');

    // 4. Integral: '∫' should map to 'integral'
    const slugInt = HeadingSlugger.slugify('Tích phân: ∫ f(x)');
    expect(slugInt).toBe('tich-phan-integral-f-x');

    // 5. Standard prose heading without symbols must retain standard slugging
    const slugNormal = HeadingSlugger.slugify('Tổng quan về phương pháp học tập');
    expect(slugNormal).toBe('tong-quan-ve-phuong-phap-hoc-tap');
  });

  it('should_prevent_slug_collision_across_multiple_symbol_heavy_headings', () => {
    const slugger = new HeadingSlugger();

    const h1 = slugger.slug('∑(x)');
    const h2 = slugger.slug('∑(x)');
    const h3 = slugger.slug('α <= β');
    const h4 = slugger.slug('α <= β');

    // Base slug should be semantic ('sum-x' and 'alpha-le-beta'), NOT generic 'heading'
    expect(h1).toBe('sum-x');
    expect(h2).toBe('sum-x-1');
    expect(h3).toBe('alpha-le-beta');
    expect(h4).toBe('alpha-le-beta-1');
  });
});
