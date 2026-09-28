import type { Resource } from '../types';
import type {
  ReaderDocumentFormat,
  FlashcardCitationProvenance,
} from '../types/flashcard';
import { normalizeCitationLocator } from './citationProvenanceValidator';

export type JumpBackResult =
  | {
      status: 'success';
      documentId: string;
      format: ReaderDocumentFormat;
      locator: string;
    }
  | {
      status: 'fallback_document_start';
      documentId: string;
      format: ReaderDocumentFormat;
      originalLocator?: string;
      message: string;
    }
  | {
      status: 'document_not_found';
      documentId: string;
      message: string;
    }
  | {
      status: 'unsupported_format';
      format: string;
      message: string;
    };

/**
 * Resolves a FlashcardCitationProvenance into a concrete JumpBackResult.
 * Handles document existence checks, format verification, and locator normalization with deterministic fallbacks.
 */
export function resolveFlashcardJumpBack(
  provenance: FlashcardCitationProvenance,
  resources: Resource[] = []
): JumpBackResult {
  const validFormats: ReaderDocumentFormat[] = ['epub', 'pdf', 'md'];
  if (!provenance || !validFormats.includes(provenance.format)) {
    return {
      status: 'unsupported_format',
      format: String(provenance?.format || 'unknown'),
      message: 'Định dạng tài liệu không được hỗ trợ',
    };
  }

  // 1. Verify document existence against resources
  const targetDocId = provenance.documentId?.trim();
  const matchedResource = resources.find(
    (r) =>
      r.id === targetDocId ||
      r.url === targetDocId ||
      (r.title && r.title.toLowerCase() === provenance.documentTitle?.toLowerCase())
  );

  if (!matchedResource && targetDocId !== 'res-pdf-memory') {
    // If not found in known resources catalog
    return {
      status: 'document_not_found',
      documentId: provenance.documentId,
      message: 'Không tìm thấy tài liệu nguồn tương ứng',
    };
  }

  // 2. Validate locator
  if (!provenance.locator || !provenance.locator.trim()) {
    return {
      status: 'fallback_document_start',
      documentId: provenance.documentId,
      format: provenance.format,
      message: 'Mở tài liệu ở vị trí đầu trang mặc định',
    };
  }

  const norm = normalizeCitationLocator(provenance.format, provenance.locator);
  if (norm.isValid && norm.canonicalLocator) {
    return {
      status: 'success',
      documentId: provenance.documentId,
      format: provenance.format,
      locator: norm.canonicalLocator,
    };
  }

  // Invalid locator fallback
  return {
    status: 'fallback_document_start',
    documentId: provenance.documentId,
    format: provenance.format,
    originalLocator: provenance.locator,
    message: 'Vị trí trong tài liệu không hợp lệ, mở đầu tài liệu',
  };
}
