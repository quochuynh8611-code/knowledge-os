import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  evaluateRestoreDrillReadiness,
  captureRestoreDrillEvidence,
  serializeRestoreDrillEvidenceJSON,
  formatRestoreDrillEvidenceFilename,
  validateRestoreDrillEvidenceJSON,
  RestoreDrillEvidenceRecord,
} from '../../src/lib/backupVerification';
import { Category, Topic, Note, Resource, Tag } from '../../src/types';

describe('Post-Phase 6i: Restore Drill Evidence Serialization & Audit Validation Tests', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures/backup');

  const createSampleEvidenceRecord = (): RestoreDrillEvidenceRecord => ({
    evidenceId: 'drill-ev-20260825-test1234',
    snapshotChecksum: '69da0aca4ed05f3a63e257f38a1ec23f5a37d4e8c673ecdabc054b990185acd2',
    snapshotFormat: 'snapshot_v2',
    validationStatus: 'valid',
    dryRunStatus: 'simulated_success',
    simulatedMode: 'replace',
    simulatedImpact: {
      categoriesDelta: 2,
      topicsDelta: 2,
      notesDelta: 2,
      resourcesDelta: 2,
      tagsDelta: 3,
    },
    gateSummary: {
      gate1Passed: true,
      gate2Passed: true,
      gate3Required: true,
      overallDrillReady: true,
    },
    timestamp: '2026-08-25T14:00:00.000Z',
    operatorSignOffStatus: 'signed_off',
    operatorNotes: 'Kiểm toán viên xác nhận diễn tập đạt chuẩn',
  });

  // ---------------------------------------------------------------------------
  // 1. Deterministic JSON Serialization & Formatting Policy
  // ---------------------------------------------------------------------------
  it('1. Serializes RestoreDrillEvidenceRecord to formatted deterministic JSON string', () => {
    const evidence = createSampleEvidenceRecord();
    const jsonString = serializeRestoreDrillEvidenceJSON(evidence);

    expect(typeof jsonString).toBe('string');
    expect(jsonString).toContain('\n  "evidenceId": "drill-ev-20260825-test1234"');
    expect(jsonString).toContain('"snapshotChecksum": "69da0aca4ed05f3a63e257f38a1ec23f5a37d4e8c673ecdabc054b990185acd2"');
    expect(jsonString).toContain('"simulatedMode": "replace"');
    expect(jsonString).toContain('"operatorSignOffStatus": "signed_off"');

    // Compact mode
    const compactString = serializeRestoreDrillEvidenceJSON(evidence, { pretty: false });
    expect(compactString).not.toContain('\n');
    expect(JSON.parse(compactString)).toEqual(evidence);
  });

  // ---------------------------------------------------------------------------
  // 2. Safe Filename Policy and Path Traversal Protection
  // ---------------------------------------------------------------------------
  it('2. Formats safe filename and strips path traversal characters', () => {
    const evidence = createSampleEvidenceRecord();

    // Normal safe filename
    const filename = formatRestoreDrillEvidenceFilename(evidence);
    expect(filename).toBe('knowledge-os-restore-drill-evidence-2026-08-25-drill-ev-20260825-test1234.json');

    // Path traversal attack attempt in evidenceId
    const maliciousEvidence: RestoreDrillEvidenceRecord = {
      ...evidence,
      evidenceId: '../../../../etc/passwd-unsafe:id?*',
      timestamp: '2026-08-25T14:00:00.000Z',
    };
    const safeMaliciousFilename = formatRestoreDrillEvidenceFilename(maliciousEvidence);

    expect(safeMaliciousFilename).not.toContain('..');
    expect(safeMaliciousFilename).not.toContain('/');
    expect(safeMaliciousFilename).not.toContain('\\');
    expect(safeMaliciousFilename).not.toContain(':');
    expect(safeMaliciousFilename).not.toContain('?');
    expect(safeMaliciousFilename).not.toContain('*');
    expect(safeMaliciousFilename).toMatch(/^knowledge-os-restore-drill-evidence-2026-08-25-.*\.json$/);
  });

  // ---------------------------------------------------------------------------
  // 3. Valid JSON String Audit Validation
  // ---------------------------------------------------------------------------
  it('3. Successfully validates a valid serialized evidence JSON string', () => {
    const evidence = createSampleEvidenceRecord();
    const jsonString = serializeRestoreDrillEvidenceJSON(evidence);

    const result = validateRestoreDrillEvidenceJSON(jsonString);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.evidence).toBeDefined();
    expect(result.evidence?.evidenceId).toBe(evidence.evidenceId);
    expect(result.evidence?.snapshotChecksum).toBe(evidence.snapshotChecksum);
    expect(result.evidence?.simulatedImpact).toEqual(evidence.simulatedImpact);
    expect(result.evidence?.gateSummary).toEqual(evidence.gateSummary);
  });

  // ---------------------------------------------------------------------------
  // 4. Already-parsed Object Audit Validation
  // ---------------------------------------------------------------------------
  it('4. Validates parsed object directly without needing stringification', () => {
    const evidence = createSampleEvidenceRecord();
    const result = validateRestoreDrillEvidenceJSON(evidence);

    expect(result.valid).toBe(true);
    expect(result.evidence?.evidenceId).toBe(evidence.evidenceId);
    expect(result.evidence?.operatorSignOffStatus).toBe('signed_off');
  });

  // ---------------------------------------------------------------------------
  // 5. Malformed JSON String Handling (Safe Error)
  // ---------------------------------------------------------------------------
  it('5. Safely rejects malformed JSON string without throwing unhandled exceptions', () => {
    const malformedJson = '{ "evidenceId": "123", "broken: [';
    const result = validateRestoreDrillEvidenceJSON(malformedJson);

    expect(result.valid).toBe(false);
    expect(result.evidence).toBeUndefined();
    expect(result.error).toContain('JSON syntax error');
  });

  // ---------------------------------------------------------------------------
  // 6. Missing Required Fields or Invalid Enums Rejection
  // ---------------------------------------------------------------------------
  it('6. Rejects payload with missing required fields or invalid enum values', () => {
    // Missing gateSummary and invalid operatorSignOffStatus
    const invalidPayload = {
      evidenceId: 'ev-1',
      snapshotFormat: 'invalid_format',
      validationStatus: 'valid',
      dryRunStatus: 'simulated_success',
      simulatedMode: 'replace',
      simulatedImpact: { topicsDelta: 1 }, // Missing other deltas
      timestamp: 'not-a-date',
      operatorSignOffStatus: 'unknown_status',
    };

    const result = validateRestoreDrillEvidenceJSON(invalidPayload);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.evidence).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // 7. Deep Copy & Reference Isolation in Validation
  // ---------------------------------------------------------------------------
  it('7. Validation returns an isolated deep copy preventing external mutations', () => {
    const evidence = createSampleEvidenceRecord();
    const result = validateRestoreDrillEvidenceJSON(evidence);

    expect(result.valid).toBe(true);
    expect(result.evidence).toBeDefined();

    if (result.evidence) {
      result.evidence.simulatedImpact.topicsDelta = 9999;
      result.evidence.gateSummary.gate1Passed = false;
    }

    expect(evidence.simulatedImpact.topicsDelta).toBe(2);
    expect(evidence.gateSummary.gate1Passed).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 8. Backward Compatibility with Phase 6h captureRestoreDrillEvidence Output
  // ---------------------------------------------------------------------------
  it('8. Seamlessly serializes and validates evidence generated by captureRestoreDrillEvidence', () => {
    const validRaw = fs.readFileSync(path.join(fixturesDir, 'valid-snapshot.json'), 'utf-8');
    const validPayload = JSON.parse(validRaw);

    const liveState = {
      categories: [{ id: 'cat-1', name: 'Phật Học', slug: 'phat-hoc' }] as Category[],
      topics: [] as Topic[],
      notes: [] as Note[],
      resources: [] as Resource[],
      tags: [] as Tag[],
    };

    const readinessReport = evaluateRestoreDrillReadiness(validPayload, liveState, { mode: 'merge' });
    const capturedEvidence = captureRestoreDrillEvidence(readinessReport, {
      operatorSignOffStatus: 'signed_off',
      operatorNotes: 'Bằng chứng diễn tập tự động qua pipeline',
    });

    const serialized = serializeRestoreDrillEvidenceJSON(capturedEvidence);
    const validated = validateRestoreDrillEvidenceJSON(serialized);

    expect(validated.valid).toBe(true);
    expect(validated.evidence?.snapshotChecksum).toBe('69da0aca4ed05f3a63e257f38a1ec23f5a37d4e8c673ecdabc054b990185acd2');
    expect(validated.evidence?.operatorNotes).toBe('Bằng chứng diễn tập tự động qua pipeline');
  });

  // ---------------------------------------------------------------------------
  // 9. Zero DB / Zero API / Zero Binary Ingestion Check
  // ---------------------------------------------------------------------------
  it('9. Serialization and audit validation code are completely pure with zero external dependencies', () => {
    const srcFilePath = path.resolve(__dirname, '../../src/lib/backupVerification.ts');
    const srcContent = fs.readFileSync(srcFilePath, 'utf-8');

    expect(srcContent).not.toContain('prisma');
    expect(srcContent).not.toContain('@prisma/client');
    expect(srcContent).not.toContain('localStorage.setItem');
    expect(srcContent).not.toContain('fetch(');
  });
});
