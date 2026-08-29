import type { MatrixRelation } from '../../types/scholarSuite';
import type { CSLItem } from '../../types/scholarCitation';
import { normalizeMatrixRelation } from './normalizer';
import { formatBibTeX } from './formatters/bibtex';
import { formatCSLJSON } from './formatters/csl';

/**
 * Exports multiple valid MatrixRelations to a combined BibTeX string.
 * Automatically omits blocked/stub relations without valid sources to prevent hallucinated citations.
 */
export function exportMatrixRelationsToBibTeX(relations: MatrixRelation[]): string {
  const validEntries: string[] = [];

  for (const rel of relations) {
    const vm = normalizeMatrixRelation(rel);
    if (vm.sufficiency !== 'internal_note_only') {
      const bib = formatBibTeX(vm);
      if (bib) {
        validEntries.push(bib);
      }
    }
  }

  return validEntries.join('\n\n');
}

/**
 * Exports multiple valid MatrixRelations to an array of CSL JSON items.
 * Automatically omits blocked/stub relations without valid sources.
 */
export function exportMatrixRelationsToCSL(relations: MatrixRelation[]): CSLItem[] {
  const validItems: CSLItem[] = [];

  for (const rel of relations) {
    const vm = normalizeMatrixRelation(rel);
    if (vm.sufficiency !== 'internal_note_only') {
      const csl = formatCSLJSON(vm);
      if (csl) {
        validItems.push(csl);
      }
    }
  }

  return validItems;
}

/**
 * Helper function to trigger browser download for batch matrix citation files.
 */
export function triggerBatchDownload(filename: string, content: string, mimeType: string): void {
  try {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download batch citation file:', err);
  }
}
