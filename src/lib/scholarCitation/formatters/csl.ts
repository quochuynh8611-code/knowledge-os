import type { ScholarCitationViewModel, CSLItem } from '../../../types/scholarCitation';

/**
 * Formats a ScholarCitationViewModel into a standard CSL 1.0.2 Item.
 * Uses only official CSL types: 'entry-dictionary' for Lexicon and 'chapter' for SystemNode.
 * Blocks internal_note_only items.
 */
export function formatCSLJSON(vm: ScholarCitationViewModel): CSLItem | null {
  if (vm.sufficiency === 'internal_note_only') {
    return null;
  }

  const cslItem: CSLItem = {
    id: vm.citationKey,
    type: vm.cslType,
    title: vm.title,
    'container-title': vm.sourceTitle,
  };

  if (vm.sectionRef) {
    cslItem.section = vm.sectionRef;
  }

  if (vm.ptsRef) {
    cslItem.number = vm.ptsRef;
  } else if (vm.taishoRef) {
    cslItem.number = vm.taishoRef;
  }

  if (vm.standardEdition) {
    cslItem.publisher = vm.standardEdition;
  }

  return cslItem;
}
