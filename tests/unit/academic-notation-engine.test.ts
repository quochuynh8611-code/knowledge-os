import { describe, it, expect } from 'vitest';
import {
  renderAcademicMath,
  parseAcademicNotationTokens,
  hasAcademicNotation,
  extractMermaidBlocks,
} from '../../src/lib/academicNotation';
import { normalizeMarkdownForDisplay } from '../../src/lib/markdownReadability';
import { parseClozeDeletions } from '../../src/lib/clozeParser';

describe('Academic Notation Engine (KaTeX + mhchem + Mermaid)', () => {
  describe('1. Math & LaTeX Rendering with KaTeX', () => {
    it('1.1. renders valid inline math to HTML with katex classes', () => {
      const html = renderAcademicMath('E = mc^2', { displayMode: false });
      expect(html).toContain('class="katex"');
      expect(html).toContain('E');
      expect(html).toContain('m');
      expect(html).toContain('c');
    });

    it('1.2. renders valid block math with katex-display wrapper', () => {
      const html = renderAcademicMath('\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}', {
        displayMode: true,
      });
      expect(html).toContain('class="katex-display"');
      expect(html).toContain('katex');
    });

    it('1.3. provides graceful fallback without throwing when TeX syntax is invalid', () => {
      expect(() => {
        const html = renderAcademicMath('\\frac{1}{', { displayMode: false });
        expect(html).toBeDefined();
        // With throwOnError: false, KaTeX returns an error-colored span or raw string
        expect(html).toContain('katex-error');
      }).not.toThrow();
    });

    it('1.4. sanitizes potential XSS attacks by setting trust: false', () => {
      const maliciousScript = renderAcademicMath('<script>alert(1)</script>', {
        displayMode: false,
      });
      expect(maliciousScript).not.toContain('<script>');

      const maliciousHref = renderAcademicMath('\\href{javascript:alert(1)}{click}', {
        displayMode: false,
      });
      expect(maliciousHref).not.toContain('href="javascript:');
      expect(maliciousHref).not.toContain('<a ');
    });
  });

  describe('2. Chemistry & Physical Units with mhchem', () => {
    it('2.1. renders chemical reactions with reaction arrows via \\ce{...}', () => {
      const html = renderAcademicMath('\\ce{H2SO4 + 2NaOH -> Na2SO4 + 2H2O}', {
        displayMode: false,
      });
      expect(html).toContain('class="katex"');
      expect(html).toContain('H');
      expect(html).toContain('SO');
      expect(html).toContain('Na');
    });

    it('2.2. renders equilibrium arrows and electron charges via \\ce{...}', () => {
      const html = renderAcademicMath('\\ce{Fe^{2+} + e- <=> Fe^{3+}}', {
        displayMode: false,
      });
      expect(html).toContain('class="katex"');
      expect(html).toContain('Fe');
    });

    it('2.3. renders physical quantities and units via \\pu{...}', () => {
      const html = renderAcademicMath('\\pu{123 kJ/mol}', { displayMode: false });
      expect(html).toContain('class="katex"');
      expect(html).toContain('123');
      expect(html).toContain('kJ');
    });
  });

  describe('3. Tokenizer & Currency Collision Guard', () => {
    it('3.1. distinguishes currency signs from valid inline math', () => {
      const text = 'Giá sách từ $50 đến $100 cho 1 bộ';
      const tokens = parseAcademicNotationTokens(text);
      
      // Should NOT parse "$50 đến $100" as math
      const mathTokens = tokens.filter((t) => t.type === 'inline-math');
      expect(mathTokens.length).toBe(0);
      expect(tokens.map((t) => t.raw).join('')).toBe(text);
    });

    it('3.2. supports escaped dollar signs \\$', () => {
      const text = 'Chi phí là \\$100 và công thức là $x = 10$';
      const tokens = parseAcademicNotationTokens(text);

      const mathTokens = tokens.filter((t) => t.type === 'inline-math');
      expect(mathTokens.length).toBe(1);
      expect(mathTokens[0].content).toBe('x = 10');

      const textTokens = tokens.filter((t) => t.type === 'text');
      const renderedText = textTokens.map((t) => t.raw).join('');
      expect(renderedText).toContain('$100');
    });

    it('3.3. extracts block math $$...$$ and inline math $...$', () => {
      const text = 'Đầu câu $a^2 + b^2 = c^2$ giữa câu\n\n$$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$\n\nCuối câu';
      const tokens = parseAcademicNotationTokens(text);

      const inlineMath = tokens.filter((t) => t.type === 'inline-math');
      expect(inlineMath.length).toBe(1);
      expect(inlineMath[0].content).toBe('a^2 + b^2 = c^2');

      const blockMath = tokens.filter((t) => t.type === 'block-math');
      expect(blockMath.length).toBe(1);
      expect(blockMath[0].content).toBe('\\sum_{i=1}^n i = \\frac{n(n+1)}{2}');
    });

    it('3.4. correctly identifies text containing academic notations with hasAcademicNotation', () => {
      expect(hasAcademicNotation('Plain text')).toBe(false);
      expect(hasAcademicNotation('Price is $100')).toBe(false);
      expect(hasAcademicNotation('Math $x = 1$')).toBe(true);
      expect(hasAcademicNotation('Block $$x = 1$$')).toBe(true);
      expect(hasAcademicNotation('```mermaid\ngraph LR\n```')).toBe(true);
    });
  });

  describe('4. Mermaid Diagram Block Extraction', () => {
    it('4.1. extracts mermaid blocks without loading the heavy mermaid library', () => {
      const markdown = 'Trước sơ đồ\n\n```mermaid\ngraph TD\n  A[Bắt đầu] --> B[Kết thúc]\n```\n\nSau sơ đồ';
      const blocks = extractMermaidBlocks(markdown);

      expect(blocks.length).toBe(1);
      expect(blocks[0].content.trim()).toBe('graph TD\n  A[Bắt đầu] --> B[Kết thúc]');
      expect(blocks[0].raw).toContain('```mermaid');

      const tokens = parseAcademicNotationTokens(markdown);
      const mermaidTokens = tokens.filter((t) => t.type === 'mermaid');
      expect(mermaidTokens.length).toBe(1);
      expect(mermaidTokens[0].content.trim()).toBe('graph TD\n  A[Bắt đầu] --> B[Kết thúc]');
    });
  });

  describe('5. Collision Guard 2: normalizeMarkdownForDisplay Protection', () => {
    it('5.1. protects chemical arrows inside $\\ce{...}$ from being converted to Unicode arrows', () => {
      const input = 'Phản ứng: $\\ce{2H2 + O2 -> 2H2O}$ và suy luận thường: A -> B';
      const normalized = normalizeMarkdownForDisplay(input);

      // The arrow inside $\ce{...}$ MUST remain "->"
      expect(normalized).toContain('$\\ce{2H2 + O2 -> 2H2O}$');
      // The arrow outside in prose SHOULD be transformed to "→"
      expect(normalized).toContain('A → B');
    });

    it('5.2. protects equilibrium arrows <=> and <-> inside chemical formulas', () => {
      const input = 'Cân bằng: $\\ce{N2 + 3H2 <=> 2NH3}$ còn logic là p <=> q';
      const normalized = normalizeMarkdownForDisplay(input);

      expect(normalized).toContain('$\\ce{N2 + 3H2 <=> 2NH3}$');
      expect(normalized).toContain('p ⇔ q');
    });

    it('5.3. protects comparison operators <=, >=, +- in LaTeX math from Unicode conversion', () => {
      const input = 'Toán: $x <= 10$ và $y >= 5 \\pm 1$ và prose: điểm số >= 5';
      const normalized = normalizeMarkdownForDisplay(input);

      expect(normalized).toContain('$x <= 10$');
      expect(normalized).toContain('$y >= 5 \\pm 1$');
      expect(normalized).toContain('điểm số ≥ 5');
    });

    it('5.4. protects multiline block math $$...$$ containing arrows and operators', () => {
      const input = '$$\n\\ce{A + B -> C}\n\\text{với } x <= y\n$$\n\nNgoài này a -> b';
      const normalized = normalizeMarkdownForDisplay(input);

      expect(normalized).toContain('$$\n\\ce{A + B -> C}\n\\text{với } x <= y\n$$');
      expect(normalized).toContain('Ngoài này a → b');
    });
  });

  describe('6. Collision Guard 3: Cloze Deletion with LaTeX Braces in clozeParser', () => {
    it('6.1. parses nested LaTeX braces inside cloze without truncation', () => {
      const rawText = 'Công thức phân số: {{c1::$\\frac{1}{1 + \\frac{a}{b}}$::Phân số liên tục}}';
      const clozes = parseClozeDeletions(rawText);

      expect(clozes.length).toBe(1);
      expect(clozes[0].index).toBe(1);
      expect(clozes[0].answer).toBe('$\\frac{1}{1 + \\frac{a}{b}}$');
      expect(clozes[0].hint).toBe('Phân số liên tục');
      expect(clozes[0].prompt).toBe('Công thức phân số: [...]');
    });

    it('6.2. parses quadratic formula cloze with nested square roots and braces', () => {
      const rawText = 'Nghiệm phương trình: {{c1::$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$::Công thức nghiệm}}';
      const clozes = parseClozeDeletions(rawText);

      expect(clozes.length).toBe(1);
      expect(clozes[0].index).toBe(1);
      expect(clozes[0].answer).toBe('$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$');
      expect(clozes[0].hint).toBe('Công thức nghiệm');
      expect(clozes[0].prompt).toBe('Nghiệm phương trình: [...]');
    });

    it('6.3. parses chemical formulas with superscript braces in cloze', () => {
      const rawText = 'Ion sắt: {{c1::$\\ce{Fe^{2+}}$}}';
      const clozes = parseClozeDeletions(rawText);

      expect(clozes.length).toBe(1);
      expect(clozes[0].index).toBe(1);
      expect(clozes[0].answer).toBe('$\\ce{Fe^{2+}}$');
      expect(clozes[0].prompt).toBe('Ion sắt: [...]');
    });

    it('6.4. supports multiple clozes containing LaTeX math alongside regular text', () => {
      const rawText = 'Ta có {{c1::$x = 1$}} và {{c2::$\\frac{a}{b}$::Tỉ số}}';
      const clozes = parseClozeDeletions(rawText);

      expect(clozes.length).toBe(2);
      expect(clozes[0].answer).toBe('$x = 1$');
      expect(clozes[0].prompt).toBe('Ta có [...] và $\\frac{a}{b}$');
      expect(clozes[1].answer).toBe('$\\frac{a}{b}$');
      expect(clozes[1].prompt).toBe('Ta có $x = 1$ và [...]');
    });
  });
});
