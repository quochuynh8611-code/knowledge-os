import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

describe('Phase 22: Backup Automation & Verification', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const tempBackupDir = path.join(rootDir, 'tests/temp-backups');
  const backupScript = path.join(rootDir, 'scripts/backup-database.mjs');
  const verifyScript = path.join(rootDir, 'scripts/verify-backup.mjs');
  const pruneScript = path.join(rootDir, 'scripts/prune-backups.mjs');

  beforeEach(() => {
    if (fs.existsSync(tempBackupDir)) {
      fs.rmSync(tempBackupDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempBackupDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempBackupDir)) {
      fs.rmSync(tempBackupDir, { recursive: true, force: true });
    }
  });

  it('Scenario 1: Given database hoặc export payload, When chạy backup-database.mjs với dry-run/mock, Then tạo backup, checksum và metadata, đồng thời log BACKUP_CREATED', () => {
    expect(fs.existsSync(backupScript)).toBe(true);

    const result = spawnSync('node', [backupScript, '--mock'], {
      env: {
        ...process.env,
        BACKUP_DIR: tempBackupDir,
      },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    const combinedOutput = `${result.stdout} ${result.stderr}`;
    expect(combinedOutput).toContain('BACKUP_CREATED');
    expect(combinedOutput).not.toContain('postgresql://'); // Does not leak DATABASE_URL

    // Verify subdirectories and files
    const entries = fs.readdirSync(tempBackupDir);
    expect(entries.length).toBeGreaterThan(0);
    const backupDir = path.join(tempBackupDir, entries[0]);
    expect(fs.existsSync(path.join(backupDir, 'backup.json'))).toBe(true);
    expect(fs.existsSync(path.join(backupDir, 'checksum.sha256'))).toBe(true);
    expect(fs.existsSync(path.join(backupDir, 'metadata.json'))).toBe(true);
  });

  it('Scenario 2: Given backup và checksum hợp lệ, When chạy verify-backup.mjs, Then exit code 0 và log BACKUP_CHECKSUM_VALID', () => {
    expect(fs.existsSync(verifyScript)).toBe(true);

    const testDir = path.join(tempBackupDir, '20261029_120000');
    fs.mkdirSync(testDir, { recursive: true });
    const content = JSON.stringify({ test: 'valid data' });
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    fs.writeFileSync(path.join(testDir, 'backup.json'), content, 'utf-8');
    fs.writeFileSync(path.join(testDir, 'checksum.sha256'), checksum, 'utf-8');

    const result = spawnSync('node', [verifyScript, testDir], {
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('BACKUP_CHECKSUM_VALID');
  });

  it('Scenario 3: Given backup file bị chỉnh sửa sai lệch checksum, When chạy verify-backup.mjs, Then exit code khác 0 và log BACKUP_CHECKSUM_INVALID', () => {
    expect(fs.existsSync(verifyScript)).toBe(true);

    const testDir = path.join(tempBackupDir, '20261029_120001');
    fs.mkdirSync(testDir, { recursive: true });
    const content = JSON.stringify({ test: 'valid data' });
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    // Tampered backup
    fs.writeFileSync(path.join(testDir, 'backup.json'), content + ' tampered!', 'utf-8');
    fs.writeFileSync(path.join(testDir, 'checksum.sha256'), checksum, 'utf-8');

    const result = spawnSync('node', [verifyScript, testDir], {
      encoding: 'utf-8',
    });

    expect(result.status).not.toBe(0);
    const combinedOutput = `${result.stdout} ${result.stderr}`;
    expect(combinedOutput).toContain('BACKUP_CHECKSUM_INVALID');
  });

  it('Scenario 4: Given có backup cũ hơn RETENTION_DAYS, When chạy prune-backups.mjs, Then chỉ xóa backup vượt hạn, không xóa backup mới nhất, và log BACKUP_RETENTION_COMPLETED', () => {
    expect(fs.existsSync(pruneScript)).toBe(true);

    // Create 3 backup directories with different modified times
    const dirOld1 = path.join(tempBackupDir, '20260101_000000');
    const dirOld2 = path.join(tempBackupDir, '20260102_000000');
    const dirNewest = path.join(tempBackupDir, '20261029_120000');

    fs.mkdirSync(dirOld1);
    fs.mkdirSync(dirOld2);
    fs.mkdirSync(dirNewest);

    fs.writeFileSync(path.join(dirOld1, 'backup.json'), 'old1');
    fs.writeFileSync(path.join(dirOld2, 'backup.json'), 'old2');
    fs.writeFileSync(path.join(dirNewest, 'backup.json'), 'newest');

    // Artificially change mtime of old directories to 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    fs.utimesSync(dirOld1, thirtyDaysAgo, thirtyDaysAgo);
    fs.utimesSync(dirOld2, thirtyDaysAgo, thirtyDaysAgo);

    const result = spawnSync('node', [pruneScript], {
      env: {
        ...process.env,
        BACKUP_DIR: tempBackupDir,
        BACKUP_RETENTION_DAYS: '7',
      },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('BACKUP_RETENTION_COMPLETED');

    // Newest must be preserved
    expect(fs.existsSync(dirNewest)).toBe(true);
    // Old ones pruned
    expect(fs.existsSync(dirOld1)).toBe(false);
    expect(fs.existsSync(dirOld2)).toBe(false);
  });
});

