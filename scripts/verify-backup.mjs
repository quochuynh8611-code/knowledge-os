#!/usr/bin/env node

/**
 * scripts/verify-backup.mjs
 * 
 * Verifies integrity of a backup archive by comparing actual SHA-256 against checksum file.
 * Prioritizes backup.dump over backup.json when verifying a directory.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const targetArg = process.argv[2];

if (!targetArg) {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'BACKUP_VERIFY_ERROR',
      metadata: { error: 'Thiếu đường dẫn thư mục hoặc file backup cần xác minh' },
    })
  );
  process.exit(1);
}

const targetPath = path.resolve(targetArg);

let targetDir = targetPath;
let backupFile = '';
let checksumFile = '';

if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
  targetDir = targetPath;
  const dumpPath = path.join(targetDir, 'backup.dump');
  const jsonPath = path.join(targetDir, 'backup.json');

  // Explicit priority: backup.dump > backup.json
  if (fs.existsSync(dumpPath)) {
    backupFile = dumpPath;
  } else if (fs.existsSync(jsonPath)) {
    backupFile = jsonPath;
  }

  checksumFile = path.join(targetDir, 'checksum.sha256');
} else if (fs.existsSync(targetPath)) {
  backupFile = targetPath;
  targetDir = path.dirname(targetPath);
  checksumFile = path.join(targetDir, 'checksum.sha256');
} else {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'BACKUP_CHECKSUM_INVALID',
      metadata: { targetPath, error: 'Đường dẫn backup không tồn tại' },
    })
  );
  process.exit(1);
}

if (!backupFile || !fs.existsSync(backupFile) || !fs.existsSync(checksumFile)) {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'BACKUP_CHECKSUM_INVALID',
      metadata: { targetDir, error: 'Không tìm thấy backup file (backup.dump hoặc backup.json) hoặc checksum.sha256' },
    })
  );
  process.exit(1);
}

const contentBuffer = fs.readFileSync(backupFile);
const actualSha256 = crypto.createHash('sha256').update(contentBuffer).digest('hex');
const expectedSha256 = fs.readFileSync(checksumFile, 'utf-8').trim();

if (actualSha256 === expectedSha256) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'BACKUP_CHECKSUM_VALID',
      metadata: {
        backupFile,
        checksum: actualSha256,
        sizeBytes: contentBuffer.length,
      },
    })
  );
  process.exit(0);
} else {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'BACKUP_CHECKSUM_INVALID',
      metadata: {
        backupFile,
        expected: expectedSha256,
        actual: actualSha256,
      },
    })
  );
  process.exit(1);
}
