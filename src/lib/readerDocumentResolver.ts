import { Resource } from '../types';

export interface ActiveReaderDocument {
  documentId: string;
  title: string;
  format: 'pdf' | 'epub' | 'md' | string;
  fileUrl?: string;
  content?: string;
  initialPosition?: string;
}

/**
 * Phân giải documentId và optional locator từ archive citation URI
 * thành đối tượng ActiveReaderDocument chuẩn hóa cho UnifiedResearchReader.
 */
export function resolveArchiveLinkToReaderDoc(
  documentId: string,
  locator?: string,
  resources: Resource[] = []
): ActiveReaderDocument {
  const normalizedDocId = (documentId || '').trim();
  const matchedResource = (resources || []).find(
    (r) => r.id === normalizedDocId || r.filePath === normalizedDocId || r.url === normalizedDocId
  );

  const title =
    matchedResource?.title ||
    normalizedDocId.split('/').pop()?.replace(/\.[^.]+$/, '') ||
    'Tài liệu nghiên cứu';

  const isPdf =
    matchedResource?.type === 'pdf' ||
    Boolean(matchedResource?.filePath?.toLowerCase().endsWith('.pdf')) ||
    normalizedDocId.toLowerCase().endsWith('.pdf');

  const isEpub =
    Boolean(matchedResource?.filePath?.toLowerCase().endsWith('.epub')) ||
    normalizedDocId.toLowerCase().endsWith('.epub');

  const format = isPdf ? 'pdf' : isEpub ? 'epub' : 'md';

  const fileUrl = matchedResource?.filePath
    ? `/api/obsidian/vault/attachment?path=${encodeURIComponent(matchedResource.filePath)}`
    : matchedResource?.url || undefined;

  return {
    documentId: normalizedDocId,
    title,
    format,
    fileUrl,
    initialPosition: locator,
  };
}
