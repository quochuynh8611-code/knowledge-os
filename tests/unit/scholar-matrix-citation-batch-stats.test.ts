import { describe, it, expect } from 'vitest';
import { getBatchMatrixExportStats } from '../../src/lib/scholarCitation/batchMatrix';
import {
  canonicalMatrixRelationFixture,
  patthanaMatrixRelationFixture,
  stubMatrixRelationFixture,
  conjectureMatrixRelationFixture,
} from '../fixtures/scholar-citation-matrix-fixtures';

describe('Phase P8.3: getBatchMatrixExportStats Helper', () => {
  it('1. Returns accurate export and skip counts for mixed valid and stub relations', () => {
    const stats = getBatchMatrixExportStats([
      canonicalMatrixRelationFixture,
      patthanaMatrixRelationFixture,
      stubMatrixRelationFixture,
      conjectureMatrixRelationFixture,
    ]);

    expect(stats.total).toBe(4);
    expect(stats.exportedCount).toBe(3);
    expect(stats.skippedCount).toBe(1);
  });

  it('2. Returns zero skipped when all relations have valid canonical/commentary sources', () => {
    const stats = getBatchMatrixExportStats([
      canonicalMatrixRelationFixture,
      patthanaMatrixRelationFixture,
    ]);

    expect(stats.total).toBe(2);
    expect(stats.exportedCount).toBe(2);
    expect(stats.skippedCount).toBe(0);
  });

  it('3. Returns zero exported when all items are blocked stubs', () => {
    const stats = getBatchMatrixExportStats([
      stubMatrixRelationFixture,
    ]);

    expect(stats.total).toBe(1);
    expect(stats.exportedCount).toBe(0);
    expect(stats.skippedCount).toBe(1);
  });
});
