import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { NotesManager } from '../../src/components/notes/NotesManager';
import { NoteReaderModal } from '../../src/components/modals/NoteReaderModal';
import { Note, Topic } from '../../src/types';
import {
  toReadablePlainTextPreview,
  MarkdownReadabilityRenderer,
  normalizeMarkdownForDisplay,
} from '../../src/lib/markdownReadability';

describe('Note Readability UX & Focus Reader Enhancements', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. toReadablePlainTextPreview() Cleaner Quality', () => {
    it('loại bỏ triệt để các ký tự markdown: headings, bold/italic, lists, blockquotes, pipes table, markdown links, images, code spans', () => {
      const complexMarkdown = `
# Phân Tích Kinh Tế Vi Mô
> Trích yếu từ tài liệu [Kinh Tế Học Cơ Bản](https://example.com/economics)
| Cung | Cầu | Giá Cả |
|:---|:---|:---|
| Tăng | Giảm | Giảm |
- [x] Đã khảo sát **thị trường cạnh tranh** và *hành vi người tiêu dùng*.
- Mục chi tiết với \`alpha = 0.05\`.
![Biểu đồ minh họa](https://example.com/chart.png)
Tham chiếu đến [[Kỳ Môn Độn Giáp|Kỳ Môn]] trong phương pháp định vị.
`;

      const plainText = toReadablePlainTextPreview(complexMarkdown);

      // Should not contain markdown noise
      expect(plainText).not.toContain('#');
      expect(plainText).not.toContain('**');
      expect(plainText).not.toContain('*hành vi');
      expect(plainText).not.toContain('|');
      expect(plainText).not.toContain('`');
      expect(plainText).not.toContain('[[');
      expect(plainText).not.toContain(']]');
      expect(plainText).not.toContain('https://example.com');
      expect(plainText).not.toContain('![');

      // Should contain clean human-readable prose
      expect(plainText).toContain('Phân Tích Kinh Tế Vi Mô');
      expect(plainText).toContain('Trích yếu từ tài liệu Kinh Tế Học Cơ Bản');
      expect(plainText).toContain('Cung Cầu Giá Cả');
      expect(plainText).toContain('thị trường cạnh tranh và hành vi người tiêu dùng');
      expect(plainText).toContain('alpha = 0.05');
      expect(plainText).toContain('Tham chiếu đến Kỳ Môn trong phương pháp định vị');
    });

    it('chuẩn hóa khoảng trắng gọn gàng, không để dòng trống thừa hay khoảng trắng liên tiếp', () => {
      const messySpacing = '  Đoạn 1   \n\n\n\n   Đoạn 2   với    nhiều   khoảng   trắng   \n\n';
      const cleaned = toReadablePlainTextPreview(messySpacing);
      expect(cleaned).toBe('Đoạn 1 Đoạn 2 với nhiều khoảng trắng');
    });
  });

  describe('2. MarkdownReadabilityRenderer Focus Reader Presentation', () => {
    const mockTopics: Topic[] = [
      {
        id: 'top-kinh-te-1',
        title: 'Kinh Tế & Tài Chính',
        slug: 'kinh-te-tai-chinh',
        categoryId: 'cat-root-kinh-te-tai-chinh',
        type: 'kinh-te-tai-chinh',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
        description: 'Mô tả kinh tế',
        content: 'Nội dung kinh tế',
        tags: [],
        links: [],
        studyProgress: {
          topicId: 'top-kinh-te-1',
          status: 'in_progress',
          progress: 50,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
      },
    ];

    it('render bảng Markdown thành table có thead, tbody sạch đẹp', () => {
      const tableContent = `
| Nhân Tố | Xu Hướng |
| --- | --- |
| Lãi suất | Giảm |
| Tín dụng | Mở rộng |
`;
      const { container } = render(
        <MarkdownReadabilityRenderer content={tableContent} topics={mockTopics} />
      );

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
      expect(screen.getByText('Nhân Tố')).toBeInTheDocument();
      expect(screen.getByText('Xu Hướng')).toBeInTheDocument();
      expect(screen.getByText('Lãi suất')).toBeInTheDocument();
      expect(screen.getByText('Mở rộng')).toBeInTheDocument();
    });

    it('render Markdown link [text](url) thành thẻ <a> có linkText và href', () => {
      const linkContent = 'Truy cập [Báo Cáo Nghiên Cứu](https://research.org/report) để xem chi tiết.';
      const { container } = render(
        <MarkdownReadabilityRenderer content={linkContent} topics={mockTopics} />
      );

      const linkEl = container.querySelector('a');
      expect(linkEl).toBeInTheDocument();
      expect(linkEl).toHaveAttribute('href', 'https://research.org/report');
      expect(screen.getByText('Báo Cáo Nghiên Cứu')).toBeInTheDocument();
      expect(container.textContent).not.toContain('](');
    });

    it('render Task list với check status trực quan', () => {
      const taskContent = `
- [x] Nhiệm vụ đã hoàn tất
- [ ] Nhiệm vụ đang chờ
`;
      const { container } = render(
        <MarkdownReadabilityRenderer content={taskContent} topics={mockTopics} />
      );

      expect(screen.getByText('Nhiệm vụ đã hoàn tất')).toBeInTheDocument();
      expect(screen.getByText('Nhiệm vụ đang chờ')).toBeInTheDocument();
      // Should not contain raw markdown checkbox symbols
      expect(container.textContent).not.toContain('- [x]');
      expect(container.textContent).not.toContain('- [ ]');
    });

    it('áp dụng typography phân cấp rõ ràng (H1, H2, H3) và line-height thoáng đãng (sm:leading-7)', () => {
      const longResearchContent = `
# Phân Tích Cấu Trúc Luận Điểm
Đây là đoạn phân tích thứ nhất với nội dung nghiên cứu chuyên sâu, cần cỡ chữ và khoảng cách dòng dễ đọc.

## Dữ Liệu Thực Nghiệm
Đoạn phân tích thứ hai trình bày các phát hiện và số liệu cụ thể.

> Trích dẫn tri thức cốt lõi với nhịp thị giác thanh lịch và viền nổi bật.

### Tiểu Tiết Kỹ Thuật
- Ý mục danh sách 1
- Ý mục danh sách 2
`;
      const { container } = render(
        <MarkdownReadabilityRenderer content={longResearchContent} topics={mockTopics} />
      );

      // Check headings hierarchy
      const h1 = container.querySelector('h1[data-heading="1"]');
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveClass('font-serif-title');

      const h2 = container.querySelector('h2[data-heading="2"]');
      expect(h2).toBeInTheDocument();
      expect(h2).toHaveClass('font-serif-title');

      const h3 = container.querySelector('h3[data-heading="3"]');
      expect(h3).toBeInTheDocument();
      expect(h3).toHaveClass('font-serif-title');

      // Check blockquote
      const quote = container.querySelector('blockquote[data-blockquote="true"]');
      expect(quote).toBeInTheDocument();
      expect(quote).toHaveClass('border-amber-500');

      // Check container spacing class has breathing room
      const rootDiv = container.firstElementChild;
      expect(rootDiv?.className).toContain('space-y-3.5');

      // Check paragraph text has comfortable reading classes
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs.length).toBeGreaterThan(0);
      paragraphs.forEach((p) => {
        expect(p.className).toContain('leading-relaxed');
      });
    });
  });

  describe('3. NotesManager Card Interaction & CTA Clarity', () => {
    const mockNote: Note = {
      id: 'note-sample-123',
      topicId: 'top-1',
      topicTitle: 'Kinh Tế Vĩ Mô',
      title: 'Khảo sát Chu Kỳ Kinh Tế & Chính Sách Tiền Tệ',
      content: '# Khảo Sát Tổng Quan\n**Lạm phát** và *lãi suất* có quan hệ mật thiết.\n- [x] Đã phân tích quý 1.\nTham khảo [[Kinh Tế & Tài Chính]].',
      type: 'insight',
      tags: ['vi-mo', 'tien-te'],
      createdAt: '2026-08-15T08:00:00Z',
      updatedAt: '2026-08-15T08:00:00Z',
      isPrivate: false,
    };

    it('hiển thị preview plain-text sạch trên card và có nút CTA "Đọc tiếp" rõ ràng', () => {
      const TestContainer = () => {
        const { importAllDataJSON } = useData();
        return (
          <div>
            <button
              onClick={() => {
                importAllDataJSON(
                  JSON.stringify({
                    categories: [],
                    topics: [{ id: 'top-1', title: 'Kinh Tế Vĩ Mô', slug: 'kinh-te-vi-mo', categoryId: 'cat-1', type: 'kinh-te', createdAt: '2026-08-01', updatedAt: '2026-08-01', studyProgress: { topicId: 'top-1', status: 'not_started', progress: 0 } }],
                    notes: [mockNote],
                    resources: [],
                    tags: [],
                    links: [],
                  })
                );
              }}
            >
              Seed
            </button>
            <NotesManager />
          </div>
        );
      };

      render(
        <DataProvider>
          <TestContainer />
        </DataProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Seed' }));

      // Note Title
      expect(screen.getByText('Khảo sát Chu Kỳ Kinh Tế & Chính Sách Tiền Tệ')).toBeInTheDocument();

      // Clean preview without # or **
      expect(screen.getByText(/Khảo Sát Tổng Quan Lạm phát và lãi suất có quan hệ mật thiết/i)).toBeInTheDocument();

      // CTA Button "Đọc tiếp"
      const readBtn = screen.getByRole('button', { name: /Đọc tiếp ghi chú Khảo sát Chu Kỳ Kinh Tế/i });
      expect(readBtn).toBeInTheDocument();
      expect(readBtn).toHaveTextContent('Đọc tiếp');

      // Click "Đọc tiếp" opens NoteReaderModal
      fireEvent.click(readBtn);

      const modal = screen.getByRole('dialog', { name: 'Chi tiết ghi chú' });
      expect(modal).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Khảo sát Chu Kỳ Kinh Tế & Chính Sách Tiền Tệ' })).toBeInTheDocument();
    });

    it('bảo toàn các nút hành động Sửa và Xóa, không xung đột với nút Đọc tiếp', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      const TestContainer = () => {
        const { importAllDataJSON } = useData();
        return (
          <div>
            <button
              onClick={() => {
                importAllDataJSON(
                  JSON.stringify({
                    categories: [],
                    topics: [],
                    notes: [mockNote],
                    resources: [],
                    tags: [],
                    links: [],
                  })
                );
              }}
            >
              Seed
            </button>
            <NotesManager />
          </div>
        );
      };

      render(
        <DataProvider>
          <TestContainer />
        </DataProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Seed' }));

      // Edit button opens edit modal
      const editBtn = screen.getByRole('button', { name: 'Sửa ghi chú' });
      expect(editBtn).toBeInTheDocument();
      fireEvent.click(editBtn);
      expect(screen.getByText('Chỉnh Sửa Ghi Chú')).toBeInTheDocument();

      // Close edit modal
      fireEvent.click(screen.getByRole('button', { name: /Hủy/i }));

      // Delete button triggers deletion
      const deleteBtn = screen.getByRole('button', { name: 'Xóa ghi chú' });
      expect(deleteBtn).toBeInTheDocument();
      fireEvent.click(deleteBtn);
      expect(confirmSpy).toHaveBeenCalledWith('Xóa ghi chú này?');

      confirmSpy.mockRestore();
    });
  });

  describe('4. NoteReaderModal Focus Reader Experience', () => {
    const mockNoteWithSource: Note = {
      id: 'note-focus-modal-1',
      topicId: 'top-1',
      topicTitle: 'Kinh Tế Vĩ Mô',
      title: 'Phân Tích Báo Cáo Tài Chính',
      content: '# Tổng Hợp\n> Luận điểm đầu tư bền vững.\n- Mục tiêu tăng trưởng 15%.\nTham chiếu [[Kỳ Môn Độn Giáp]].',
      type: 'insight',
      sourcePath: '/Users/research/Documents/finance-report.md',
      tags: ['tai-chinh', 'bao-cao'],
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
      isPrivate: false,
    };

    it('render khung đọc rộng (max-w-4xl), hiển thị sourcePath với nút chép, nút sao chép nội dung và nút đóng', () => {
      const handleClose = vi.fn();
      const handleEdit = vi.fn();

      render(
        <DataProvider>
          <NoteReaderModal
            isOpen={true}
            note={mockNoteWithSource}
            onClose={handleClose}
            onEdit={handleEdit}
          />
        </DataProvider>
      );

      const dialog = screen.getByRole('dialog', { name: 'Chi tiết ghi chú' });
      expect(dialog).toBeInTheDocument();
      expect(dialog.querySelector('.max-w-4xl')).toBeInTheDocument();

      // Title
      expect(screen.getByText('Phân Tích Báo Cáo Tài Chính')).toBeInTheDocument();

      // Source path
      expect(screen.getByText('/Users/research/Documents/finance-report.md')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Chép path/i })).toBeInTheDocument();

      // Copy content button
      expect(screen.getByRole('button', { name: /Sao chép nội dung/i })).toBeInTheDocument();

      // Edit action
      const editButtons = screen.getAllByRole('button', { name: /Chỉnh sửa/i });
      expect(editButtons.length).toBeGreaterThan(0);
      fireEvent.click(editButtons[0]);
      expect(handleEdit).toHaveBeenCalledWith(mockNoteWithSource);

      // Close action
      const closeButtons = screen.getAllByRole('button', { name: /Đóng/i });
      expect(closeButtons.length).toBeGreaterThan(0);
      fireEvent.click(closeButtons[0]);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('5. Feature: Hiển thị ghi chú OCR an toàn (normalizeMarkdownForDisplay)', () => {
    describe('5.1 Positive OCR Cases (Phục hồi ranh giới từ & cấu trúc)', () => {
      it('1. Phục hồi "Đông yViệc" -> "Đông y Việc"', () => {
        const raw = 'trong Đông yViệc chuyển đổi từ tư duy';
        const inputCopy = raw;
        const normalized = normalizeMarkdownForDisplay(raw);
        expect(normalized).toBe('trong Đông y Việc chuyển đổi từ tư duy');
        expect(raw).toBe(inputCopy);
      });

      it('2. Phục hồi "CÁ NHÂNSự phức tạp" -> "CÁ NHÂN Sự phức tạp"', () => {
        const raw = 'TRI THỨC CÁ NHÂNSự phức tạp của YHCT';
        const inputCopy = raw;
        const normalized = normalizeMarkdownForDisplay(raw);
        expect(normalized).toBe('TRI THỨC CÁ NHÂN Sự phức tạp của YHCT');
        expect(raw).toBe(inputCopy);
      });

      it('3. Phục hồi "nâng caoViệc" -> "nâng cao Việc"', () => {
        const raw = 'nhận thức nâng caoViệc tiếp thu tri thức';
        const inputCopy = raw;
        const normalized = normalizeMarkdownForDisplay(raw);
        expect(normalized).toBe('nhận thức nâng cao Việc tiếp thu tri thức');
        expect(raw).toBe(inputCopy);
      });

      it('4. Phục hồi "thứcỨng" -> "thức Ứng"', () => {
        const raw = 'thần kinh / Nhận thứcỨng dụng cụ thể trong Đông y';
        const inputCopy = raw;
        const normalized = normalizeMarkdownForDisplay(raw);
        expect(normalized).toBe('thần kinh / Nhận thức Ứng dụng cụ thể trong Đông y');
        expect(raw).toBe(inputCopy);
      });

      it('5. Phục hồi "yActive" -> "y Active"', () => {
        const raw = 'thực hành Đông yActive Recall là kỹ thuật then chốt';
        const inputCopy = raw;
        const normalized = normalizeMarkdownForDisplay(raw);
        expect(normalized).toBe('thực hành Đông y Active Recall là kỹ thuật then chốt');
        expect(raw).toBe(inputCopy);
      });

      it('6. Phục hồi "RecallTăng" / "RecallTổng" -> "Recall Tăng" / "Recall Tổng"', () => {
        const raw = 'Active RecallTăng cường mật độ kết nối và RecallTổng quát';
        const inputCopy = raw;
        const normalized = normalizeMarkdownForDisplay(raw);
        expect(normalized).toBe('Active Recall Tăng cường mật độ kết nối và Recall Tổng quát');
        expect(raw).toBe(inputCopy);
      });

      it('7. Phục hồi "RepetitionTối" / "RepetitionTỉ" -> "Repetition Tối" / "Repetition Tỉ"', () => {
        const raw = 'Spaced RepetitionTối ưu hóa đường cong quên và RepetitionTỉ lệ';
        const inputCopy = raw;
        const normalized = normalizeMarkdownForDisplay(raw);
        expect(normalized).toBe('Spaced Repetition Tối ưu hóa đường cong quên và Repetition Tỉ lệ');
        expect(raw).toBe(inputCopy);
      });

      it('8. Phục hồi "TechniqueChuyển" -> "Technique Chuyển"', () => {
        const raw = 'Feynman TechniqueChuyển đổi tri thức ẩn thành hiển';
        const inputCopy = raw;
        const normalized = normalizeMarkdownForDisplay(raw);
        expect(normalized).toBe('Feynman Technique Chuyển đổi tri thức ẩn thành hiển');
        expect(raw).toBe(inputCopy);
      });

      it('9. Phục hồi "rõ ràngDiễn" / "rộngDẫn" -> "rõ ràng Diễn" / "rộng Dẫn"', () => {
        const raw = 'hiển thị rõ ràngDiễn giải chi tiết và mở rộngDẫn xuất';
        const inputCopy = raw;
        const normalized = normalizeMarkdownForDisplay(raw);
        expect(normalized).toBe('hiển thị rõ ràng Diễn giải chi tiết và mở rộng Dẫn xuất');
        expect(raw).toBe(inputCopy);
      });

      it('10. Tách section marker "đông y.1. Phương pháp" và "học.1.1. Ứng dụng"', () => {
        const raw = 'ghi nhớ trong Đông y.1. Phương pháp luận thần kinh học.1.1. Ứng dụng nhận thức';
        const inputCopy = raw;
        const normalized = normalizeMarkdownForDisplay(raw);
        expect(normalized).toContain('\n1. Phương pháp luận');
        expect(normalized).toContain('\n1.1. Ứng dụng');
        expect(raw).toBe(inputCopy);
      });
    });

    describe('5.2 Negative Protection Cases (Bảo vệ tuyệt đối mã định danh & thương hiệu)', () => {
      it('11. Bảo vệ "iPhone" không bị tách', () => {
        const raw = 'Sử dụng ứng dụng trên thiết bị iPhone 15 Pro Max.';
        const inputCopy = raw;
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
        expect(raw).toBe(inputCopy);
      });

      it('12. Bảo vệ "eBay" không bị tách', () => {
        const raw = 'Mua sắm sách khảo cứu trên eBay quốc tế.';
        const inputCopy = raw;
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
        expect(raw).toBe(inputCopy);
      });

      it('13. Bảo vệ "camelCaseVariable" không bị tách', () => {
        const raw = 'Khai báo biến camelCaseVariable trong mã nguồn.';
        const inputCopy = raw;
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
        expect(raw).toBe(inputCopy);
      });

      it('14. Bảo vệ "NoteReaderModal" không bị tách', () => {
        const raw = 'Component NoteReaderModal chịu trách nhiệm hiển thị.';
        const inputCopy = raw;
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
        expect(raw).toBe(inputCopy);
      });

      it('15. Bảo vệ "HTTPServer" không bị tách', () => {
        const raw = 'Cấu hình HTTPServer xử lý request đồng thời.';
        const inputCopy = raw;
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
        expect(raw).toBe(inputCopy);
      });

      it('16. Bảo vệ "v1.2.3" không bị tách', () => {
        const raw = 'Phiên bản release v1.2.3 ổn định.';
        const inputCopy = raw;
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
        expect(raw).toBe(inputCopy);
      });

      it('17. Bảo vệ "model-1.0.0-beta" không bị tách', () => {
        const raw = 'Deploy model model-1.0.0-beta lên cluster.';
        const inputCopy = raw;
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
        expect(raw).toBe(inputCopy);
      });

      it('18. Bảo vệ "192.168.1.1" không bị tách', () => {
        const raw = 'Truy cập router tại địa chỉ IP 192.168.1.1 trong mạng LAN.';
        const inputCopy = raw;
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
        expect(raw).toBe(inputCopy);
      });

      it('19. Bảo vệ "3.14159" không bị tách', () => {
        const raw = 'Số Pi xấp xỉ bằng 3.14159 trong toán học.';
        const inputCopy = raw;
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
        expect(raw).toBe(inputCopy);
      });

      it('20. Bảo vệ "user@example.com" không bị tách', () => {
        const raw = 'Gửi phản hồi về hòm thư user@example.com để được trợ giúp.';
        const inputCopy = raw;
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
        expect(raw).toBe(inputCopy);
      });

      // Hardening Negative Regression Tests (18 cases - no false positives)
      const hardeningCases = [
        'OpenAIResearch',
        'YouTubeMusic',
        'MacBookPro',
        'NotionAI',
        'processPayment',
        'userProfile',
        'isLoading',
        'getUserName',
        'KnowledgeGraph',
        'ResearchNote',
        'MarkdownRenderer',
        'AIResearch',
        'LLMModel',
        'PDFReader',
        'mRNASeq',
        'CRISPRCas9',
        'eGFR',
        'pHValue',
      ];

      hardeningCases.forEach((term, idx) => {
        it(`Hardening ${idx + 1}: Chuỗi "${term}" giữ nguyên tuyệt đối (negative protection / no false positive)`, () => {
          // 1. Standalone term assertion
          const rawTerm = term;
          const rawTermCopy = `${rawTerm}`;
          const outputTerm = normalizeMarkdownForDisplay(rawTerm);
          expect(outputTerm).toBe(rawTerm);
          expect(rawTerm).toBe(rawTermCopy);

          // 2. In-sentence context assertion
          const rawSentence = `Tài liệu kỹ thuật chứa identifier ${term} cần bảo toàn.`;
          const rawSentenceCopy = `${rawSentence}`;
          const outputSentence = normalizeMarkdownForDisplay(rawSentence);
          expect(outputSentence).toBe(rawSentence);
          expect(rawSentence).toBe(rawSentenceCopy);
        });
      });
    });

    describe('5.3 Markdown Structure Preservation', () => {
      it('21. Bảo toàn Markdown Headings chuẩn', () => {
        const raw = '# Tiêu Đề Cấp 1\n## Tiêu Đề Cấp 2\n### Tiêu Đề Cấp 3';
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
      });

      it('22. Bảo toàn Ordered List chuẩn', () => {
        const raw = '1. Mục thứ nhất\n2. Mục thứ hai\n3. Mục thứ ba';
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
      });

      it('23. Bảo toàn Blockquote chuẩn', () => {
        const raw = '> Trích dẫn lời Phật dạy trong Kinh Di Giáo.';
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
      });

      it('24. Bảo toàn Inline Code', () => {
        const raw = 'Đoạn văn với `const app = HTTPServer(iPhone);` trong nội dung.';
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
      });

      it('25. Bảo toàn Fenced Code Block', () => {
        const raw = '```typescript\nfunction render(note: NoteReaderModal) {\n  return note.id;\n}\n```';
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
      });
    });

    describe('5.4 Additional Safety Scenarios', () => {
      it('Phục hồi dấu cách sau dấu chấm câu dính chữ: "bệnh.Để" -> "bệnh. Để"', () => {
        const raw = 'Trị bệnh.Để đạt hiệu quả cao cần dùng thuốc.';
        expect(normalizeMarkdownForDisplay(raw)).toBe('Trị bệnh. Để đạt hiệu quả cao cần dùng thuốc.');
      });

      it('Phục hồi dấu cách sau dấu hai chấm: "chủ động:Truy xuất" -> "chủ động: Truy xuất"', () => {
        const raw = 'Tự chủ động:Truy xuất nguồn dữ liệu.';
        expect(normalizeMarkdownForDisplay(raw)).toBe('Tự chủ động: Truy xuất nguồn dữ liệu.');
      });

      it('Không tự ý chèn newline nếu chỉ là đoạn văn dài thuần túy không có section marker', () => {
        const raw = 'Văn bản một dòng dài liên tục từ tài liệu scan OCR không có dấu hiệu phân đoạn xuống dòng rõ ràng.';
        expect(normalizeMarkdownForDisplay(raw)).toBe(raw);
      });

      it('Không phá URLs, endpoints và technical query parameters', () => {
        const raw = 'API: https://example.com/api/v1:Create?key=value&tag=YHCT';
        expect(normalizeMarkdownForDisplay(raw)).toContain('https://example.com/api/v1:Create?key=value&tag=YHCT');
      });
    });
  });
});
