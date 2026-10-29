#!/usr/bin/env node

/**
 * scripts/prune-backups.mjs
 * 
 * Retention policy enforcer for database backups.
 * Prunes backups older than BACKUP_RETENTION_DAYS while ensuring at least
 * BACKUP_MIN_KEEP (default 3) latest backups are NEVER deleted.
 */

import fs from 'fs';
import path from 'path';

const backupDir = path.resolve(process.env.BACKUP_DIR || './backups');
const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '10', 10);
const minKeep = parseInt(process.env.BACKUP_MIN_KEEP || '3', 10);

if (!fs.existsSync(backupDir)) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'BACKUP_RETENTION_COMPLETED',
      metadata: { retentionDays, minKeep, retainedCount: 0, prunedCount: 0, message: 'Thư mục backup chưa tồn tại' },
    })
  );
  process.exit(0);
}

const entries = fs.readdirSync(backupDir).map((name) => {
  const fullPath = path.join(backupDir, name);
  const stats = fs.statSync(fullPath);
  return {
    name,
    fullPath,
    isDirectory: stats.isDirectory(),
    mtimeMs: stats.mtimeMs,
  };
});

// Sort ascending by modification time (oldest first)
entries.sort((a, b) => a.mtimeMs - b.mtimeMs);

const now = Date.now();
const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

let prunedCount = 0;
let retainedCount = 0;

const totalEntries = entries.length;
// Always protect at least minKeep (minimum 1) latest backups
const protectedCount = Math.min(totalEntries, Math.max(1, minKeep));
const protectIndexThreshold = totalEntries - protectedCount;

entries.forEach((entry, idx) => {
  const isProtected = idx >= protectIndexThreshold;
  const ageMs = now - entry.mtimeMs;

  if (!isProtected && ageMs > maxAgeMs) {
    if (entry.isDirectory) {
      fs.rmSync(entry.fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(entry.fullPath);
    }
    prunedCount++;
  } else {
    retainedCount++;
  }
});

console.log(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    event: 'BACKUP_RETENTION_COMPLETED',
    metadata: {
      retentionDays,
      minKeep,
      retainedCount,
      prunedCount,
    },
  })
);
process.exit(0);
