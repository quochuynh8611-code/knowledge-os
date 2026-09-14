import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ObsidianVaultManager } from '../../src/lib/vault-manager';
import {
  resolveScopedObsidianFile,
  resolveMultipleScopedObsidianFiles,
} from '../../src/server/services/obsidianFileResolver';

describe('Lát cắt 1: Scoped Obsidian File Resolver & Vault Lookup (Test-First)', () => {
  let tmpBaseDir: string;
  let vaultADir: string;
  let vaultBDir: string;
  let outsideDir: string;
  let vaultManager: ObsidianVaultManager;

  beforeEach(() => {
    tmpBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'obsidian-resolver-test-'));
    vaultADir = path.join(tmpBaseDir, 'VaultA');
    vaultBDir = path.join(tmpBaseDir, 'VaultB');
    outsideDir = path.join(tmpBaseDir, 'Outside');

    fs.mkdirSync(vaultADir, { recursive: true });
    fs.mkdirSync(vaultBDir, { recursive: true });
    fs.mkdirSync(outsideDir, { recursive: true });

    // Fixtures in Vault A
    fs.writeFileSync(
      path.join(vaultADir, 'docA.md'),
      '# Doc A\n\nNội dung tài liệu Vault A.',
      'utf-8'
    );

    // Fixtures in Vault B
    fs.writeFileSync(
      path.join(vaultBDir, 'noteB.md'),
      '---\ntitle: Ghi Chú Vault B\ntags: [research, ai]\n---\n# Tiêu Đề Bài Viết\n\nNội dung chi tiết từ Vault B.',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(vaultBDir, 'large.md'),
      '# Large Doc\n\n' + 'A'.repeat(10_000),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(vaultBDir, 'attachment.pdf'),
      '%PDF-1.4 Fake PDF Content',
      'utf-8'
    );

    // Protected directories in Vault B
    const obsidianDir = path.join(vaultBDir, '.obsidian');
    fs.mkdirSync(obsidianDir, { recursive: true });
    fs.writeFileSync(path.join(obsidianDir, 'app.json'), '{"vault":"secret"}', 'utf-8');

    // Outside file for symlink test
    const secretFile = path.join(outsideDir, 'secret.txt');
    fs.writeFileSync(secretFile, 'CONFIDENTIAL_DATA', 'utf-8');

    try {
      fs.symlinkSync(secretFile, path.join(vaultBDir, 'symlink-escape.md'));
    } catch {
      // Symlinks might fail on some Windows configurations, handle gracefully
    }

    vaultManager = new ObsidianVaultManager({
      profiles: [
        { vaultId: 'vault-a', label: 'Vault Alpha', rootPath: vaultADir },
        { vaultId: 'vault-b', label: 'Vault Beta', rootPath: vaultBDir },
      ],
      defaultVaultId: 'vault-a',
    });
  });

  afterEach(() => {
    if (tmpBaseDir && fs.existsSync(tmpBaseDir)) {
      fs.rmSync(tmpBaseDir, { recursive: true, force: true });
    }
  });

  describe('Vault Manager getVaultProfile (Pure Scoped Lookup)', () => {
    it('returns vault profile by ID without mutating active vault state', () => {
      expect(vaultManager.getActiveVaultId()).toBe('vault-a');

      const profileB = vaultManager.getVaultProfile('vault-b');
      expect(profileB).not.toBeNull();
      expect(profileB?.vaultId).toBe('vault-b');
      expect(profileB?.label).toBe('Vault Beta');
      expect(profileB?.rootPath).toBe(vaultBDir);

      // Invariant: Active vault must still be vault-a
      expect(vaultManager.getActiveVaultId()).toBe('vault-a');
      expect(vaultManager.getActiveProfile()?.vaultId).toBe('vault-a');
    });

    it('returns null for non-existent vaultProfileId without throwing', () => {
      const nonExistent = vaultManager.getVaultProfile('vault-non-existent');
      expect(nonExistent).toBeNull();
      expect(vaultManager.getActiveVaultId()).toBe('vault-a');
    });
  });

  describe('resolveScopedObsidianFile Security & Invariants', () => {
    it('successfully resolves valid Markdown from Vault B while active vault is Vault A (No Global Switch)', async () => {
      expect(vaultManager.getActiveVaultId()).toBe('vault-a');

      const result = await resolveScopedObsidianFile(vaultManager, {
        vaultProfileId: 'vault-b',
        relativePath: 'noteB.md',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.source.vaultProfileId).toBe('vault-b');
        expect(result.source.relativePath).toBe('noteB.md');
        expect(result.source.fileName).toBe('noteB.md');
        expect(result.source.title).toBe('Ghi Chú Vault B');
        expect(result.source.cleanContent).toContain('Nội dung chi tiết từ Vault B.');
        // Frontmatter must be stripped from cleanContent
        expect(result.source.cleanContent).not.toContain('title: Ghi Chú Vault B');
        // Absolute path / rootPath must NOT be present in source object
        expect((result.source as any).rootPath).toBeUndefined();
        expect((result.source as any).absolutePath).toBeUndefined();
        expect((result.source as any).realTarget).toBeUndefined();
      }

      // Invariant: Active vault remains Vault A
      expect(vaultManager.getActiveVaultId()).toBe('vault-a');
    });

    it('rejects relative traversal "../" and "..\\"', async () => {
      const resultDotDot = await resolveScopedObsidianFile(vaultManager, {
        vaultProfileId: 'vault-b',
        relativePath: '../Outside/secret.txt',
      });
      expect(resultDotDot.ok).toBe(false);
      if (resultDotDot.ok === false) {
        expect(resultDotDot.error).toBe('PATH_TRAVERSAL_DETECTED');
      }

      const resultBackslash = await resolveScopedObsidianFile(vaultManager, {
        vaultProfileId: 'vault-b',
        relativePath: '..\\Outside\\secret.txt',
      });
      expect(resultBackslash.ok).toBe(false);
      if (resultBackslash.ok === false) {
        expect(resultBackslash.error).toBe('PATH_TRAVERSAL_DETECTED');
      }
    });

    it('rejects absolute paths', async () => {
      const resultAbs = await resolveScopedObsidianFile(vaultManager, {
        vaultProfileId: 'vault-b',
        relativePath: path.join(outsideDir, 'secret.txt'),
      });
      expect(resultAbs.ok).toBe(false);
      if (resultAbs.ok === false) {
        expect(resultAbs.error).toBe('PATH_TRAVERSAL_DETECTED');
      }
    });

    it('rejects symlink escape pointing outside vault', async () => {
      const symlinkPath = path.join(vaultBDir, 'symlink-escape.md');
      if (fs.existsSync(symlinkPath)) {
        const result = await resolveScopedObsidianFile(vaultManager, {
          vaultProfileId: 'vault-b',
          relativePath: 'symlink-escape.md',
        });
        expect(result.ok).toBe(false);
        if (result.ok === false) {
          expect(['SYMLINK_NOT_ALLOWED', 'PATH_TRAVERSAL_DETECTED', 'PATH_OUTSIDE_VAULT']).toContain(
            result.error
          );
        }
      }
    });

    it('rejects protected hidden directories like .obsidian', async () => {
      const result = await resolveScopedObsidianFile(vaultManager, {
        vaultProfileId: 'vault-b',
        relativePath: '.obsidian/app.json',
      });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(['ACCESS_DENIED_SENSITIVE_DIR', 'PATH_TRAVERSAL_DETECTED']).toContain(result.error);
      }
    });

    it('rejects non-Markdown files', async () => {
      const result = await resolveScopedObsidianFile(vaultManager, {
        vaultProfileId: 'vault-b',
        relativePath: 'attachment.pdf',
      });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(['FORBIDDEN_EXTENSION', 'INVALID_FILE_TYPE']).toContain(result.error);
      }
    });

    it('handles missing/renamed files safely without throwing or crashing', async () => {
      const result = await resolveScopedObsidianFile(vaultManager, {
        vaultProfileId: 'vault-b',
        relativePath: 'non-existent-note.md',
      });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error).toBe('FILE_NOT_FOUND');
        expect(result.relativePath).toBe('non-existent-note.md');
      }
    });

    it('rejects when vaultProfileId is not configured', async () => {
      const result = await resolveScopedObsidianFile(vaultManager, {
        vaultProfileId: 'unknown-vault',
        relativePath: 'note.md',
      });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error).toBe('VAULT_NOT_FOUND');
      }
    });
  });

  describe('resolveMultipleScopedObsidianFiles Batch Resolver', () => {
    it('resolves a list of refs and separates resolved vs missing/excluded sources deterministically', async () => {
      const refs = [
        { vaultProfileId: 'vault-b', relativePath: 'noteB.md' },
        { vaultProfileId: 'vault-b', relativePath: 'deleted-file.md' },
        { vaultProfileId: 'vault-b', relativePath: 'attachment.pdf' },
      ];

      const batchResult = await resolveMultipleScopedObsidianFiles(vaultManager, refs);

      expect(batchResult.vaultProfileId).toBe('vault-b');
      expect(batchResult.resolved.length).toBe(1);
      expect(batchResult.resolved[0].fileName).toBe('noteB.md');
      expect(batchResult.missing.length).toBe(1);
      expect(batchResult.missing[0].relativePath).toBe('deleted-file.md');
      expect(batchResult.excluded.length).toBe(1);
      expect(batchResult.excluded[0].relativePath).toBe('attachment.pdf');
    });
  });
});
