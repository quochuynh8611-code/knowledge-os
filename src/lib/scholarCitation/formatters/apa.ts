import type { ScholarCitationViewModel } from '../../../types/scholarCitation';

/**
 * Formats a ScholarCitationViewModel into an APA 7th Edition citation string.
 * Strictly blocks internal_note_only items.
 */
export function formatAPA7(vm: ScholarCitationViewModel): string | null {
  if (vm.sufficiency === 'internal_note_only') {
    return null;
  }

  const source = vm.sourceTitle;
  const year = '(n.d.)';
  const title = vm.title;

  let locator: string;
  if (vm.ptsRef) {
    locator = `(PTS: ${vm.ptsRef}, ${vm.sectionRef})`;
  } else if (vm.taishoRef) {
    locator = `(Taishō: ${vm.taishoRef}, ${vm.sectionRef})`;
  } else {
    locator = `[${vm.sectionRef}]`;
  }

  return `${source}. ${year}. ${title} ${locator}.`;
}
