import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  MarkdownReaderAdapter,
  extractMarkdownToc,
} from '../../src/components/reader/adapters/MarkdownReaderAdapter';

describe('Phase 18A Wave 2: MarkdownReaderAdapter', () => {
  const sampleMarkdown = `
# Chương 1: Giới thiệu kiến trúc
Đây là đoạn văn bản mở đầu của tài liệu nghiên cứu.

## 1.1 Khái niệm cơ bản
Nội dung khái niệm cơ bản với một số định nghĩa.

### 1.1.1 Chi tiết kỹ thuật
Mô tả chi tiết kỹ thuật hệ thống.

## 1.2 Mô hình dữ liệu
Thông tin mô hình dữ liệu.
`;

  it('renders markdown prose content correctly', () => {
    render(<MarkdownReaderAdapter content={sampleMarkdown} documentId="doc-1" />);

    expect(screen.getByRole('heading', { level: 1, name: /Chương 1: Giới thiệu kiến trúc/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /1.1 Khái niệm cơ bản/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /1.1.1 Chi tiết kỹ thuật/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /1.2 Mô hình dữ liệu/i })).toBeInTheDocument();
    expect(screen.getByText(/Đây là đoạn văn bản mở đầu của tài liệu nghiên cứu/i)).toBeInTheDocument();
  });

  it('extracts table of contents (TOC) items in correct sequential order with stable IDs', () => {
    const toc = extractMarkdownToc(sampleMarkdown);

    expect(toc).toHaveLength(4);
    expect(toc[0]).toEqual({
      id: expect.stringMatching(/chuong-1-gioi-thieu-kien-truc/),
      label: 'Chương 1: Giới thiệu kiến trúc',
      level: 1,
    });
    expect(toc[1]).toEqual({
      id: expect.stringMatching(/1-1-khai-niem-co-ban/),
      label: '1.1 Khái niệm cơ bản',
      level: 2,
    });
    expect(toc[2]).toEqual({
      id: expect.stringMatching(/1-1-1-chi-tiet-ky-thuat/),
      label: '1.1.1 Chi tiết kỹ thuật',
      level: 3,
    });
    expect(toc[3]).toEqual({
      id: expect.stringMatching(/1-2-mo-hinh-du-lieu/),
      label: '1.2 Mô hình dữ liệu',
      level: 2,
    });
  });

  it('notifies parent component with generated TOC items on load', () => {
    const onTocGenerated = vi.fn();
    render(
      <MarkdownReaderAdapter
        content={sampleMarkdown}
        documentId="doc-1"
        onTocGenerated={onTocGenerated}
      />
    );

    expect(onTocGenerated).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Chương 1: Giới thiệu kiến trúc', level: 1 }),
        expect.objectContaining({ label: '1.1 Khái niệm cơ bản', level: 2 }),
      ])
    );
  });

  it('neutralizes dangerous scripts and unsafe HTML attributes', () => {
    const dangerousMarkdown = `
# Tiêu đề an toàn
<script>window.__dangerous_injected = true;</script>
<img src="invalid" onerror="window.__xss_fired=true;" />
<a href="javascript:alert(1)">Liên kết độc hại</a>
`;
    render(<MarkdownReaderAdapter content={dangerousMarkdown} documentId="doc-sec" />);

    expect(screen.getByRole('heading', { level: 1, name: /Tiêu đề an toàn/i })).toBeInTheDocument();
    expect((window as any).__dangerous_injected).toBeUndefined();
    expect((window as any).__xss_fired).toBeUndefined();
    expect(document.querySelector('script')).toBeNull();
  });

  it('renders a clean empty state fallback when content is empty or whitespace', () => {
    render(<MarkdownReaderAdapter content="   " documentId="doc-empty" />);

    expect(screen.getByText(/Không có nội dung để hiển thị/i)).toBeInTheDocument();
  });

  it('handles internal markdown links without breaking', () => {
    const linkedMarkdown = `
# Mục A
Xem thêm tại [Chương 1](#chuong-1) hoặc [Liên kết ngoài](https://example.com/docs).
`;
    render(<MarkdownReaderAdapter content={linkedMarkdown} documentId="doc-link" />);

    const extLink = screen.getByRole('link', { name: /Liên kết ngoài/i });
    expect(extLink).toHaveAttribute('href', 'https://example.com/docs');
    expect(extLink).toHaveAttribute('target', '_blank');
  });
});
