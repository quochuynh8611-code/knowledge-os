import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Post-Phase 6f: Operator Runbook & Evidence Bundle Isolation Contract Tests', () => {
  const runbookPath = path.resolve(
    __dirname,
    '../../docs/runbooks/backup-restore-operator-runbook.vi.md'
  );
  const srcDir = path.resolve(__dirname, '../../src');

  it('1. Operator runbook exists and covers all three distinct backup layers', () => {
    expect(fs.existsSync(runbookPath)).toBe(true);
    const content = fs.readFileSync(runbookPath, 'utf-8');

    // 3 layers must be explicitly articulated
    expect(content).toContain('Lớp 1: App Snapshot JSON');
    expect(content).toContain('Lớp 2: File Library Manifest JSON');
    expect(content).toContain('Lớp 3: Physical File Set');
  });

  it('2. Runbook explicitly states physical files must be copied separately', () => {
    const content = fs.readFileSync(runbookPath, 'utf-8');

    expect(content).toContain('Physical File Set (Tệp vật lý) phải được sao chép riêng');
    expect(content).toContain('Snapshot JSON bảo vệ dữ liệu logic trong ứng dụng');
    expect(content).toContain('Manifest bảo vệ metadata tham chiếu đường dẫn');
    expect(content).toContain('Zero Binary Ingestion');
  });

  it('3. Runbook explicitly states Restore Drill is a safe in-memory dry-run', () => {
    const content = fs.readFileSync(runbookPath, 'utf-8');

    expect(content).toContain('Restore Drill');
    expect(content).toContain('In-Memory Dry Run');
    expect(content).toContain('không ghi đè hay thay đổi bất kỳ dữ liệu thật nào');
    expect(content).toContain('XÁC NHẬN THAY THẾ');
  });

  it('4. Runbook contains boundary handling, rollback plan, and operator sign-off checklist', () => {
    const content = fs.readFileSync(runbookPath, 'utf-8');

    expect(content).toContain('unverified');
    expect(content).toContain('missing');
    expect(content).toContain('outside_library');
    expect(content).toContain('KẾ HOẠCH KHẮC PHỤC SỰ CỐ & ROLLBACK');
    expect(content).toContain('BẢNG KÝ XÁC NHẬN CỦA NGƯỜI VẬN HÀNH');
  });

  it('5. Bundle isolation: ensures test fixtures are never imported by production src/', () => {
    const checkDirForFixtureImports = (dir: string): string[] => {
      let violatingFiles: string[] = [];
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          violatingFiles = violatingFiles.concat(checkDirForFixtureImports(fullPath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('fixtures/backup') || content.includes('tests/fixtures')) {
            violatingFiles.push(fullPath);
          }
        }
      }
      return violatingFiles;
    };

    const violations = checkDirForFixtureImports(srcDir);
    expect(violations).toEqual([]);
  });
});
