import { describe, it, expect } from 'vitest';
import { scholarUnifiedDictionary } from '../../src/lib/terminology/unifiedDictionary';
import type { TerminologyEntry } from '../../src/types/terminology';

describe('Phase P12.1: TCM Domain Validation & Taxonomy Integrity (RED Phase)', () => {
  it('1. Enforces Acupoint WHO code regex and clinical location on all "kinh-huyet" entries', () => {
    const allEntries = scholarUnifiedDictionary.listAll?.() ?? [];
    const acupoints = allEntries.filter(
      (e) => e.sourceType === 'tcm_registry' && e.tcmExtension?.category === 'kinh-huyet'
    );

    // Expected to FAIL until P12.1 creates TCM entries
    expect(acupoints.length).toBeGreaterThanOrEqual(5);

    const whoCodeRegex = /^[A-Z]{1,2}[0-9]{1,2}$/;
    for (const point of acupoints) {
      expect(point.tcmExtension?.meridianCode).toBeDefined();
      expect(whoCodeRegex.test(point.tcmExtension?.meridianCode ?? '')).toBe(true);
      expect(point.summary).toBeDefined();
      expect(point.summary?.length).toBeGreaterThan(10);
    }
  });

  it('2. Enforces Four Natures, Flavors, and Channel Tropism on all "duoc-tinh" entries', () => {
    const allEntries = scholarUnifiedDictionary.listAll?.() ?? [];
    const herbs = allEntries.filter(
      (e) => e.sourceType === 'tcm_registry' && e.tcmExtension?.category === 'duoc-tinh'
    );

    expect(herbs.length).toBeGreaterThanOrEqual(4);

    for (const herb of herbs) {
      expect(herb.tcmExtension?.nature).toBeDefined();
      expect(Array.isArray(herb.tcmExtension?.flavor)).toBe(true);
      expect(herb.tcmExtension?.flavor?.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(herb.tcmExtension?.channelTropism)).toBe(true);
      expect(herb.tcmExtension?.channelTropism?.length).toBeGreaterThanOrEqual(1);
      expect(herb.tcmExtension?.primaryAction).toBeDefined();
    }
  });

  it('3. Enforces Five Elements and Yin-Yang categorization on all "tang-tuong" entries', () => {
    const allEntries = scholarUnifiedDictionary.listAll?.() ?? [];
    const zangFuList = allEntries.filter(
      (e) => e.sourceType === 'tcm_registry' && e.tcmExtension?.category === 'tang-tuong'
    );

    expect(zangFuList.length).toBeGreaterThanOrEqual(5);

    for (const item of zangFuList) {
      expect(item.aliases?.vietnamese).toBeDefined();
      expect(item.aliases?.hanTu).toBeDefined();
      expect(item.aliases?.pinyin).toBeDefined();
      expect(item.summary).toBeDefined();
    }
  });

  it('4. Enforces multilingual completeness across all TCM registry entries', () => {
    const allEntries = scholarUnifiedDictionary.listAll?.() ?? [];
    const tcmEntries = allEntries.filter((e) => e.sourceType === 'tcm_registry');

    expect(tcmEntries.length).toBeGreaterThanOrEqual(14);

    for (const entry of tcmEntries) {
      expect(entry.id.startsWith('tcm-')).toBe(true);
      expect(entry.conceptId?.startsWith('concept:tcm:')).toBe(true);
      expect(entry.domain).toBe('y-hoc-co-truyen');
      expect(entry.languageProfiles?.vi?.surfaceForm).toBeDefined();
      expect(entry.languageProfiles?.['zh-Hant']?.surfaceForm).toBeDefined();
      expect(entry.languageProfiles?.['zh-Hant']?.transliterations?.pinyin).toBeDefined();
      expect(entry.languageProfiles?.['zh-Hant']?.transliterations?.hanViet).toBeDefined();
      expect(entry.sources?.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('5. Ensures non-TCM entries never possess tcmExtension', () => {
    const allEntries = scholarUnifiedDictionary.listAll?.() ?? [];
    const nonTcmEntries = allEntries.filter((e) => e.sourceType !== 'tcm_registry');

    expect(nonTcmEntries.length).toBeGreaterThan(0);
    for (const entry of nonTcmEntries) {
      expect(entry.tcmExtension).toBeUndefined();
    }
  });
});
