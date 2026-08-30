import type { SourceAttribution, CompletenessState } from '../../types/scholarSuite';

export type TcmCategory = 'kinh-huyet' | 'tang-tuong' | 'duoc-tinh' | 'bat-cuong';

export interface TcmEntry {
  id: string;
  slug: string;
  conceptId: string;
  nameVi: string;
  nameHanTu: string;
  pinyin: string;
  hanViet: string;
  englishGloss: string;
  category: TcmCategory;
  subCategory?: string;
  summary: string;
  tcmAttributes: {
    meridianCode?: string;       // Mã kinh huyệt chuẩn WHO (e.g. 'LI4', 'ST36')
    pointLocation?: string;      // Vị trí giải phẫu định vị huyệt
    indications?: string[];      // Chủ trị
    needlingNotes?: string;      // Độ sâu / cấm kỵ châm
    nature?: string;             // Tứ khí (Đại nhiệt, Ôn, Bình, Lương, Hàn)
    flavor?: string[];           // Ngũ vị (Ngọt, Đắng, Cay, Chua, Mặn)
    channelTropism?: string[];   // Quy kinh (Tỳ, Phế, Tâm, Can, Thận...)
    primaryAction?: string;      // Công năng chính
    contraindications?: string;  // Cấm kỵ
    fiveElements?: string;       // Ngũ hành (Kim, Mộc, Thủy, Hỏa, Thổ)
    yinYangPolarity?: string;    // 'Âm (Tạng)' | 'Dương (Phủ)'
    governingAspect?: string;    // Chủ quản sinh lý
  };
  sources: SourceAttribution[];
  coverage: CompletenessState;
}

/**
 * Traditional Chinese Medicine (TCM) Seed Registry - Wave 1 Dataset (14 Core Entries)
 * 5 Acupoints, 5 Zang-Fu Theory Concepts, 4 Classical Materia Medica Herbs.
 */
export const TCM_REGISTRY: TcmEntry[] = [
  // -------------------------------------------------------------
  // 1. Kinh Lạc & Huyệt Vị (5 Đại Huyệt Cốt Lõi)
  // -------------------------------------------------------------
  {
    id: 'tcm-point-hegu',
    slug: 'hegu',
    conceptId: 'concept:tcm:point:hegu',
    nameVi: 'Hợp Cốc',
    nameHanTu: '合谷',
    pinyin: 'Hégǔ',
    hanViet: 'Hợp Cốc',
    englishGloss: 'Joining Valleys',
    category: 'kinh-huyet',
    subCategory: 'Thủ Dương Minh Đại Trường Kinh',
    summary: 'Huyệt Nguyên của kinh Đại Trường, chủ trị các bệnh vùng đầu mặt, răng hàm, thanh nhiệt giải biểu và chỉ thống.',
    tcmAttributes: {
      meridianCode: 'LI4',
      pointLocation: 'Ở mu bàn tay, giữa xương bàn ngón tay 1 và 2, chỗ lồi cao cơ khép ngón cái khi khép ngón cái sát ngón trỏ.',
      indications: ['Đau đầu', 'Đau răng', 'Liệt mặt', 'Sốt không mồ hôi', 'Đau họng'],
      needlingNotes: 'Châm thẳng 0.5 - 1.0 thốn. Cấm châm sâu và kích thích mạnh cho phụ nữ có thai.',
    },
    sources: [
      {
        sourceTitle: 'Châm Cứu Giáp Ất Kinh',
        sectionRef: 'Quyển 3 - Thủ Dương Minh Đại Trường Kinh',
        standardEdition: 'Viện Y Học Cổ Truyền Việt Nam',
      },
      {
        sourceTitle: 'WHO Standard Acupuncture Point Locations',
        sectionRef: 'LI4 (Hegu)',
        standardEdition: 'World Health Organization Western Pacific Region',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'tcm-point-zusanli',
    slug: 'zusanli',
    conceptId: 'concept:tcm:point:zusanli',
    nameVi: 'Túc Tam Lý',
    nameHanTu: '足三里',
    pinyin: 'Zúsānlǐ',
    hanViet: 'Túc Tam Lý',
    englishGloss: 'Leg Three Miles',
    category: 'kinh-huyet',
    subCategory: 'Túc Dương Minh Vị Kinh',
    summary: 'Huyệt Hợp của kinh Vị, là một trong những đại huyệt trường thọ bổ dưỡng tỳ vị, nâng cao chính khí toàn thân.',
    tcmAttributes: {
      meridianCode: 'ST36',
      pointLocation: 'Dưới mắt gối ngoài (Độc Tỵ) 3 thốn, cách mào chày trước 1 khoát ngón tay (khoảng 1 thốn).',
      indications: ['Đau dạ dày', 'Đầy bụng khó tiêu', 'Nôn mửa', 'Cơ thể suy nhược', 'Liệt chi dưới'],
      needlingNotes: 'Châm thẳng 1.0 - 1.5 thốn, cứu ngải rất tốt để bồi bổ nguyên khí.',
    },
    sources: [
      {
        sourceTitle: 'Châm Cứu Đại Thành',
        sectionRef: 'Quyển 6 - Túc Dương Minh Vị Kinh',
        standardEdition: 'Dương Kế Châu',
      },
      {
        sourceTitle: 'WHO Standard Acupuncture Point Locations',
        sectionRef: 'ST36 (Zusanli)',
        standardEdition: 'World Health Organization Western Pacific Region',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'tcm-point-baihui',
    slug: 'baihui',
    conceptId: 'concept:tcm:point:baihui',
    nameVi: 'Bách Hội',
    nameHanTu: '百會',
    pinyin: 'Bǎihuì',
    hanViet: 'Bách Hội',
    englishGloss: 'Hundred Convergences',
    category: 'kinh-huyet',
    subCategory: 'Đốc Mạch',
    summary: 'Nơi hội tụ của các đường kinh dương và Đốc mạch, chủ thăng dương ích khí, an thần khai khiếu và tức phong.',
    tcmAttributes: {
      meridianCode: 'GV20',
      pointLocation: 'Ở đỉnh đầu, giao điểm của đường dọc giữa đầu và đường nối hai đỉnh vành tai.',
      indications: ['Đau đỉnh đầu', 'Hoa mắt chóng mặt', 'Sa trực tràng', 'Sa tử cung', 'Mất ngủ'],
      needlingNotes: 'Châm luồn dưới da 0.3 - 0.5 thốn, hướng mũi kim ra trước hoặc sau.',
    },
    sources: [
      {
        sourceTitle: 'Hoàng Đế Nội Kinh - Linh Khu',
        sectionRef: 'Thiên Căn Kết',
        standardEdition: 'Bộ Y Tế',
      },
      {
        sourceTitle: 'WHO Standard Acupuncture Point Locations',
        sectionRef: 'GV20 (Baihui)',
        standardEdition: 'World Health Organization Western Pacific Region',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'tcm-point-neiguan',
    slug: 'neiguan',
    conceptId: 'concept:tcm:point:neiguan',
    nameVi: 'Nội Quan',
    nameHanTu: '內關',
    pinyin: 'Nèiguān',
    hanViet: 'Nội Quan',
    englishGloss: 'Inner Gate',
    category: 'kinh-huyet',
    subCategory: 'Thủ Quyết Âm Tâm Bào Kinh',
    summary: 'Huyệt Lạc của kinh Tâm Bào, giao hội với Âm Duy mạch, có công năng định tâm an thần, lý khí chỉ thống vùng ngực bụng.',
    tcmAttributes: {
      meridianCode: 'PC6',
      pointLocation: 'Trên lằn chỉ cổ tay 2 thốn, giữa hai gân cơ gan tay lớn và gân cơ gan tay bé.',
      indications: ['Đau thắt ngực', 'Hồi hộp đánh trống ngực', 'Mất ngủ', 'Nôn mửa nấc cụt', 'Say tàu xe'],
      needlingNotes: 'Châm thẳng 0.5 - 1.0 thốn, có thể châm thấu sang Ngoại Quan (TE5).',
    },
    sources: [
      {
        sourceTitle: 'Châm Cứu Giáp Ất Kinh',
        sectionRef: 'Quyển 3 - Thủ Quyết Âm Tâm Bào Kinh',
        standardEdition: 'Hoàng Phủ Mật',
      },
      {
        sourceTitle: 'WHO Standard Acupuncture Point Locations',
        sectionRef: 'PC6 (Neiguan)',
        standardEdition: 'World Health Organization Western Pacific Region',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'tcm-point-sanyinjiao',
    slug: 'sanyinjiao',
    conceptId: 'concept:tcm:point:sanyinjiao',
    nameVi: 'Tam Âm Giao',
    nameHanTu: '三陰交',
    pinyin: 'Sānyīnjiāo',
    hanViet: 'Tam Âm Giao',
    englishGloss: 'Three Yin Intersection',
    category: 'kinh-huyet',
    subCategory: 'Túc Thái Âm Tỳ Kinh',
    summary: 'Điểm giao hội của ba kinh âm vùng chân (Tỳ, Can, Thận), chủ trị các bệnh lý phụ khoa, sinh dục, tiết niệu và kiện tỳ hóa thấp.',
    tcmAttributes: {
      meridianCode: 'SP6',
      pointLocation: 'Ở sát bờ sau trong xương chày, trên đỉnh mắt cá trong 3 thốn.',
      indications: ['Kinh nguyệt không đều', 'Thống kinh', 'Bí tiểu', 'Di tinh', 'Mất ngủ', 'Đầy bụng tiêu chảy'],
      needlingNotes: 'Châm thẳng 1.0 - 1.5 thốn. Cấm châm sâu cho phụ nữ mang thai vì có tác dụng dục sản khai khiếu.',
    },
    sources: [
      {
        sourceTitle: 'Châm Cứu Đại Thành',
        sectionRef: 'Quyển 6 - Túc Thái Âm Tỳ Kinh',
        standardEdition: 'Dương Kế Châu',
      },
      {
        sourceTitle: 'WHO Standard Acupuncture Point Locations',
        sectionRef: 'SP6 (Sanyinjiao)',
        standardEdition: 'World Health Organization Western Pacific Region',
      },
    ],
    coverage: 'canonical',
  },

  // -------------------------------------------------------------
  // 2. Tạng Tượng & Học Thuyết Căn Bản (5 Tạng Cốt Lõi)
  // -------------------------------------------------------------
  {
    id: 'tcm-zangfu-xin',
    slug: 'xin',
    conceptId: 'concept:tcm:zangfu:xin',
    nameVi: 'Tâm Tạng',
    nameHanTu: '心',
    pinyin: 'Xīn',
    hanViet: 'Tâm',
    englishGloss: 'Heart Organ (Zang)',
    category: 'tang-tuong',
    subCategory: 'Ngũ Tạng',
    summary: 'Tạng quân chủ đứng đầu ngũ tạng, thuộc hành Hỏa, chủ quản huyết mạch và tàng chứa thần minh tâm lý.',
    tcmAttributes: {
      fiveElements: 'Hỏa',
      yinYangPolarity: 'Âm (Tạng)',
      governingAspect: 'Chủ huyết mạch, tàng thần, khai khiếu ra lưỡi, biểu hiện ra sắc mặt.',
      primaryAction: 'Thống lĩnh hoạt động tuần hoàn huyết dịch và ý thức tư duy tinh thần.',
    },
    sources: [
      {
        sourceTitle: 'Hoàng Đế Nội Kinh - Tố Vấn',
        sectionRef: 'Thiên Linh Lan Bí Điển Luận',
        standardEdition: 'Bộ Y Tế',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'tcm-zangfu-gan',
    slug: 'gan',
    conceptId: 'concept:tcm:zangfu:gan',
    nameVi: 'Can Tạng',
    nameHanTu: '肝',
    pinyin: 'Gān',
    hanViet: 'Can',
    englishGloss: 'Liver Organ (Zang)',
    category: 'tang-tuong',
    subCategory: 'Ngũ Tạng',
    summary: 'Tạng tướng quân thuộc hành Mộc, có đặc tính thông xướng điều đạt, chủ sơ tiết khí cơ và tàng trữ huyết dịch.',
    tcmAttributes: {
      fiveElements: 'Mộc',
      yinYangPolarity: 'Âm (Tạng)',
      governingAspect: 'Chủ sơ tiết, tàng huyết, chủ cân, vinh nhuận ra móng tay móng chân, khai khiếu ra mắt.',
      primaryAction: 'Điều hòa cảm xúc khí cơ, tàng trữ dự trữ máu và duy trì hoạt động của hệ gân mạc.',
    },
    sources: [
      {
        sourceTitle: 'Hoàng Đế Nội Kinh - Tố Vấn',
        sectionRef: 'Thiên Ngũ Tạng Sinh Thành',
        standardEdition: 'Bộ Y Tế',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'tcm-zangfu-pi',
    slug: 'pi',
    conceptId: 'concept:tcm:zangfu:pi',
    nameVi: 'Tỳ Tạng',
    nameHanTu: '脾',
    pinyin: 'Pí',
    hanViet: 'Tỳ',
    englishGloss: 'Spleen Organ (Zang)',
    category: 'tang-tuong',
    subCategory: 'Ngũ Tạng',
    summary: 'Gốc của hậu thiên, nguồn sinh hóa khí huyết, thuộc hành Thổ, chủ vận hóa thủy cốc thủy thấp và thống nhiếp huyết.',
    tcmAttributes: {
      fiveElements: 'Thổ',
      yinYangPolarity: 'Âm (Tạng)',
      governingAspect: 'Chủ vận hóa, thống nhiếp huyết dịch, chủ cơ nhục tứ chi, khai khiếu ra miệng, vinh nhuận ra môi.',
      primaryAction: 'Hấp thu chuyển hóa chất dinh dưỡng nuôi dưỡng cơ thể và giữ cho máu lưu hành trong lòng mạch.',
    },
    sources: [
      {
        sourceTitle: 'Hoàng Đế Nội Kinh - Tố Vấn',
        sectionRef: 'Thiên Thái Âm Dương Minh Luận',
        standardEdition: 'Bộ Y Tế',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'tcm-zangfu-fei',
    slug: 'fei',
    conceptId: 'concept:tcm:zangfu:fei',
    nameVi: 'Phế Tạng',
    nameHanTu: '肺',
    pinyin: 'Fèi',
    hanViet: 'Phế',
    englishGloss: 'Lung Organ (Zang)',
    category: 'tang-tuong',
    subCategory: 'Ngũ Tạng',
    summary: 'Tạng hoa cái che chở ngũ tạng, thuộc hành Kim, chủ toàn thân khí, chủ tuyên phát túc giáng và thông điều thủy đạo.',
    tcmAttributes: {
      fiveElements: 'Kim',
      yinYangPolarity: 'Âm (Tạng)',
      governingAspect: 'Chủ khí và hô hấp, chủ tuyên phát túc giáng, thông điều thủy đạo, hợp với bì mao, khai khiếu ra mũi.',
      primaryAction: 'Điều phối hô hấp khí cơ và phân bố tân dịch đều khắp châu thân.',
    },
    sources: [
      {
        sourceTitle: 'Hoàng Đế Nội Kinh - Tố Vấn',
        sectionRef: 'Thiên Kinh Mạch Biệt Luận',
        standardEdition: 'Bộ Y Tế',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'tcm-zangfu-shen',
    slug: 'shen',
    conceptId: 'concept:tcm:zangfu:shen',
    nameVi: 'Thận Tạng',
    nameHanTu: '腎',
    pinyin: 'Shèn',
    hanViet: 'Thận',
    englishGloss: 'Kidney Organ (Zang)',
    category: 'tang-tuong',
    subCategory: 'Ngũ Tạng',
    summary: 'Gốc của tiên thiên, cội nguồn âm dương cơ thể, thuộc hành Thủy, chủ tàng tinh, chủ thủy dịch và nạp khí.',
    tcmAttributes: {
      fiveElements: 'Thủy',
      yinYangPolarity: 'Âm (Tạng)',
      governingAspect: 'Chủ tàng tinh (sinh sản và phát dục), chủ thủy, chủ nạp khí, sinh tủy cốt, khai khiếu ra tai và nhị âm, vinh nhuận ra tóc.',
      primaryAction: 'Nắm giữ nguyên khí bẩm sinh, điều tiết chuyển hóa nước và giữ cho hơi thở đi sâu vào hạ tiêu.',
    },
    sources: [
      {
        sourceTitle: 'Hoàng Đế Nội Kinh - Tố Vấn',
        sectionRef: 'Thiên Thượng Cổ Thiên Chân Luận',
        standardEdition: 'Bộ Y Tế',
      },
    ],
    coverage: 'canonical',
  },

  // -------------------------------------------------------------
  // 3. Dược Tính & Bản Thảo (4 Vị Thượng Phẩm Kinh Điển)
  // -------------------------------------------------------------
  {
    id: 'tcm-herb-renshen',
    slug: 'renshen',
    conceptId: 'concept:tcm:herb:renshen',
    nameVi: 'Nhân Sâm',
    nameHanTu: '人參',
    pinyin: 'Rénshēn',
    hanViet: 'Nhân Sâm',
    englishGloss: 'Ginseng Root',
    category: 'duoc-tinh',
    subCategory: 'Thuốc Bổ Khí',
    summary: 'Vị thuốc đại bổ nguyên khí đứng đầu tứ đại danh dược (Sâm - Nhung - Quế - Phụ), bổ ngũ tạng, an tinh thần.',
    tcmAttributes: {
      nature: 'Ôn / Bình (hơi ấm)',
      flavor: ['Ngọt (Cam)', 'Hơi đắng (Khổ)'],
      channelTropism: ['Tỳ', 'Phế', 'Tâm'],
      primaryAction: 'Đại bổ nguyên khí, phục mạch cố thoát, bổ tỳ ích phế, sinh tân chỉ khát, an thần ích trí.',
      contraindications: 'Kỵ Lê Lô (Lê Lô phản Nhân Sâm), kỵ dùng chung với củ cải trắng và trà đặc.',
    },
    sources: [
      {
        sourceTitle: 'Thần Nông Bản Thảo Kinh',
        sectionRef: 'Thượng phẩm - Thảo bộ',
        standardEdition: 'Tôn Tinh Diễn hiệu đính',
      },
      {
        sourceTitle: 'Bản Thảo Cương Mục',
        sectionRef: 'Quyển 12 - Thảo bộ',
        standardEdition: 'Lý Thời Trân',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'tcm-herb-huangqi',
    slug: 'huangqi',
    conceptId: 'concept:tcm:herb:huangqi',
    nameVi: 'Hoàng Kỳ',
    nameHanTu: '黃芪',
    pinyin: 'Huángqí',
    hanViet: 'Hoàng Kỳ',
    englishGloss: 'Astragalus Root',
    category: 'duoc-tinh',
    subCategory: 'Thuốc Bổ Khí',
    summary: 'Vị thuốc bổ khí thăng dương, cố biểu liễm hãn, thác sang sinh cơ, chuyên trị tỳ khí hư nhược và tự hãn.',
    tcmAttributes: {
      nature: 'Ôn (ấm)',
      flavor: ['Ngọt (Cam)'],
      channelTropism: ['Phế', 'Tỳ'],
      primaryAction: 'Bổ khí thăng dương, cố biểu chỉ hãn, lợi thủy tiêu thũng, sinh cơ liễm sang.',
      contraindications: 'Thực chứng, nhiệt chứng, âm hư dương vượng không nên dùng đơn độc.',
    },
    sources: [
      {
        sourceTitle: 'Bản Thảo Cương Mục',
        sectionRef: 'Quyển 12 - Thảo bộ',
        standardEdition: 'Lý Thời Trân',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'tcm-herb-danggui',
    slug: 'danggui',
    conceptId: 'concept:tcm:herb:danggui',
    nameVi: 'Đương Quy',
    nameHanTu: '當歸',
    pinyin: 'Dāngguī',
    hanViet: 'Đương Quy',
    englishGloss: 'Chinese Angelica Root',
    category: 'duoc-tinh',
    subCategory: 'Thuốc Bổ Huyết',
    summary: 'Đầu vị thuốc bổ huyết trong Đông y, vừa có tác dụng sinh huyết vừa có tác dụng hoạt huyết chỉ thống và nhuận tràng.',
    tcmAttributes: {
      nature: 'Ôn (ấm)',
      flavor: ['Ngọt (Cam)', 'Cay (Tân)'],
      channelTropism: ['Can', 'Tâm', 'Tỳ'],
      primaryAction: 'Bổ huyết hoạt huyết, điều kinh chỉ thống, nhuận tràng thông tiện.',
      contraindications: 'Tỳ hư đại tiện lỏng nát, đầy trướng thấp trệ cẩn thận khi dùng.',
    },
    sources: [
      {
        sourceTitle: 'Thần Nông Bản Thảo Kinh',
        sectionRef: 'Thượng phẩm - Thảo bộ',
        standardEdition: 'Tôn Tinh Diễn hiệu đính',
      },
      {
        sourceTitle: 'Bản Thảo Cương Mục',
        sectionRef: 'Quyển 14 - Thảo bộ',
        standardEdition: 'Lý Thời Trân',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'tcm-herb-gancao',
    slug: 'gancao',
    conceptId: 'concept:tcm:herb:gancao',
    nameVi: 'Cam Thảo',
    nameHanTu: '甘草',
    pinyin: 'Gāncǎo',
    hanViet: 'Cam Thảo',
    englishGloss: 'Licorice Root',
    category: 'duoc-tinh',
    subCategory: 'Thuốc Bổ Khí / Hòa Hoãn',
    summary: 'Quốc lão của trăm vị thuốc, có khả năng điều hòa chư dược, giải độc, ích khí kiện tỳ và chỉ khái.',
    tcmAttributes: {
      nature: 'Bình (sống) / Ôn (chích mật)',
      flavor: ['Ngọt (Cam)'],
      channelTropism: ['Tâm', 'Phế', 'Tỳ', 'Vị'],
      primaryAction: 'Ích khí bổ trung, nhuận phế chỉ khái, thanh nhiệt giải độc, hòa hoãn chỉ thống, điều hòa tính năng các vị thuốc.',
      contraindications: 'Phản Hải Tảo, Đại Kích, Nguyên Hoa, Cam Toại (Thập bát phản).',
    },
    sources: [
      {
        sourceTitle: 'Thần Nông Bản Thảo Kinh',
        sectionRef: 'Thượng phẩm - Thảo bộ',
        standardEdition: 'Tôn Tinh Diễn hiệu đính',
      },
      {
        sourceTitle: 'Bản Thảo Cương Mục',
        sectionRef: 'Quyển 12 - Thảo bộ',
        standardEdition: 'Lý Thời Trân',
      },
    ],
    coverage: 'canonical',
  },
];
