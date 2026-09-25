/**
 * Production Secure Storage Resolver for Knowledge OS Source Objects
 * (Phase 4.2 Security Boundary)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ProviderException } from "../providers/errors";

export interface ResolvedSourceFile {
  readonly sourceObjectId: string;
  readonly absolutePath: string;
  readonly byteSize: number;
  readonly mimeType: string;
  readonly contentHash: string;
}

export interface SecureStorageResolverOptions {
  readonly allowedRoots: readonly string[];
  readonly maxBytes?: number;
  readonly allowedMimeTypes?: readonly string[];
}

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

const DEFAULT_ALLOWED_MIME_TYPES: readonly string[] = Object.freeze([
  "application/pdf",
  "application/epub+zip",
  "text/markdown",
  "text/plain",
]);

const EXTENSION_MIME_MAP: Readonly<Record<string, string>> = Object.freeze({
  ".pdf": "application/pdf",
  ".epub": "application/epub+zip",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".txt": "text/plain",
});

export class SecureStorageResolver {
  private readonly allowedRoots: readonly string[];
  private readonly maxBytes: number;
  private readonly allowedMimeTypes: readonly string[];

  constructor(options: SecureStorageResolverOptions) {
    if (!options || !Array.isArray(options.allowedRoots) || options.allowedRoots.length === 0) {
      throw new ProviderException(
        "INVALID_ARGUMENT",
        "SecureStorageResolver yêu cầu ít nhất một thư mục gốc lưu trữ hợp lệ (allowedRoots)"
      );
    }

    this.allowedRoots = options.allowedRoots
      .filter((r) => typeof r === "string" && r.trim().length > 0)
      .map((r) => path.resolve(r.trim()));

    if (this.allowedRoots.length === 0) {
      throw new ProviderException(
        "INVALID_ARGUMENT",
        "SecureStorageResolver: Danh sách allowedRoots không chứa đường dẫn hợp lệ"
      );
    }

    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.allowedMimeTypes = options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES;
  }

  public async resolve(sourceObjectId: string): Promise<ResolvedSourceFile> {
    // 1. Kiểm tra validation chuỗi cơ bản
    if (!sourceObjectId || typeof sourceObjectId !== "string" || sourceObjectId.trim().length === 0) {
      throw new ProviderException(
        "INVALID_ARGUMENT",
        "Tên đối tượng nguồn (sourceObjectId) không được để trống"
      );
    }

    const trimmedId = sourceObjectId.trim();

    // 2. Chặn NUL byte
    if (trimmedId.includes("\0")) {
      throw new ProviderException(
        "INVALID_ARGUMENT",
        "Định dạng sourceObjectId chứa ký tự không hợp lệ (NUL byte)"
      );
    }

    // 3. Chặn Absolute POSIX Path
    if (path.isAbsolute(trimmedId) || trimmedId.startsWith("/") || trimmedId.startsWith("\\")) {
      throw new ProviderException(
        "INVALID_ARGUMENT",
        "Đường dẫn tuyệt đối không được phép cho sourceObjectId"
      );
    }

    // 4. Chặn Windows Drive Pattern (C:, D:, etc.)
    if (/^[a-zA-Z]:/.test(trimmedId)) {
      throw new ProviderException(
        "INVALID_ARGUMENT",
        "Đường dẫn ổ đĩa Windows không được phép cho sourceObjectId"
      );
    }

    // 5. Chặn Backslash
    if (trimmedId.includes("\\")) {
      throw new ProviderException(
        "INVALID_ARGUMENT",
        "Ký tự dấu gạch chéo ngược (\\) không được phép, vui lòng sử dụng dấu gạch chéo (/)"
      );
    }

    // 6. Chặn Path Traversal segments (..)
    const segments = trimmedId.split("/");
    if (segments.some((seg) => seg === "..")) {
      throw new ProviderException(
        "INVALID_ARGUMENT",
        "Phát hiện ký tự path traversal (..) bị cấm trong sourceObjectId"
      );
    }

    // 7. Duyệt qua các allowlisted roots để định vị tệp tin
    let foundCandidate = false;

    for (const root of this.allowedRoots) {
      const targetCandidate = path.resolve(root, trimmedId);

      // Kiểm tra ranh giới cha con (Sandbox check)
      const relative = path.relative(root, targetCandidate);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        continue;
      }

      // Kiểm tra xem tệp có tồn tại trên đĩa không
      let stat: fs.Stats;
      try {
        stat = await fs.promises.lstat(targetCandidate);
      } catch (err: any) {
        if (err?.code === "ENOENT") {
          continue; // Thử root kế tiếp
        }
        throw new ProviderException(
          "INTERNAL_ERROR",
          "Lỗi kiểm tra trạng thái tệp tin trên hệ thống lưu trữ"
        );
      }

      foundCandidate = true;

      // 8. Chặn directory
      if (stat.isDirectory()) {
        throw new ProviderException(
          "INVALID_ARGUMENT",
          `Đối tượng nguồn '${trimmedId}' là thư mục, không phải tệp tin hợp lệ`
        );
      }

      // 9. Kiểm tra Symlink Escape qua realpath
      let realRoot: string;
      let realPath: string;
      try {
        realRoot = await fs.promises.realpath(root);
        realPath = await fs.promises.realpath(targetCandidate);
      } catch {
        throw new ProviderException(
          "INVALID_ARGUMENT",
          `Không thể phân giải đường dẫn thực tế cho đối tượng nguồn '${trimmedId}'`
        );
      }

      const realRelative = path.relative(realRoot, realPath);
      if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
        throw new ProviderException(
          "PERMISSION_DENIED",
          `Phát hiện liên kết tượng trưng (symlink escape) ra ngoài vùng lưu trữ an toàn cho đối tượng '${trimmedId}'`
        );
      }

      // 10. Kiểm tra kích thước tệp tin (File size limit)
      const realStat = await fs.promises.stat(realPath);
      if (realStat.size > this.maxBytes) {
        throw new ProviderException(
          "INVALID_ARGUMENT",
          `Kích thước tệp tin (${realStat.size} bytes) vượt quá giới hạn tối đa cho phép (${this.maxBytes} bytes)`
        );
      }

      // 11. Kiểm tra và xác định MIME type
      const ext = path.extname(realPath).toLowerCase();
      const detectedMime = EXTENSION_MIME_MAP[ext];
      if (!detectedMime || !this.allowedMimeTypes.includes(detectedMime)) {
        throw new ProviderException(
          "INVALID_ARGUMENT",
          `Định dạng tệp tin '${ext || "unknown"}' không nằm trong danh sách MIME type được hỗ trợ`
        );
      }

      // 12. Tính toán SHA-256 Hash qua Stream (Memory-safe)
      const contentHash = await this.computeStreamSha256(realPath);

      return {
        sourceObjectId: trimmedId,
        absolutePath: realPath,
        byteSize: realStat.size,
        mimeType: detectedMime,
        contentHash,
      };
    }

    // Nếu không tìm thấy trong bất kỳ root nào
    throw new ProviderException(
      "INVALID_ARGUMENT",
      `Không tìm thấy đối tượng nguồn '${trimmedId}' trong các vùng lưu trữ được cấp phép`
    );
  }

  private computeStreamSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);

      stream.on("data", (chunk) => {
        hash.update(chunk);
      });

      stream.on("end", () => {
        resolve(hash.digest("hex"));
      });

      stream.on("error", (err) => {
        reject(
          new ProviderException(
            "INTERNAL_ERROR",
            `Lỗi tính toán mã băm SHA-256 của tệp tin: ${err.message}`
          )
        );
      });
    });
  }
}
