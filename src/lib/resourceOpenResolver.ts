import { Resource } from '../types';

export type ResourceTargetType =
  | 'web_url'
  | 'custom_scheme'
  | 'local_path'
  | 'unsupported_target'
  | 'none';

export type ResourceSourceField = 'openTarget' | 'url' | 'filePath' | 'none';

export interface ResourceOpenResolution {
  targetType: ResourceTargetType;
  targetUrl?: string;
  canOpenDirectly: boolean;
  sourceField: ResourceSourceField;
  label: string;
  description: string;
}

/**
 * Phân loại định dạng của một chuỗi target và xác định tính an toàn khi mở trong browser.
 */
export function classifyTargetString(target: string): {
  targetType: ResourceTargetType;
  canOpenDirectly: boolean;
} {
  const trimmed = target.trim();
  if (!trimmed) {
    return { targetType: 'none', canOpenDirectly: false };
  }

  // 1. Unsafe / Dangerous schemes
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return { targetType: 'unsupported_target', canOpenDirectly: false };
  }

  // 2. Standard Web URL (HTTP / HTTPS)
  if (/^https?:\/\//i.test(trimmed)) {
    return { targetType: 'web_url', canOpenDirectly: true };
  }

  // 3. Supported custom app schemes (obsidian://, notion://, zotero://, mailto://, etc.)
  if (/^[a-zA-Z0-9_-]+:\/\//i.test(trimmed) && !lower.startsWith('file://')) {
    return { targetType: 'custom_scheme', canOpenDirectly: true };
  }

  // 4. File protocol or local path (/Users/..., C:\..., D:\..., relative path)
  if (
    lower.startsWith('file://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('\\') ||
    /^[a-zA-Z]:[/\\]/.test(trimmed) ||
    /\.(pdf|epub|mobi|docx?|mp3|mp4|mkv|wav|txt|md)$/i.test(trimmed)
  ) {
    return { targetType: 'local_path', canOpenDirectly: false };
  }

  // 5. General fallback for unsupported or ambiguous strings
  return { targetType: 'unsupported_target', canOpenDirectly: false };
}

/**
 * Giải quyết đích mở tối ưu cho một Resource theo thứ tự fallback:
 * 1. openTarget
 * 2. url
 * 3. filePath
 * 4. none
 */
export function resolveResourceOpenTarget(
  resource: Resource | null | undefined
): ResourceOpenResolution {
  if (!resource) {
    return {
      targetType: 'none',
      canOpenDirectly: false,
      sourceField: 'none',
      label: 'Chưa có đích mở',
      description: 'Tài liệu chưa được cấu hình nguồn truy cập.',
    };
  }

  // 1. Kiểm tra openTarget ưu tiên
  if (resource.openTarget && resource.openTarget.trim()) {
    const rawTarget = resource.openTarget.trim();
    const { targetType, canOpenDirectly } = classifyTargetString(rawTarget);

    let label = 'Đích mở nội dung (openTarget)';
    let description = 'Mở nội dung theo đích người dùng thiết lập riêng.';
    if (targetType === 'custom_scheme') {
      label = 'Ứng dụng ngoài (openTarget)';
      description = 'Kích hoạt ứng dụng ngoài tương ứng qua liên kết tùy chỉnh.';
    } else if (targetType === 'local_path') {
      label = 'Tệp cục bộ (openTarget)';
      description = 'Đích mở là tệp cục bộ trên máy; cần sao chép đường dẫn để mở qua hệ điều hành.';
    } else if (targetType === 'unsupported_target') {
      label = 'Không hỗ trợ (openTarget)';
      description = 'Đích mở không thuộc định dạng được hỗ trợ mở an toàn trong trình duyệt.';
    }

    return {
      targetType,
      targetUrl: rawTarget,
      canOpenDirectly,
      sourceField: 'openTarget',
      label,
      description,
    };
  }

  // 2. Fallback sang url tham chiếu
  if (resource.url && resource.url.trim()) {
    const rawUrl = resource.url.trim();
    const { targetType, canOpenDirectly } = classifyTargetString(rawUrl);

    let label = 'Liên kết tham chiếu (URL)';
    let description = 'Mở trang web nguồn tài liệu tham khảo.';
    if (targetType === 'local_path') {
      label = 'Tệp cục bộ (URL)';
      description = 'URL trỏ vào tệp cục bộ trên máy; cần sao chép đường dẫn để mở.';
    } else if (targetType === 'unsupported_target') {
      label = 'Không hỗ trợ (URL)';
      description = 'Liên kết không thuộc định dạng được hỗ trợ mở an toàn.';
    }

    return {
      targetType,
      targetUrl: rawUrl,
      canOpenDirectly,
      sourceField: 'url',
      label,
      description,
    };
  }

  // 3. Fallback sang filePath cục bộ
  if (resource.filePath && resource.filePath.trim()) {
    const rawPath = resource.filePath.trim();
    return {
      targetType: 'local_path',
      targetUrl: rawPath,
      canOpenDirectly: false,
      sourceField: 'filePath',
      label: 'Tệp cục bộ (filePath)',
      description: 'Tài liệu được lưu trữ trên máy tính; sao chép đường dẫn để mở qua phần mềm hệ điều hành.',
    };
  }

  // 4. Không có bất kỳ nguồn nào
  return {
    targetType: 'none',
    canOpenDirectly: false,
    sourceField: 'none',
    label: 'Chưa có đích mở',
    description: 'Tài liệu chưa được thiết lập liên kết hoặc đường dẫn tệp.',
  };
}

/**
 * Trả về trạng thái tóm tắt ngắn gọn của việc mở tài liệu.
 */
export function getResourceOpenState(resource: Resource | null | undefined): ResourceTargetType {
  return resolveResourceOpenTarget(resource).targetType;
}

export interface ResourceReaderDescriptor {
  canOpenInReader: boolean;
  format?: 'md' | 'epub' | 'pdf' | string;
  documentId?: string;
  title?: string;
  fileUrl?: string;
  sourceType?: 'docs' | 'vault';
  reason?: string;
}

/**
 * Phân giải Resource sang Reader Runtime Descriptor dựa trên phần mở rộng thực tế
 * của target/filePath/url, đảm bảo không bị suy diễn sai lệch theo Resource.type.
 */
export function resolveResourceReaderDescriptor(
  resource: Resource | null | undefined
): ResourceReaderDescriptor {
  if (!resource) {
    return {
      canOpenInReader: false,
      reason: 'Tài liệu không tồn tại',
    };
  }

  // 1. Xác định target path/url theo thứ tự ưu tiên
  const rawTarget = (resource.openTarget && resource.openTarget.trim())
    ? resource.openTarget.trim()
    : (resource.filePath && resource.filePath.trim())
    ? resource.filePath.trim()
    : (resource.url && resource.url.trim())
    ? resource.url.trim()
    : '';

  if (!rawTarget) {
    return {
      canOpenInReader: false,
      reason: 'Tài liệu chưa có đường dẫn hoặc liên kết',
    };
  }

  // 2. Nếu là URL Web hoặc Custom app scheme -> mở qua Viewer/Browser ngoài
  if (/^(https?:|mailto:|obsidian:|zotero:|notion:|\w+:\/\/)/i.test(rawTarget) && !rawTarget.toLowerCase().startsWith('file://')) {
    return {
      canOpenInReader: false,
      reason: 'Liên kết web hoặc ứng dụng ngoài, mở qua trình duyệt hoặc ứng dụng ngoài',
    };
  }

  // 3. Chuẩn hóa đường dẫn tệp
  let normalized = rawTarget.replace(/^file:\/\//i, '').replace(/\\/g, '/');
  let explicitVaultId: string | undefined = undefined;

  // Hỗ trợ định dạng vault:<vaultId>:<relPath> hoặc vault:<relPath>
  if (/^vault:/i.test(normalized)) {
    const withoutPrefix = normalized.replace(/^vault:/i, '');
    const parts = withoutPrefix.split(':');
    if (parts.length >= 2 && parts[0] && !parts[0].includes('/')) {
      explicitVaultId = parts[0];
      normalized = parts.slice(1).join(':');
    } else {
      normalized = withoutPrefix;
    }
  }

  const cleanPath = normalized.replace(/^\/+/, '');
  const lower = cleanPath.toLowerCase();

  const isDocs = lower.startsWith('docs/') || lower.startsWith('/docs/') || lower.endsWith('.feature');
  const sourceType: 'docs' | 'vault' = isDocs ? 'docs' : 'vault';
  const vaultQuery = explicitVaultId ? `&vaultId=${encodeURIComponent(explicitVaultId)}` : '';
  const docIdPrefix = explicitVaultId ? `vault:${explicitVaultId}:` : 'vault:';

  // 4. Phân giải tệp Markdown (.md)
  if (lower.endsWith('.md')) {
    const fileUrl = isDocs
      ? `/api/docs/raw?path=${encodeURIComponent(cleanPath.replace(/^docs\//i, ''))}`
      : `/api/obsidian/vault/file?path=${encodeURIComponent(cleanPath)}${vaultQuery}`;
    const documentId = isDocs ? cleanPath : `${docIdPrefix}${cleanPath}`;

    return {
      canOpenInReader: true,
      format: 'md',
      documentId,
      title: resource.title,
      fileUrl,
      sourceType,
    };
  }

  // 5. Phân giải tệp EPUB (.epub)
  if (lower.endsWith('.epub')) {
    const fileUrl = isDocs
      ? `/api/docs/raw?path=${encodeURIComponent(cleanPath.replace(/^docs\//i, ''))}`
      : `/api/obsidian/vault/attachment?path=${encodeURIComponent(cleanPath)}${vaultQuery}`;
    const documentId = isDocs ? cleanPath : `${docIdPrefix}${cleanPath}`;

    return {
      canOpenInReader: true,
      format: 'epub',
      documentId,
      title: resource.title,
      fileUrl,
      sourceType,
    };
  }

  // 6. Phân giải tệp PDF (.pdf)
  if (lower.endsWith('.pdf')) {
    const fileUrl = isDocs
      ? `/api/docs/raw?path=${encodeURIComponent(cleanPath.replace(/^docs\//i, ''))}`
      : `/api/obsidian/vault/attachment?path=${encodeURIComponent(cleanPath)}${vaultQuery}`;
    const documentId = isDocs ? cleanPath : `${docIdPrefix}${cleanPath}`;

    return {
      canOpenInReader: true,
      format: 'pdf',
      documentId,
      title: resource.title,
      fileUrl,
      sourceType,
    };
  }

  // 7. Định dạng không hỗ trợ (.zip, .mp3, .mp4, .docx, ...) -> fallback an toàn
  return {
    canOpenInReader: false,
    reason: 'Định dạng tệp không được hỗ trợ trong bộ đọc tích hợp',
  };
}
