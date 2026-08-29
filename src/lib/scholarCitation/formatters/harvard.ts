import type { ScholarCitationViewModel } from '../../../types/scholarCitation';

/**
 * Formats a ScholarCitationViewModel into a Harvard style citation string.
 */
export function formatHarvard(vm: ScholarCitationViewModel): string | null {
  if (vm.sufficiency === 'internal_note_only') {
    return null;
  }

  const source = vm.sourceTitle;
  const year = '(no date)';
  const title = `'${vm.title}'`;

  let sectionAndLocator = vm.sectionRef;
  if (vm.ptsRef) {
    sectionAndLocator = `${vm.sectionRef} (PTS: ${vm.ptsRef})`;
  } else if (vm.taishoRef) {
    sectionAndLocator = `${vm.sectionRef} (Taishō: ${vm.taishoRef})`;
  }

  return `${source} ${year} ${title}, ${sectionAndLocator}.`;
}
