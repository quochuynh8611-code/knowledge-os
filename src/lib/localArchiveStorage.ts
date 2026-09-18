import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ArchivedDocumentFormat } from "../types";

export interface LocalArchiveStorageOptions {
  archiveRoot?: string;
}

export interface SaveFileOptions {
  buffer: Buffer;
  originalName: string;
  fileFormat: ArchivedDocumentFormat;
}

export interface SaveFileResult {
  contentHash: string;
  fileSize: number;
  storageRelPath: string;
  isDuplicate: boolean;
}

/**
 * LocalArchiveStorage handles secure, content-addressable local storage
 * for archived research documents (PDF, EPUB, Markdown).
 */
export class LocalArchiveStorage {
  private readonly archiveRoot: string;

  constructor(options?: LocalArchiveStorageOptions) {
    this.archiveRoot = path.resolve(
      options?.archiveRoot || path.resolve(process.cwd(), "data", "archive")
    );
    this.ensureDirectoryExists(this.archiveRoot);
  }

  getArchiveRoot(): string {
    return this.archiveRoot;
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Resolves and verifies that a relative path stays strictly within the archive root.
   */
  getSafeAbsolutePath(storageRelPath: string): string {
    if (!storageRelPath || typeof storageRelPath !== "string") {
      throw new Error("PATH_TRAVERSAL_DETECTED: Invalid storage path");
    }

    const trimmed = storageRelPath.trim();

    // Reject absolute paths and traversal patterns
    if (
      trimmed.startsWith("/") ||
      trimmed.startsWith("\\") ||
      path.isAbsolute(trimmed) ||
      trimmed.includes("..") ||
      trimmed.includes("\0") ||
      trimmed.includes("%2f") ||
      trimmed.includes("%2F")
    ) {
      throw new Error("PATH_TRAVERSAL_DETECTED: Path traversal or absolute path detected");
    }

    const normalizedRel = path.normalize(trimmed);
    const absolutePath = path.resolve(this.archiveRoot, normalizedRel);
    const resolvedRoot = path.resolve(this.archiveRoot);

    if (
      !absolutePath.startsWith(resolvedRoot + path.sep) &&
      absolutePath !== resolvedRoot
    ) {
      throw new Error("PATH_TRAVERSAL_DETECTED: Access denied outside archive root");
    }

    return absolutePath;
  }

  /**
   * Computes SHA-256 hash of a binary buffer.
   */
  computeHash(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Saves a document buffer using content-addressable storage (CAS).
   * Generates deterministic path from format, hash-prefix, and content hash.
   * Performs deduplication if identical hash already exists.
   */
  async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    const { buffer, originalName, fileFormat } = options;
    const contentHash = this.computeHash(buffer);
    const fileSize = buffer.byteLength;

    // Determine extension from original name or fallback to fileFormat
    let ext = path.extname(originalName).toLowerCase();
    if (!ext || ext === ".") {
      ext = `.${fileFormat}`;
    }

    const prefix = contentHash.substring(0, 2);
    // Content-addressable path: format/hash-prefix/full-hash.ext
    const storageRelPath = path.join(fileFormat, prefix, `${contentHash}${ext}`).replace(/\\/g, "/");

    const fullPath = this.getSafeAbsolutePath(storageRelPath);
    const targetDir = path.dirname(fullPath);
    this.ensureDirectoryExists(targetDir);

    let isDuplicate = false;
    if (fs.existsSync(fullPath)) {
      isDuplicate = true;
    } else {
      await fs.promises.writeFile(fullPath, buffer);
    }

    return {
      contentHash,
      fileSize,
      storageRelPath,
      isDuplicate,
    };
  }

  /**
   * Reads a binary document from archive storage.
   */
  async readFile(storageRelPath: string): Promise<Buffer> {
    const fullPath = this.getSafeAbsolutePath(storageRelPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`FILE_NOT_FOUND: Archived document not found at '${storageRelPath}'`);
    }

    return fs.promises.readFile(fullPath);
  }

  /**
   * Returns a readable stream for high-performance HTTP response streaming.
   */
  createReadStream(storageRelPath: string): fs.ReadStream {
    const fullPath = this.getSafeAbsolutePath(storageRelPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`FILE_NOT_FOUND: Archived document not found at '${storageRelPath}'`);
    }

    return fs.createReadStream(fullPath);
  }

  /**
   * Returns file stat metadata.
   */
  async statFile(storageRelPath: string): Promise<fs.Stats> {
    const fullPath = this.getSafeAbsolutePath(storageRelPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`FILE_NOT_FOUND: Archived document not found at '${storageRelPath}'`);
    }

    return fs.promises.stat(fullPath);
  }
}
