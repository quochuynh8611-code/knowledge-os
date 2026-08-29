import type { ScholarCitationViewModel } from '../../../types/scholarCitation';
import { escapeBibTeX } from '../escaping';

/**
 * Formats a ScholarCitationViewModel into a standard BibTeX (@misc) string.
 * Strictly blocks internal_note_only items to prevent Scholarly False Confidence.
 */
export function formatBibTeX(vm: ScholarCitationViewModel): string | null {
  if (vm.sufficiency === 'internal_note_only') {
    return null;
  }

  const cleanKey = vm.citationKey;
  const escapedTitle = escapeBibTeX(vm.title);
  const escapedSource = escapeBibTeX(vm.sourceTitle);

  const noteSegments: string[] = [];
  if (vm.ptsRef) {
    noteSegments.push(`PTS: ${escapeBibTeX(vm.ptsRef)}`);
  }
  if (vm.taishoRef) {
    noteSegments.push(`Taishō: ${escapeBibTeX(vm.taishoRef)}`);
  }
  if (vm.standardEdition) {
    noteSegments.push(`Ấn bản: ${escapeBibTeX(vm.standardEdition)}`);
  }
  if (vm.sectionRef) {
    noteSegments.push(`Phân đoạn: ${escapeBibTeX(vm.sectionRef)}`);
  }

  const lines = [
    `@misc{${cleanKey},`,
    `  title = {${escapedTitle}},`,
    `  howpublished = {${escapedSource}},`,
  ];

  if (noteSegments.length > 0) {
    lines.push(`  note = {${noteSegments.join('; ')}}`);
  }

  lines.push('}');

  return lines.join('\n');
}
