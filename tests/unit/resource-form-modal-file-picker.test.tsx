/**
 * ResourceFormModal Local File Picker UX Test Suite (Phase 1)
 *
 * ADR: ADR-012 (docs/adr/ADR-012-local-file-picker-and-knowledge-bridge.md)
 * Gherkin: docs/gherkin/file-picker-and-knowledge-bridge.feature
 * Component: src/components/modals/ResourceFormModal.tsx
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResourceFormModal } from '../../src/components/modals/ResourceFormModal';

const mockAddResource = vi.fn();
const mockUpdateResource = vi.fn();

const mockTopics = [
  {
    id: 'topic-abhidharma-tong-quan',
    title: 'Abhidharma - Vi Diệu Pháp',
    type: 'phat-hoc' as const,
  },
  {
    id: 'topic-ky-mon-don-giap',
    title: 'Kỳ Môn Độn Giáp',
    type: 'huyen-hoc' as const,
  },
];

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: mockTopics,
    addResource: mockAddResource,
    updateResource: mockUpdateResource,
  }),
}));

describe('ADR-012 Phase 1: ResourceFormModal Local File Picker UX Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Test 1: In local mode, renders file picker trigger button & hidden file input
  // ---------------------------------------------------------------------------
  it('1. In local mode, renders "Duyệt tệp trên máy" button and file input', () => {
    render(<ResourceFormModal isOpen={true} onClose={vi.fn()} />);

    // Switch to local mode
    const localModeButton = screen.getByRole('button', {
      name: /tệp trên máy|file cục bộ|local/i,
    });
    fireEvent.click(localModeButton);

    // Expect a button to browse/choose file
    const browseButton = screen.getByRole('button', {
      name: /duyệt tệp|chọn tệp|chọn file|browse/i,
    });
    expect(browseButton).toBeInTheDocument();

    // Expect an input with type="file"
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 2: Selecting a PDF file via file input automatically fills filePath
  // ---------------------------------------------------------------------------
  it('2. Selecting a file via file input automatically populates filePath without manual typing', () => {
    render(<ResourceFormModal isOpen={true} onClose={vi.fn()} />);

    const localModeButton = screen.getByRole('button', {
      name: /tệp trên máy|file cục bộ|local/i,
    });
    fireEvent.click(localModeButton);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const sampleFile = new File(['dummy-content'], 'Thang-Phap-Tap-Yeu-Luan.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInput, {
      target: { files: [sampleFile] },
    });

    const pathInput = screen.getByPlaceholderText(
      /đường dẫn tệp|\/Users\/|\.pdf|filePath/i,
    ) as HTMLInputElement;
    expect(pathInput.value).toBe('Thang-Phap-Tap-Yeu-Luan.pdf');
  });

  // ---------------------------------------------------------------------------
  // Test 3: Selecting a PDF file auto-detects type as 'pdf' and auto-fills title
  // ---------------------------------------------------------------------------
  it('3. Selecting a PDF file auto-detects type as "pdf" and suggests clean title if empty', () => {
    render(<ResourceFormModal isOpen={true} onClose={vi.fn()} />);

    const localModeButton = screen.getByRole('button', {
      name: /tệp trên máy|file cục bộ|local/i,
    });
    fireEvent.click(localModeButton);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const sampleFile = new File(['content'], 'Kinh-Trung-Bo-Tieu-Bo.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInput, {
      target: { files: [sampleFile] },
    });

    const titleInput = screen.getByPlaceholderText(
      /VD: Thắng Pháp Tập Yếu Luận/i,
    ) as HTMLInputElement;
    expect(titleInput.value).toMatch(/Kinh[- ]Trung[- ]Bo/i);
  });

  // ---------------------------------------------------------------------------
  // Test 4: Selecting audio file (.mp3) auto-detects type as 'audio'
  // ---------------------------------------------------------------------------
  it('4. Selecting audio file (.mp3) auto-detects type as "audio"', () => {
    render(<ResourceFormModal isOpen={true} onClose={vi.fn()} />);

    const localModeButton = screen.getByRole('button', {
      name: /tệp trên máy|file cục bộ|local/i,
    });
    fireEvent.click(localModeButton);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const audioFile = new File(['audio'], 'Phap-Am-Vipassana.mp3', {
      type: 'audio/mpeg',
    });

    fireEvent.change(fileInput, {
      target: { files: [audioFile] },
    });

    const pathInput = screen.getByPlaceholderText(
      /đường dẫn tệp|\/Users\/|\.pdf|filePath/i,
    ) as HTMLInputElement;
    expect(pathInput.value).toBe('Phap-Am-Vipassana.mp3');
  });

  // ---------------------------------------------------------------------------
  // Test 5: Displays browser sandbox/security guidance notice
  // ---------------------------------------------------------------------------
  it('5. Displays browser sandbox/security guidance notice when in local mode', () => {
    render(<ResourceFormModal isOpen={true} onClose={vi.fn()} />);

    const localModeButton = screen.getByRole('button', {
      name: /tệp trên máy|file cục bộ|local/i,
    });
    fireEvent.click(localModeButton);

    const hint = screen.getByText(/bảo mật|tuyệt đối|tiền tố|thư mục/i);
    expect(hint).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 6: Submitting after file pick sends clean metadata with ZERO binary content
  // ---------------------------------------------------------------------------
  it('6. Submitting picked file sends clean metadata with zero binary ingestion', () => {
    const handleClose = vi.fn();
    render(<ResourceFormModal isOpen={true} onClose={handleClose} />);

    const localModeButton = screen.getByRole('button', {
      name: /tệp trên máy|file cục bộ|local/i,
    });
    fireEvent.click(localModeButton);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const sampleFile = new File(['pdf-data'], 'KyMonBiKip.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInput, {
      target: { files: [sampleFile] },
    });

    const submitButton = screen.getByRole('button', {
      name: /thêm tài liệu|lưu tài liệu/i,
    });
    fireEvent.click(submitButton);

    expect(mockAddResource).toHaveBeenCalledTimes(1);
    const submittedPayload = mockAddResource.mock.calls[0][0];

    expect(submittedPayload.filePath).toBe('KyMonBiKip.pdf');
    expect(submittedPayload.url).toBeUndefined();
    expect(submittedPayload.type).toBe('pdf');
    expect(JSON.stringify(submittedPayload)).not.toContain('base64');
    expect(handleClose).toHaveBeenCalled();
  });
});
