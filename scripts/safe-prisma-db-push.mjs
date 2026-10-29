#!/usr/bin/env node

/**
 * scripts/safe-prisma-db-push.mjs
 * 
 * Production Safety Guard:
 * Prevents accidental execution of `prisma db push` in production environments.
 * Production migrations MUST use `npx prisma migrate deploy`.
 */

import { spawn } from 'child_process';

const nodeEnv = process.env.NODE_ENV || 'development';
const allowPush = process.env.ALLOW_PRISMA_DB_PUSH === 'true';
const isDryRun = process.argv.includes('--dry-run');

if (nodeEnv === 'production' && !allowPush) {
  console.error(
    '\x1b[31m%s\x1b[0m',
    '=========================================================================='
  );
  console.error(
    '\x1b[31m%s\x1b[0m',
    '[BLOCKED] prisma db push is blocked in production to prevent data loss and schema drift.'
  );
  console.error(
    '\x1b[33m%s\x1b[0m',
    '-> For production deployments, you MUST use: npx prisma migrate deploy'
  );
  console.error(
    '\x1b[33m%s\x1b[0m',
    '-> If you strictly intend to override this in emergency, set ALLOW_PRISMA_DB_PUSH=true'
  );
  console.error(
    '\x1b[31m%s\x1b[0m',
    '=========================================================================='
  );
  process.exit(1);
}

if (isDryRun) {
  console.log('[ALLOWED] prisma db push check passed (dry-run passed).');
  process.exit(0);
}

// Forward to npx prisma db push
const forwardedArgs = process.argv.slice(2);
const child = spawn('npx', ['prisma', 'db', 'push', ...forwardedArgs], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

