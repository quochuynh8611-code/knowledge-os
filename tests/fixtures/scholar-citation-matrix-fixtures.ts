import type { MatrixRelation } from '../../src/types/scholarSuite';

export const canonicalMatrixRelationFixture: MatrixRelation = {
  id: 'rel-c01-cet01',
  matrixType: 'citta_cetasika',
  rowNodeId: 'sys-citta-01',
  colNodeId: 'sys-cetasika-01',
  relationType: 'associates',
  strength: 5,
  evidenceLevel: 'canonical',
  canonicalEvidence:
    'Tâm sở Xúc là 1 trong 7 biến hành luôn đồng sanh với Tâm Tham 1 (19 tâm sở phối hợp).',
  interpretiveNote:
    'Không thể có tâm tham ái khởi lên mà không có sự xúc chạm giác quan (Căn - Cảnh - Thức).',
  sources: [
    {
      sourceTitle: 'Abhidhammattha-saṅgaha',
      sectionRef: 'Chương 2: Cetasika-saṅgaha-vibhāga',
    },
  ],
  coverage: 'canonical',
};

export const patthanaMatrixRelationFixture: MatrixRelation = {
  id: 'rel-p01-c01',
  matrixType: 'patthana_condition',
  rowNodeId: 'sys-patthana-01',
  colNodeId: 'sys-citta-01',
  relationType: 'conditions',
  strength: 5,
  evidenceLevel: 'canonical',
  canonicalEvidence:
    '2 Căn bất thiện (Tham & Si) trong Tâm Tham 1 đóng vai trò là Căn Duyên (Hetu-paccaya) trợ lực cho toàn bộ trạng thái tâm bất thiện.',
  interpretiveNote:
    'Căn tham và si bám rễ sâu tạo thành động lực duy trì hành vi tìm kiếm khoái lạc vị kỷ.',
  sources: [
    {
      sourceTitle: 'Paṭṭhāna (Bộ Vị Trí)',
      sectionRef: 'Hetupaccaya-niddesa § 1',
      ptsRef: 'Paṭṭh I 1',
    },
  ],
  coverage: 'canonical',
};

export const conjectureMatrixRelationFixture: MatrixRelation = {
  id: 'rel-hex01-sysc01',
  matrixType: 'cross_domain_synthesis',
  rowNodeId: 'sys-iching-01',
  colNodeId: 'sys-citta-01',
  relationType: 'corresponds',
  strength: 4,
  evidenceLevel: 'scholarly_conjecture',
  canonicalEvidence:
    'Khảo cứu Dịch lý & Tâm học: Năng lượng thuần dương của Càn khi bị vô minh chi phối chuyển hóa thành động lực tham đắm chiếm hữu.',
  interpretiveNote:
    'Sự đối chiếu giả thuyết giữa năng lượng tạo tác thuần túy và hướng đích của tâm thức.',
  sources: [
    {
      sourceTitle: 'Đối Chiếu Đông Phương Học',
      sectionRef: 'Khảo luận Dịch Lý & A-Tỳ-Đàm § 12',
    },
  ],
  coverage: 'verified',
};

export const stubMatrixRelationFixture: MatrixRelation = {
  id: 'rel-stub-01',
  matrixType: 'cross_domain_synthesis',
  rowNodeId: 'sys-iching-02',
  colNodeId: 'sys-citta-09',
  relationType: 'opposes',
  evidenceLevel: 'scholarly_conjecture',
  provenanceNote: 'Phác thảo nghiên cứu ban đầu, chưa đối chiếu văn bản nguồn.',
  sources: [],
  coverage: 'stub',
};

export const reverseRelationFixture: MatrixRelation = {
  id: 'rel-cet01-c01',
  matrixType: 'citta_cetasika',
  rowNodeId: 'sys-cetasika-01',
  colNodeId: 'sys-citta-01',
  relationType: 'associates',
  strength: 5,
  evidenceLevel: 'canonical',
  canonicalEvidence: 'Tâm sở Xúc tương hợp cùng Tâm Tham 1.',
  sources: [
    {
      sourceTitle: 'Abhidhammattha-saṅgaha',
      sectionRef: 'Chương 2: Cetasika-saṅgaha-vibhāga',
    },
  ],
  coverage: 'canonical',
};
