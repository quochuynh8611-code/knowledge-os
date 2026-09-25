import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { SecureStorageResolver } from "../../src/server/services/storage/secureStorageResolver";
import { ProviderException } from "../../src/server/services/providers/errors";

describe("SECURE STORAGE RESOLVER UNIT & SECURITY TESTS (PHASE 4.2)", () => {
  let tempBaseDir: string;
  let primaryStorageRoot: string;
  let secondaryVaultRoot: string;
  let outsideSandboxDir: string;
  let resolver: SecureStorageResolver;

  beforeEach(async () => {
    // Tạo môi trường thư mục thử nghiệm cách ly
    tempBaseDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "k-os-secure-storage-"));
    primaryStorageRoot = path.join(tempBaseDir, "primary-storage");
    secondaryVaultRoot = path.join(tempBaseDir, "secondary-vault");
    outsideSandboxDir = path.join(tempBaseDir, "outside-sandbox");

    await fs.promises.mkdir(primaryStorageRoot, { recursive: true });
    await fs.promises.mkdir(secondaryVaultRoot, { recursive: true });
    await fs.promises.mkdir(outsideSandboxDir, { recursive: true });

    // Tạo các tệp tin hợp lệ
    await fs.promises.mkdir(path.join(primaryStorageRoot, "pdf"), { recursive: true });
    await fs.promises.writeFile(
      path.join(primaryStorageRoot, "pdf", "abhidhamma.pdf"),
      "%PDF-1.4 Mock Abhidhamma Content"
    );

    await fs.promises.writeFile(
      path.join(primaryStorageRoot, "notes.md"),
      "# Khảo cứu Vi Diệu Pháp\nNội dung ghi chú"
    );

    await fs.promises.writeFile(
      path.join(secondaryVaultRoot, "sutta.txt"),
      "Tạng Kinh Sutta Pitaka"
    );

    // Tệp tin nằm ngoài sandbox
    await fs.promises.writeFile(
      path.join(outsideSandboxDir, "secret.key"),
      "SUPER_SECRET_GCP_KEY_AIzaSy_FAKE"
    );

    resolver = new SecureStorageResolver({
      allowedRoots: [primaryStorageRoot, secondaryVaultRoot],
      maxBytes: 10 * 1024 * 1024, // 10 MB cho bài test
    });
  });

  afterEach(async () => {
    // Dọn dẹp thư mục tạm
    if (tempBaseDir && fs.existsSync(tempBaseDir)) {
      await fs.promises.rm(tempBaseDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  // ─── 1. Resolve file hợp lệ ──────────────────────────────────────────────────
  it("1. Resolves valid files across multiple allowed roots successfully", async () => {
    const res1 = await resolver.resolve("pdf/abhidhamma.pdf");
    expect(res1.sourceObjectId).toBe("pdf/abhidhamma.pdf");
    expect(res1.mimeType).toBe("application/pdf");
    expect(res1.byteSize).toBeGreaterThan(0);
    expect(res1.contentHash).toBeDefined();
    expect(res1.contentHash.length).toBe(64); // SHA-256 hex string

    const res2 = await resolver.resolve("sutta.txt");
    expect(res2.sourceObjectId).toBe("sutta.txt");
    expect(res2.mimeType).toBe("text/plain");
  });

  // ─── 2. Chặn empty sourceObjectId ───────────────────────────────────────────
  it("2. Rejects empty or whitespace-only sourceObjectId with INVALID_ARGUMENT", async () => {
    await expect(resolver.resolve("")).rejects.toThrow(ProviderException);
    await expect(resolver.resolve("   ")).rejects.toThrow("Tên đối tượng nguồn (sourceObjectId) không được để trống");
  });

  // ─── 3. Chặn ../secret.txt ───────────────────────────────────────────────────
  it("3. Rejects relative path traversal attempts with (..) segments", async () => {
    await expect(resolver.resolve("../secret.txt")).rejects.toThrow(ProviderException);
    try {
      await resolver.resolve("../secret.txt");
    } catch (err: any) {
      expect(err.errorCode).toBe("INVALID_ARGUMENT");
      expect(err.message).toContain("path traversal (..)");
    }
  });

  // ─── 4. Chặn ../../etc/passwd ───────────────────────────────────────────────
  it("4. Rejects deep path traversal attempts (../../etc/passwd)", async () => {
    await expect(resolver.resolve("../../etc/passwd")).rejects.toThrow(ProviderException);
    try {
      await resolver.resolve("../../etc/passwd");
    } catch (err: any) {
      expect(err.errorCode).toBe("INVALID_ARGUMENT");
    }
  });

  // ─── 5. Chặn absolute path (/etc/passwd) ────────────────────────────────────
  it("5. Rejects absolute POSIX paths (/etc/passwd)", async () => {
    await expect(resolver.resolve("/etc/passwd")).rejects.toThrow(ProviderException);
    try {
      await resolver.resolve("/etc/passwd");
    } catch (err: any) {
      expect(err.errorCode).toBe("INVALID_ARGUMENT");
      expect(err.message).toContain("Đường dẫn tuyệt đối không được phép");
    }
  });

  // ─── 6. Chặn Windows drive path ─────────────────────────────────────────────
  it("6. Rejects Windows drive patterns (C:\\Windows\\system32\\file)", async () => {
    await expect(resolver.resolve("C:/Windows/system32/cmd.exe")).rejects.toThrow(ProviderException);
    await expect(resolver.resolve("D:\\data\\file.pdf")).rejects.toThrow(ProviderException);
  });

  // ─── 7. Chặn Symlink Escape ─────────────────────────────────────────────────
  it("7. Detects and rejects symlink escape pointing outside allowlisted root with PERMISSION_DENIED", async () => {
    // Tạo symlink bên trong storage root trỏ ra ngoài outsideSandboxDir
    const symlinkPath = path.join(primaryStorageRoot, "leak-link.md");
    const targetSecretPath = path.join(outsideSandboxDir, "secret.key");

    try {
      await fs.promises.symlink(targetSecretPath, symlinkPath);
    } catch {
      // Bỏ qua nếu OS hạn chế quyền symlink
      return;
    }

    await expect(resolver.resolve("leak-link.md")).rejects.toThrow(ProviderException);
    try {
      await resolver.resolve("leak-link.md");
    } catch (err: any) {
      expect(err.errorCode).toBe("PERMISSION_DENIED");
      expect(err.message).toContain("symlink escape");
    }
  });

  // ─── 8. Chặn Directory ──────────────────────────────────────────────────────
  it("8. Rejects directory paths with INVALID_ARGUMENT", async () => {
    await expect(resolver.resolve("pdf")).rejects.toThrow(ProviderException);
    try {
      await resolver.resolve("pdf");
    } catch (err: any) {
      expect(err.errorCode).toBe("INVALID_ARGUMENT");
      expect(err.message).toContain("là thư mục, không phải tệp tin hợp lệ");
    }
  });

  // ─── 9. Chặn file không tồn tại ─────────────────────────────────────────────
  it("9. Rejects non-existent files with INVALID_ARGUMENT", async () => {
    await expect(resolver.resolve("pdf/non-existent.pdf")).rejects.toThrow(ProviderException);
    try {
      await resolver.resolve("pdf/non-existent.pdf");
    } catch (err: any) {
      expect(err.errorCode).toBe("INVALID_ARGUMENT");
      expect(err.message).toContain("Không tìm thấy đối tượng nguồn");
    }
  });

  // ─── 10. Chặn file vượt quá maxBytes ────────────────────────────────────────
  it("10. Rejects files exceeding configured maxBytes limit", async () => {
    const strictResolver = new SecureStorageResolver({
      allowedRoots: [primaryStorageRoot],
      maxBytes: 10, // Giới hạn 10 bytes cực nhỏ
    });

    await expect(strictResolver.resolve("notes.md")).rejects.toThrow(ProviderException);
    try {
      await strictResolver.resolve("notes.md");
    } catch (err: any) {
      expect(err.errorCode).toBe("INVALID_ARGUMENT");
      expect(err.message).toContain("vượt quá giới hạn tối đa cho phép");
    }
  });

  // ─── 11. Chặn MIME không hỗ trợ ─────────────────────────────────────────────
  it("11. Rejects unsupported extensions and MIME types (.exe, .sh, .bin)", async () => {
    await fs.promises.writeFile(path.join(primaryStorageRoot, "malicious.exe"), "MZ...");

    await expect(resolver.resolve("malicious.exe")).rejects.toThrow(ProviderException);
    try {
      await resolver.resolve("malicious.exe");
    } catch (err: any) {
      expect(err.errorCode).toBe("INVALID_ARGUMENT");
      expect(err.message).toContain("không nằm trong danh sách MIME type được hỗ trợ");
    }
  });

  // ─── 12. Hash ổn định cho cùng nội dung ─────────────────────────────────────
  it("12. Produces consistent and deterministic SHA-256 hash for identical content", async () => {
    const resA = await resolver.resolve("notes.md");
    const resB = await resolver.resolve("notes.md");

    const manualContent = await fs.promises.readFile(path.join(primaryStorageRoot, "notes.md"));
    const manualHash = crypto.createHash("sha256").update(manualContent).digest("hex");

    expect(resA.contentHash).toBe(manualHash);
    expect(resB.contentHash).toBe(manualHash);
  });

  // ─── 13. Hash thay đổi khi nội dung thay đổi ────────────────────────────────
  it("13. Detects content modifications and updates SHA-256 hash accordingly", async () => {
    const resInitial = await resolver.resolve("notes.md");

    // Thay đổi nội dung file
    await fs.promises.appendFile(path.join(primaryStorageRoot, "notes.md"), "\nThêm dòng luận cứ mới");

    const resModified = await resolver.resolve("notes.md");
    expect(resModified.contentHash).not.toBe(resInitial.contentHash);
    expect(resModified.byteSize).toBeGreaterThan(resInitial.byteSize);
  });

  // ─── 14. Không leak absolute allowlisted root trong error ───────────────────
  it("14. Never leaks full host filesystem paths or allowedRoot paths in error messages", async () => {
    try {
      await resolver.resolve("missing-item.pdf");
    } catch (err: any) {
      expect(err.message).not.toContain(primaryStorageRoot);
      expect(err.message).not.toContain(secondaryVaultRoot);
      expect(err.message).not.toContain(tempBaseDir);
      expect(err.message).toContain("missing-item.pdf");
    }
  });
});
