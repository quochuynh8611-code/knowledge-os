import type { ScholarCitationViewModel } from '../../../types/scholarCitation';

/**
 * Formats a ScholarCitationViewModel into a Chicago 17th Edition Notes citation string.
 * Uses classical scripture / dictionary entry s.v. (sub verbo) convention.
 */
export function formatChicagoNotes(vm: ScholarCitationViewModel): string | null {
  if (vm.sufficiency === 'internal_note_only') {
    return null;
  }

  const source = `*${vm.sourceTitle}*`;
  let catalogLocator = '';
  if (vm.ptsRef) {
    catalogLocator = ` (PTS: ${vm.ptsRef})`;
  } else if (vm.taishoRef) {
    catalogLocator = ` (Taishō: ${vm.taishoRef})`;
  }

  return `${source}, ${vm.sectionRef}${catalogLocator}, s.v. "${vm.title}."`;
}
