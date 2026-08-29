/**
 * Scholarly Content Backbone - Type Definitions
 * Dedicated types for multi-domain ontological research:
 * Lexicon, System Models (I Ching, Abhidhamma, Nidānas, Qi Men), and Relation Matrices.
 */

export type CompletenessState = 'stub' | 'partial' | 'verified' | 'canonical';

export interface SourceAttribution {
  sourceTitle: string;             // e.g., 'Dhammasaṅgaṇī', 'Chu Dịch - Hệ Từ Thượng'
  sectionRef: string;              // e.g., '§ 1', 'Quẻ số 1 - Hào sơ'
  ptsRef?: string;                 // Pali Text Society citation ref
  taishoRef?: string;              // Taishō Tripiṭaka catalog ref
  standardEdition?: string;        // Academic edition / Translation
}

export interface LexiconEntry {
  id: string;                      // e.g., 'lex-pali-citta', 'lex-iching-qian'
  slug: string;
  terms: {
    vietnamese: string;            // Standard Vietnamese scholarly term
    pali?: string;                 // Pāli (IAST diacritics)
    sanskrit?: string;             // Sanskrit (IAST + Devanagari)
    hanTu?: string;                // Traditional / Simplified Chinese Characters
    pinyin?: string;               // Romanized Pinyin
    english: string;               // Academic English equivalent
  };
  domain: 'phat-hoc' | 'huyen-hoc' | 'triet-hoc' | 'khoa-hoc-tam-thuc';
  subCategory: string;             // e.g., 'Abhidhamma', 'Kinh Dịch'
  etymology?: {
    root?: string;                 // Grammatical root (Dhātu / Radix)
    morphology?: string;           // Morphology breakdown (prefix, suffix, compound)
    literalMeaning?: string;       // Literal / etymological meaning
  };
  // Layer 1: Canonical textual definition
  canonicalDefinition: string;
  // Layer 2: Extended scholarly commentary & modern cross-domain reflections
  interpretiveNotes?: string;
  provenanceNote?: string;         // Mandatory fallback note when coverage is stub/partial without full citations
  sources: SourceAttribution[];    // Mandatory (>=1) when coverage is verified or canonical
  coverage: CompletenessState;
  relatedTopicIds?: string[];
}

// -------------------------------------------------------------
// Discriminated System Node Attributes
// -------------------------------------------------------------

export interface IChingNodeAttributes {
  hexagramNumber: number;          // 1 - 64
  upperTrigram: string;            // Càn, Khôn, Khảm, Ly, Chấn, Tốn, Cấn, Đoài
  lowerTrigram: string;
  element: 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';
  nature: string;                  // e.g., 'Đại Cát - Nguyên Hanh Lợi Trinh'
  judgmentText: string;            // Thoán Từ gốc
  imageText: string;               // Tượng Từ gốc
}

export interface CittaNodeAttributes {
  cittaNumber: number;             // 1 - 89 (hoặc 121)
  plane: 'kāmāvacara' | 'rūpāvacara' | 'arūpāvacara' | 'lokuttara';
  cittaType: 'kusala' | 'akusala' | 'vipāka' | 'kiriya';
  roots: string[];                 // Tham, Sân, Si hoặc Vô Tham, Vô Sân, Vô Si
  feeling: 'somanassa' | 'domanassa' | 'upekkhā' | 'sukha' | 'dukkha';
  prompting: 'asaṅkhārika' | 'sasaṅkhārika' | 'unprompted';
  associatedCetasikaCount: number; // e.g. 19, 21, 38...
}

export interface CetasikaNodeAttributes {
  cetasikaNumber: number;          // 1 - 52
  group: 'aññasamāna' | 'akusala' | 'sobhana';
  subGroup:
    | 'sabbacittasādhāraṇa'
    | 'pakiṇṇaka'
    | 'mohacatukka'
    | 'lobhatika'
    | 'dosacatukka'
    | 'sobhana_general'
    | 'virati'
    | 'appamaññā'
    | 'paññā';
  characteristic: string;          // Lakkhaṇa (Trạng thái)
  function: string;                // Rasa (Phận sự)
  manifestation: string;           // Paccupaṭṭhāna (Thành tựu)
  proximateCause: string;          // Padaṭṭhāna (Nhân cận)
}

export interface PatthanaNodeAttributes {
  conditionNumber: number;         // 1 - 24
  paliName: string;                // e.g. Hetu, Ārammaṇa, Adhipati
  conditionGroup: 'citta_citta' | 'citta_rupa' | 'rupa_rupa' | 'universal';
  scope: string;                   // Phạm vi năng lực duyên
}

export interface NidanaNodeAttributes {
  order: number;                   // 1 - 12 (Vô minh -> Lão tử)
  timePeriod: 'past' | 'present' | 'future';
  linkTier: 'root_cause' | 'present_fruit' | 'present_cause' | 'future_fruit';
  linksFromNodeId?: string;
  linksToNodeId?: string;
}

export interface QiMenNodeAttributes {
  palaceNumber: number;            // 1 - 9
  direction: string;               // e.g. Chính Bắc, Đông Nam
  element: 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';
  door: string;                    // e.g. Khai Môn, Hưu Môn, Sinh Môn
  star: string;                    // e.g. Thiên Bồng, Thiên Nhuế
  deity: string;                   // e.g. Trực Phù, Đằng Xà
}

export interface BaseSystemNode {
  id: string;                      // e.g. 'sys-iching-01', 'sys-citta-01'
  code: string;                    // 'Q01', 'C01', 'CET01', 'P01', 'ND01', 'QM01'
  title: string;
  domain: 'phat-hoc' | 'huyen-hoc' | 'da-nganh';
  lexiconRefId?: string;           // FK LexiconEntry
  // Layer 1: Canonical source exegesis
  canonicalMeaning: string;
  // Layer 2: Interdisciplinary synthesis / analogies
  crossDomainAnalogy?: string;
  provenanceNote?: string;
  sources: SourceAttribution[];
  coverage: CompletenessState;
}

export type SystemNode =
  | ({ systemType: 'iching_64'; attributes: IChingNodeAttributes } & BaseSystemNode)
  | ({ systemType: 'citta_89_121'; attributes: CittaNodeAttributes } & BaseSystemNode)
  | ({ systemType: 'cetasika_52'; attributes: CetasikaNodeAttributes } & BaseSystemNode)
  | ({ systemType: 'patthana_24'; attributes: PatthanaNodeAttributes } & BaseSystemNode)
  | ({ systemType: 'paticcasamuppada_12'; attributes: NidanaNodeAttributes } & BaseSystemNode)
  | ({ systemType: 'qimen_9'; attributes: QiMenNodeAttributes } & BaseSystemNode);

export type SystemNodeType = SystemNode['systemType'];

// -------------------------------------------------------------
// Cross-Axial Matrix Relations
// -------------------------------------------------------------

export interface MatrixRelation {
  id: string;                      // e.g. 'rel-c01-cet01'
  matrixType: 'citta_cetasika' | 'patthana_condition' | 'cross_domain_synthesis';
  rowNodeId: string;               // FK SystemNode
  colNodeId: string;               // FK SystemNode
  relationType: 'associates' | 'governs' | 'conditions' | 'corresponds' | 'opposes';
  strength?: number;               // 1 - 5
  evidenceLevel: 'canonical' | 'commentary' | 'scholarly_conjecture';
  // Layer 1: Canonical textual citation basis
  canonicalEvidence?: string;
  // Layer 2: Modern analytical annotation
  interpretiveNote?: string;
  provenanceNote?: string;
  sources: SourceAttribution[];
  coverage: CompletenessState;
}
