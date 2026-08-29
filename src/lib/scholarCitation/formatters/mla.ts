import type { ScholarCitationViewModel } from '../../../types/scholarCitation';

/**
 * Formats a ScholarCitationViewModel into an MLA 9th Edition citation string.
 */
export function formatMLA9(vm: ScholarCitationViewModel): string | null {
  if (vm.sufficiency === 'internal_note_only') {
    return null;
  }

  const title = `"${vm.title}."`;
  const source = `*${vm.sourceTitle}*`;

  let catalogLocator = '';
  if (vm.ptsRef) {
    catalogLocator = `, PTS: ${vm.ptsRef}`;
  } else if (vm.taishoRef) {
    catalogLocator = `, Taishō: ${vm.taishoRef}`;
  }

  return `${title} ${source}, ${vm.sectionRef}${catalogLocator}.`;
}
