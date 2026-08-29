import type { MatrixRelation } from '../../types/scholarSuite';

export const MATRIX_RELATION_REGISTRY: MatrixRelation[] = [
  // -------------------------------------------------------------
  // Matrix 1: Citta × Cetasika Association (Sampayoga Naya)
  // -------------------------------------------------------------
  {
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
  },
  {
    id: 'rel-c01-cet07',
    matrixType: 'citta_cetasika',
    rowNodeId: 'sys-citta-01',
    colNodeId: 'sys-cetasika-07',
    relationType: 'associates',
    strength: 5,
    evidenceLevel: 'canonical',
    canonicalEvidence:
      'Tâm sở Tác Ý (Manasikāra) dẫn dắt Tâm Tham 1 nhắm vào đối tượng khả ái, đặc biệt là Phi như lý tác ý (Ayonisomanasikāra).',
    interpretiveNote:
      'Định hướng chú ý sai lầm là điều kiện tiên quyết cho sự sinh khởi của tham ái.',
    sources: [
      {
        sourceTitle: 'Abhidhammattha-saṅgaha',
        sectionRef: 'Chương 2: Cetasika-saṅgaha-vibhāga',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'rel-c01-cet18',
    matrixType: 'citta_cetasika',
    rowNodeId: 'sys-citta-01',
    colNodeId: 'sys-cetasika-18',
    relationType: 'associates',
    strength: 5,
    evidenceLevel: 'canonical',
    canonicalEvidence:
      'Tâm sở Tham (Lobha) là thành phần cấu trúc cốt lõi của Tâm Tham 1 (Lobha-mūla Citta).',
    interpretiveNote:
      'Sự dính mắc bám chặt vào đối tượng tạo thành nhân tố chủ đạo của tâm tham ái.',
    sources: [
      {
        sourceTitle: 'Abhidhammattha-saṅgaha',
        sectionRef: 'Chương 2: Cetasika-saṅgaha § Lobhasampayoga',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'rel-c09-cet01',
    matrixType: 'citta_cetasika',
    rowNodeId: 'sys-citta-09',
    colNodeId: 'sys-cetasika-01',
    relationType: 'associates',
    strength: 5,
    evidenceLevel: 'canonical',
    canonicalEvidence:
      'Tâm sở Xúc đồng sanh trong 18 tâm sở của Tâm Sân 1.',
    interpretiveNote:
      'Sự va chạm với đối tượng bất toại nguyện kích hoạt phản ứng sân hận.',
    sources: [
      {
        sourceTitle: 'Abhidhammattha-saṅgaha',
        sectionRef: 'Chương 2: Cetasika-saṅgaha-vibhāga',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'rel-c13-cet01',
    matrixType: 'citta_cetasika',
    rowNodeId: 'sys-citta-13',
    colNodeId: 'sys-cetasika-01',
    relationType: 'associates',
    strength: 5,
    evidenceLevel: 'canonical',
    canonicalEvidence:
      'Nhãn thức vô nhân chỉ đồng sanh với 7 tâm sở Biến hành (trong đó Xúc là sở hữu đầu tiên).',
    interpretiveNote:
      'Cấu trúc tâm thức tối giản nhất trong 89 tâm chỉ gồm Thức và 7 biến hành.',
    sources: [
      {
        sourceTitle: 'Abhidhammattha-saṅgaha',
        sectionRef: 'Chương 2: Cetasika-saṅgaha-vibhāga § Ahetuka-sampayoga',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'rel-c31-cet01',
    matrixType: 'citta_cetasika',
    rowNodeId: 'sys-citta-31',
    colNodeId: 'sys-cetasika-01',
    relationType: 'associates',
    strength: 5,
    evidenceLevel: 'canonical',
    canonicalEvidence:
      'Tâm Đại Thiện 1 tương ưng 38 tâm sở (gồm đủ 13 Tợ tha và 25 Tịnh hảo tâm sở), trong đó Xúc là sở hữu biến hành nền tảng.',
    interpretiveNote:
      'Nền tảng của tâm thiện bắt nguồn từ sự tiếp xúc tỉnh giác với đối tượng khả kính.',
    sources: [
      {
        sourceTitle: 'Abhidhammattha-saṅgaha',
        sectionRef: 'Chương 2: Cetasika-saṅgaha § Sobhanasampayoga',
      },
    ],
    coverage: 'canonical',
  },

  // -------------------------------------------------------------
  // Matrix 2: Patthana Condition × Citta
  // -------------------------------------------------------------
  {
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
  },

  // -------------------------------------------------------------
  // Matrix 3: Cross-Domain Scholarly Synthesis
  // -------------------------------------------------------------
  {
    id: 'rel-hex01-sysc01',
    matrixType: 'cross_domain_synthesis',
    rowNodeId: 'sys-iching-01',
    colNodeId: 'sys-citta-01',
    relationType: 'corresponds',
    strength: 4,
    evidenceLevel: 'commentary',
    canonicalEvidence:
      'Khảo cứu Dịch lý & Tâm học: Năng lượng thuần dương của Càn khi bị vô minh chi phối chuyển hóa thành động lực tham đắm chiếm hữu (Vô minh biến Càn thành Dục).',
    interpretiveNote:
      'Sự đối chiếu giữa năng lượng tạo tác thuần túy và hướng đích của tâm thức.',
    sources: [
      {
        sourceTitle: 'Đối Chiếu Đông Phương Học',
        sectionRef: 'Khảo luận Dịch Lý & A-Tỳ-Đàm',
      },
    ],
    coverage: 'verified',
  },
  {
    id: 'rel-hex02-syscet02',
    matrixType: 'cross_domain_synthesis',
    rowNodeId: 'sys-iching-02',
    colNodeId: 'sys-cetasika-02',
    relationType: 'corresponds',
    strength: 4,
    evidenceLevel: 'commentary',
    canonicalEvidence:
      'Đức Khôn (tiếp nhận, dung dưỡng) tương đồng với chức năng của Tâm Sở Thọ (Vedanā) trong việc thụ hưởng và cảm nhận toàn bộ tính chất của cảnh giới.',
    interpretiveNote:
      'Đặc tính thụ cảm như mặt đất đón nhận mưa nắng của trời.',
    sources: [
      {
        sourceTitle: 'Đối Chiếu Đông Phương Học',
        sectionRef: 'Khảo luận Dịch Lý & A-Tỳ-Đàm',
      },
    ],
    coverage: 'verified',
  },
  {
    id: 'rel-hex11-syscet12',
    matrixType: 'cross_domain_synthesis',
    rowNodeId: 'sys-iching-11',
    colNodeId: 'sys-cetasika-12',
    relationType: 'corresponds',
    strength: 4,
    evidenceLevel: 'commentary',
    canonicalEvidence:
      'Quẻ Địa Thiên Thái (Trời đất giao hòa, thái bình) phản ánh trạng thái hoan hỷ tươi nhuận của Tâm Sở Hỷ (Pīti) khi tâm thức đạt sự hài hòa nội tại.',
    interpretiveNote:
      'Trạng thái an lạc tràn ngập cả thân và tâm khi không còn xung đột phân hóa.',
    sources: [
      {
        sourceTitle: 'Đối Chiếu Đông Phương Học',
        sectionRef: 'Khảo luận Dịch Lý & A-Tỳ-Đàm',
      },
    ],
    coverage: 'verified',
  },
];
