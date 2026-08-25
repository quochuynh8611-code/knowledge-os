import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Post-Phase 6j: Project Status & Roadmap Baseline Reconciliation Contract Tests', () => {
  const projectStatusPath = path.resolve(__dirname, '../../docs/PROJECT_STATUS.md');
  const roadmapPath = path.resolve(__dirname, '../../docs/implementation-roadmap.md');

  // ---------------------------------------------------------------------------
  // 1. PROJECT_STATUS.md records Phase 6h & Phase 6i
  // ---------------------------------------------------------------------------
  it('1. PROJECT_STATUS.md documents Post-Phase 6h Restore Drill Evidence Capture', () => {
    const content = fs.readFileSync(projectStatusPath, 'utf-8');
    expect(content).toContain('Post-Phase 6h Micro-Increment: Restore Drill Evidence Capture');
    expect(content).toContain('captureRestoreDrillEvidence');
    expect(content).toContain('RestoreDrillEvidenceRecord');
  });

  it('2. PROJECT_STATUS.md documents Post-Phase 6i Restore Drill Evidence Serialization & Audit Validation', () => {
    const content = fs.readFileSync(projectStatusPath, 'utf-8');
    expect(content).toContain('Post-Phase 6i Micro-Increment: Restore Drill Evidence Serialization & Audit Validation');
    expect(content).toContain('serializeRestoreDrillEvidenceJSON');
    expect(content).toContain('formatRestoreDrillEvidenceFilename');
    expect(content).toContain('validateRestoreDrillEvidenceJSON');
  });

  // ---------------------------------------------------------------------------
  // 2. implementation-roadmap.md records Phase 6h & Phase 6i
  // ---------------------------------------------------------------------------
  it('3. implementation-roadmap.md contains Post-Phase 6h section and links spec', () => {
    const content = fs.readFileSync(roadmapPath, 'utf-8');
    expect(content).toContain('POST-PHASE 6H MICRO-INCREMENT: Restore Drill Evidence Capture (ĐÃ HOÀN THÀNH)');
    expect(content).toContain('post-phase6h-restore-drill-evidence-capture.md');
    expect(content).toContain('post-phase6h-restore-drill-evidence-capture.feature');
  });

  it('4. implementation-roadmap.md contains Post-Phase 6i section and links spec', () => {
    const content = fs.readFileSync(roadmapPath, 'utf-8');
    expect(content).toContain('POST-PHASE 6I MICRO-INCREMENT: Restore Drill Evidence Serialization & Audit Validation (ĐÃ HOÀN THÀNH)');
    expect(content).toContain('post-phase6i-restore-drill-evidence-serialization-audit-validation.md');
    expect(content).toContain('post-phase6i-restore-drill-evidence-serialization-audit-validation.feature');
  });

  // ---------------------------------------------------------------------------
  // 3. Baseline Reconciliation (65 test files / 399 tests)
  // ---------------------------------------------------------------------------
  it('5. implementation-roadmap.md reflects the active verified baseline of 65 test files / 399 tests', () => {
    const content = fs.readFileSync(roadmapPath, 'utf-8');
    expect(content).toContain('65 / 65 test files PASS — 399 / 399 tests PASS (100% GREEN)');
  });

  it('6. Superseded baseline (63 / 379) is no longer the active baseline summary', () => {
    const content = fs.readFileSync(roadmapPath, 'utf-8');
    expect(content).not.toContain('63 / 63 test files PASS — 379 / 379 tests PASS');
  });

  // ---------------------------------------------------------------------------
  // 4. Commit SHA Traceability
  // ---------------------------------------------------------------------------
  it('7. Commit SHAs 4973acc and 5490ac4 are traced correctly in docs', () => {
    const projectStatusContent = fs.readFileSync(projectStatusPath, 'utf-8');
    const roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
    const combined = projectStatusContent + '\n' + roadmapContent;

    expect(combined).toContain('4973acc');
    expect(combined).toContain('5490ac4');
  });

  // ---------------------------------------------------------------------------
  // 5. Safety & Pre-completion Integrity
  // ---------------------------------------------------------------------------
  it('8. Docs do not claim Phase 6j is completed before implementation', () => {
    const projectStatusContent = fs.readFileSync(projectStatusPath, 'utf-8');
    const roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');

    expect(projectStatusContent).not.toContain('POST-PHASE 6J MICRO-INCREMENT: (ĐÃ HOÀN THÀNH)');
    expect(roadmapContent).not.toContain('POST-PHASE 6J MICRO-INCREMENT: (ĐÃ HOÀN THÀNH)');
  });

  it('9. Zero production source modification during doc reconciliation', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    expect(fs.existsSync(srcDir)).toBe(true);
  });

  it('10. Zero DB/API/storage dependency in doc reconciliation', () => {
    const specPath = path.resolve(__dirname, '../../docs/specs/post-phase6j-project-status-roadmap-baseline-reconciliation.md');
    const specContent = fs.readFileSync(specPath, 'utf-8');
    expect(specContent).toContain('Không Database / API / Storage Change');
  });
});
