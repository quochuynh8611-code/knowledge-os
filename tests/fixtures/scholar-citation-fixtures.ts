import type { LexiconEntry, SystemNode } from '../../src/types/scholarSuite';

export const canonicalLexiconFixture: LexiconEntry = {
  id: 'lex-pali-citta',
  slug: 'citta',
  terms: {
    vietnamese: 'Tâm / Thức (Khả năng nhận biết cảnh)',
    pali: 'Citta',
    sanskrit: 'Citta (चित्त)',
    hanTu: '心 / 識',
    pinyin: 'Xīn / Shì',
    english: 'Consciousness / Mind State',
  },
  domain: 'phat-hoc',
  subCategory: 'Abhidhamma',
  canonicalDefinition: 'Thực tại tối hậu có đặc tính thuần túy là nhận biết cảnh.',
  sources: [
    {
      sourceTitle: 'Dhammasaṅgaṇī',
      sectionRef: 'Mātika & Citta-uppāda-kaṇḍa § 1',
      ptsRef: 'Dhs 1-9',
    },
    {
      sourceTitle: 'Abhidhammattha-saṅgaha',
      sectionRef: 'Chương 1: Citta-pariccheda',
    },
  ],
  coverage: 'canonical',
};

export const classicalSystemNodeFixture: SystemNode = {
  id: 'sys-iching-01',
  code: 'Q01',
  title: 'Thuần Càn (Bát Thuần Càn)',
  domain: 'huyen-hoc',
  systemType: 'iching_64',
  lexiconRefId: 'lex-iching-qian',
  attributes: {
    hexagramNumber: 1,
    upperTrigram: 'Càn (Trời / Kim)',
    lowerTrigram: 'Càn (Trời / Kim)',
    element: 'Kim',
    nature: 'Đại Cát - Nguyên Hanh Lợi Trinh',
    judgmentText: 'Càn: Nguyên, Hanh, Lợi, Trinh.',
    imageText: 'Thiên hành kiện, quân tử dĩ tự cường bất tức.',
  },
  canonicalMeaning: 'Sức mạnh cương kiện, chủ động kiến tạo của Vũ trụ.',
  sources: [
    {
      sourceTitle: 'Chu Dịch (Zhou Yi)',
      sectionRef: 'Thoán Truyện & Tượng Truyện - Quẻ Càn',
    },
  ],
  coverage: 'canonical',
};

export const stubProvenanceFixture: LexiconEntry = {
  id: 'lex-stub-sample',
  slug: 'stub-sample',
  terms: {
    vietnamese: 'Khái Niệm Thử Nghiệm',
    english: 'Draft Term Concept',
  },
  domain: 'triet-hoc',
  subCategory: 'Tam Thuc',
  canonicalDefinition: 'Định nghĩa đang được đối chiếu từ tài liệu phác thảo.',
  provenanceNote: 'Ghi chép thảo luận sơ bộ chưa có ấn bản kinh văn xác thực.',
  sources: [],
  coverage: 'stub',
};

export const specialCharsNodeFixture: SystemNode = {
  id: 'sys-special-01',
  code: 'SPEC01',
  title: 'Phân Tích 100% Citta & Cetasika #1',
  domain: 'phat-hoc',
  systemType: 'citta_89_121',
  attributes: {
    cittaNumber: 1,
    plane: 'kāmāvacara',
    cittaType: 'kusala',
    roots: ['Vô Tham', 'Vô Sân'],
    feeling: 'somanassa',
    prompting: 'asaṅkhārika',
    associatedCetasikaCount: 19,
  },
  canonicalMeaning: 'Định nghĩa với ký tự đặc biệt: A & B % C _ D # E {F} ~ G ^ H',
  sources: [
    {
      sourceTitle: 'Chu Dịch & Hệ Từ Thượng (Zhou Yi & Xi Ci)',
      sectionRef: 'Chương 1: § 1 & 2 % Special_Note #1 {A}',
    },
  ],
  coverage: 'canonical',
};
