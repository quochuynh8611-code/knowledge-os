import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

describe('Phase 22.1: Backup Automation & Verification Hardening', () => {
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

  it('Scenario 1: Given mock flag (--mock), When chạy backup-database.mjs, Then tạo backup, checksum và metadata, đồng thời log BACKUP_CREATED', () => {
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
    expect(combinedOutput).not.toContain('postgresql://');

    const entries = fs.readdirSync(tempBackupDir);
    expect(entries.length).toBeGreaterThan(0);
    const backupSubdir = path.join(tempBackupDir, entries[0]);
    expect(fs.existsSync(path.join(backupSubdir, 'backup.json'))).toBe(true);
    expect(fs.existsSync(path.join(backupSubdir, 'checksum.sha256'))).toBe(true);
    expect(fs.existsSync(path.join(backupSubdir, 'metadata.json'))).toBe(true);
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

    fs.writeFileSync(path.join(testDir, 'backup.json'), content + ' tampered!', 'utf-8');
    fs.writeFileSync(path.join(testDir, 'checksum.sha256'), checksum, 'utf-8');

    const result = spawnSync('node', [verifyScript, testDir], {
      encoding: 'utf-8',
    });

    expect(result.status).not.toBe(0);
    const combinedOutput = `${result.stdout} ${result.stderr}`;
    expect(combinedOutput).toContain('BACKUP_CHECKSUM_INVALID');
  });

  it('Scenario 4: Given 5 backup đều cũ hơn RETENTION_DAYS, When chạy prune-backups.mjs với BACKUP_MIN_KEEP=3, Then giữ lại 3 bản mới nhất và chỉ xóa 2 bản cũ hơn', () => {
    expect(fs.existsSync(pruneScript)).toBe(true);

    const dir1 = path.join(tempBackupDir, '20260101_000000');
    const dir2 = path.join(tempBackupDir, '20260102_000000');
    const dir3 = path.join(tempBackupDir, '20260103_000000');
    const dir4 = path.join(tempBackupDir, '20260104_000000');
    const dir5 = path.join(tempBackupDir, '20260105_000000');

    [dir1, dir2, dir3, dir4, dir5].forEach((d, idx) => {
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'backup.json'), `backup-${idx}`);
    });

    // Artificially change mtime of all 5 directories to 30 days ago, in chronological order
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    fs.utimesSync(dir1, new Date(thirtyDaysAgo), new Date(thirtyDaysAgo));
    fs.utimesSync(dir2, new Date(thirtyDaysAgo + 10000), new Date(thirtyDaysAgo + 10000));
    fs.utimesSync(dir3, new Date(thirtyDaysAgo + 20000), new Date(thirtyDaysAgo + 20000));
    fs.utimesSync(dir4, new Date(thirtyDaysAgo + 30000), new Date(thirtyDaysAgo + 30000));
    fs.utimesSync(dir5, new Date(thirtyDaysAgo + 40000), new Date(thirtyDaysAgo + 40000));

    const result = spawnSync('node', [pruneScript], {
      env: {
        ...process.env,
        BACKUP_DIR: tempBackupDir,
        BACKUP_RETENTION_DAYS: '7',
        BACKUP_MIN_KEEP: '3',
      },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('BACKUP_RETENTION_COMPLETED');
    const parsed = JSON.parse(result.stdout.trim());
    expect(parsed.metadata.minKeep).toBe(3);
    expect(parsed.metadata.retainedCount).toBe(3);
    expect(parsed.metadata.prunedCount).toBe(2);

    // Two oldest pruned
    expect(fs.existsSync(dir1)).toBe(false);
    expect(fs.existsSync(dir2)).toBe(false);

    // Three newest retained
    expect(fs.existsSync(dir3)).toBe(true);
    expect(fs.existsSync(dir4)).toBe(true);
    expect(fs.existsSync(dir5)).toBe(true);
  });

  it('Scenario 5: Given không có DATABASE_URL và không có cờ --mock, When chạy backup-database.mjs, Then fail-fast với code 1, log BACKUP_FAILED và không để lại thư mục rác', () => {
    const result = spawnSync('node', [backupScript], {
      env: {
        ...process.env,
        BACKUP_DIR: tempBackupDir,
        DATABASE_URL: '', // empty
      },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(1);
    const combinedOutput = `${result.stdout} ${result.stderr}`;
    expect(combinedOutput).toContain('BACKUP_FAILED');
    expect(combinedOutput).toContain('MISSING_DATABASE_URL');
    expect(combinedOutput).not.toContain('BACKUP_CREATED');

    // Ensure tempBackupDir contains no subdirectories
    const entries = fs.readdirSync(tempBackupDir);
    expect(entries.length).toBe(0);
  });

  it('Scenario 6: Given pg_dump thất bại (kết nối sai/lỗi), When chạy backup-database.mjs, Then fail-fast code 1, log BACKUP_FAILED, không fallback tạo file rỗng, không lộ credential', () => {
    const secretPassword = 'SUPER_SECRET_DB_PASSWORD_XYZ';
    const fakeDbUrl = `postgresql://db_user:${secretPassword}@127.0.0.1:59999/nonexistent_db`;

    const result = spawnSync('node', [backupScript], {
      env: {
        ...process.env,
        BACKUP_DIR: tempBackupDir,
        DATABASE_URL: fakeDbUrl,
      },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(1);
    const combinedOutput = `${result.stdout} ${result.stderr}`;
    expect(combinedOutput).toContain('BACKUP_FAILED');
    expect(combinedOutput).toContain('PG_DUMP_FAILED');
    expect(combinedOutput).not.toContain('BACKUP_CREATED');

    // Strictly ensure no credentials leaked
    expect(combinedOutput).not.toContain(secretPassword);
    expect(combinedOutput).not.toContain(fakeDbUrl);

    // Ensure directory cleaned up and no fallback file was left
    const entries = fs.readdirSync(tempBackupDir);
    expect(entries.length).toBe(0);
  });

  it('Scenario 7: Code inspection - backup-database.mjs không sử dụng execSync với shell interpolation', () => {
    const sourceCode = fs.readFileSync(backupScript, 'utf-8');

    // Must not use execSync with template literals executing pg_dump
    expect(sourceCode).not.toMatch(/execSync\s*\(\s*`pg_dump/);
    expect(sourceCode).not.toMatch(/execSync\s*\(\s*"pg_dump/);

    // Must use spawnSync with argument array
    expect(sourceCode).toContain("spawnSync('pg_dump', [databaseUrl");
  });

  it('Scenario 8: Deterministic backup verification prioritizes backup.dump over backup.json', () => {
    const testDir = path.join(tempBackupDir, '20261029_120002');
    fs.mkdirSync(testDir, { recursive: true });

    const dumpContent = Buffer.from('BINARY_DUMP_CONTENT');
    const jsonContent = JSON.stringify({ note: 'json content' });

    // Write both dump and json files
    fs.writeFileSync(path.join(testDir, 'backup.dump'), dumpContent);
    fs.writeFileSync(path.join(testDir, 'backup.json'), jsonContent);

    // Checksum matches the dump content
    const dumpChecksum = crypto.createHash('sha256').update(dumpContent).digest('hex');
    fs.writeFileSync(path.join(testDir, 'checksum.sha256'), dumpChecksum);

    const result = spawnSync('node', [verifyScript, testDir], {
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('BACKUP_CHECKSUM_VALID');
    expect(result.stdout).toContain('backup.dump');
  });
});
