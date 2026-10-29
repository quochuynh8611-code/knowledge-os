#!/usr/bin/env node

/**
 * scripts/backup-database.mjs
 * 
 * Automated database backup script for Knowledge OS.
 * Creates an atomic backup archive, SHA-256 checksum, and metadata record.
 * Fails fast on error without creating empty or misleading backup artifacts.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

const backupDir = path.resolve(process.env.BACKUP_DIR || './backups');
const isMock = process.argv.includes('--mock');
const databaseUrl = process.env.DATABASE_URL;

const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
const targetFolder = path.join(backupDir, timestamp);

const cleanupTargetFolder = () => {
  try {
    if (fs.existsSync(targetFolder)) {
      fs.rmSync(targetFolder, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup error
  }
};

if (isMock) {
  try {
    fs.mkdirSync(targetFolder, { recursive: true });

    const backupFilePath = path.join(targetFolder, 'backup.json');
    const checksumFilePath = path.join(targetFolder, 'checksum.sha256');
    const metadataFilePath = path.join(targetFolder, 'metadata.json');

    const payloadContent = JSON.stringify(
      {
        version: '0.1.0',
        exportedAt: new Date().toISOString(),
        categories: [],
        topics: [],
        notes: [],
        resources: [],
        tags: [],
        flashcards: [],
      },
      null,
      2
    );

    fs.writeFileSync(backupFilePath, payloadContent, 'utf-8');

    const sha256 = crypto.createHash('sha256').update(payloadContent).digest('hex');
    fs.writeFileSync(checksumFilePath, sha256, 'utf-8');

    const stats = fs.statSync(backupFilePath);
    const metadata = {
      timestamp,
      createdAt: new Date().toISOString(),
      type: 'mock_json',
      sizeBytes: stats.size,
      checksum: sha256,
    };
    fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2), 'utf-8');

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'BACKUP_CREATED',
        metadata: {
          targetFolder,
          type: 'mock_json',
          sizeBytes: stats.size,
          checksum: sha256,
        },
      })
    );
    process.exit(0);
  } catch (err) {
    cleanupTargetFolder();
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        event: 'BACKUP_FAILED',
        metadata: {
          reason: 'MOCK_BACKUP_ERROR',
          error: err.message,
        },
      })
    );
    process.exit(1);
  }
}

if (!databaseUrl) {
  cleanupTargetFolder();
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'BACKUP_FAILED',
      metadata: {
        reason: 'MISSING_DATABASE_URL',
        message: 'DATABASE_URL environment variable is required when not running with --mock',
      },
    })
  );
  process.exit(1);
}

try {
  fs.mkdirSync(targetFolder, { recursive: true });

  const dumpPath = path.join(targetFolder, 'backup.dump');
  const checksumFilePath = path.join(targetFolder, 'checksum.sha256');
  const metadataFilePath = path.join(targetFolder, 'metadata.json');

  // Use spawnSync with argument array to prevent shell injection and avoid leaking DATABASE_URL via shell command strings
  const child = spawnSync('pg_dump', [databaseUrl, '-F', 'c', '-b', '-v', '-f', dumpPath], {
    stdio: 'pipe',
    encoding: 'utf-8',
  });

  if (child.error || child.status !== 0) {
    cleanupTargetFolder();
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        event: 'BACKUP_FAILED',
        metadata: {
          reason: 'PG_DUMP_FAILED',
          exitCode: child.status !== null ? child.status : -1,
          backupDir: targetFolder,
        },
      })
    );
    process.exit(1);
  }

  if (!fs.existsSync(dumpPath) || fs.statSync(dumpPath).size === 0) {
    cleanupTargetFolder();
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        event: 'BACKUP_FAILED',
        metadata: {
          reason: 'EMPTY_DUMP',
          backupDir: targetFolder,
        },
      })
    );
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(dumpPath);
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  fs.writeFileSync(checksumFilePath, sha256, 'utf-8');

  const stats = fs.statSync(dumpPath);
  const metadata = {
    timestamp,
    createdAt: new Date().toISOString(),
    type: 'postgresql_dump',
    sizeBytes: stats.size,
    checksum: sha256,
  };
  fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2), 'utf-8');

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'BACKUP_CREATED',
      metadata: {
        targetFolder,
        type: 'postgresql_dump',
        sizeBytes: stats.size,
        checksum: sha256,
      },
    })
  );
  process.exit(0);
} catch (err) {
  cleanupTargetFolder();
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      event: 'BACKUP_FAILED',
      metadata: {
        reason: 'BACKUP_EXECUTION_ERROR',
        backupDir: targetFolder,
      },
    })
  );
  process.exit(1);
}
