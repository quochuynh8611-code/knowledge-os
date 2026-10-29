import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

describe('Phase 20: Migration Safety & Prisma Guard', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const scriptPath = path.join(rootDir, 'scripts/safe-prisma-db-push.mjs');
  const dockerComposePath = path.join(rootDir, 'docker-compose.yml');
  const deployRunbookPath = path.join(rootDir, 'docs/release/deploy-v0.1.0.md');

  it('Scenario 1: Given NODE_ENV là production, When script safe-prisma-db-push được gọi, Then từ chối thực thi và yêu cầu dùng prisma migrate deploy', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);

    const result = spawnSync('node', [scriptPath], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ALLOW_PRISMA_DB_PUSH: 'false',
      },
      encoding: 'utf-8',
    });

    expect(result.status).not.toBe(0);
    const combinedOutput = `${result.stdout} ${result.stderr}`;
    expect(combinedOutput).toMatch(/prisma db push is blocked in production/i);
    expect(combinedOutput).toMatch(/npx prisma migrate deploy/i);
  });

  it('Scenario 2: Given NODE_ENV không phải production, When script safe-prisma-db-push được gọi với --dry-run, Then cho phép thực thi', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);

    const result = spawnSync('node', [scriptPath, '--dry-run'], {
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    const combinedOutput = `${result.stdout} ${result.stderr}`;
    expect(combinedOutput).toMatch(/dry-run passed|allowed/i);
  });

  it('Scenario 2b: Given NODE_ENV là production nhưng ALLOW_PRISMA_DB_PUSH=true, When script được gọi với --dry-run, Then cho phép thực thi', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);

    const result = spawnSync('node', [scriptPath, '--dry-run'], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ALLOW_PRISMA_DB_PUSH: 'true',
      },
      encoding: 'utf-8',
    });

    expect(result.status).toBe(0);
    const combinedOutput = `${result.stdout} ${result.stderr}`;
    expect(combinedOutput).toMatch(/dry-run passed|allowed/i);
  });

  it('Scenario 3: Given docker-compose.yml, When kiểm tra service db-schema, Then service này có profile tools và dùng safe-prisma-db-push', () => {
    expect(fs.existsSync(dockerComposePath)).toBe(true);
    const composeContent = fs.readFileSync(dockerComposePath, 'utf-8');

    // db-schema must have profiles: ["tools"]
    expect(composeContent).toMatch(/db-schema:[\s\S]*?profiles:\s*\["tools"\]/);

    // db-schema must use the safe guard script instead of direct prisma db push
    expect(composeContent).toMatch(/node\s+scripts\/safe-prisma-db-push\.mjs/);

    // db-schema must declare default ALLOW_PRISMA_DB_PUSH=false
    expect(composeContent).toMatch(/ALLOW_PRISMA_DB_PUSH/);
  });

  it('Scenario 4: Given deployment runbook, When triển khai v0.1.0, Then lệnh migration là npx prisma migrate deploy và cảnh báo chống db push', () => {
    expect(fs.existsSync(deployRunbookPath)).toBe(true);
    const runbookContent = fs.readFileSync(deployRunbookPath, 'utf-8');

    expect(runbookContent).toMatch(/npx prisma migrate deploy/);
    expect(runbookContent).toMatch(/KHÔNG chạy `?prisma db push`?/i);
  });
});

