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
