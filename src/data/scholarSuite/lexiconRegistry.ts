import type { LexiconEntry } from '../../types/scholarSuite';

export const LEXICON_REGISTRY: LexiconEntry[] = [
  // -------------------------------------------------------------
  // 1. Phật Học Cốt Lõi (Abhidhamma & Sutta)
  // -------------------------------------------------------------
  {
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
    etymology: {
      root: '√cit (nhận thức, tư duy)',
      morphology: 'cit + ta (quá khứ phân từ danh từ hóa)',
      literalMeaning: 'Cái gì tích lũy và nhận biết đối tượng (Arammaṇa)',
    },
    canonicalDefinition:
      'Thực tại tối hậu (Paramattha-dhamma) có đặc tính thuần túy là nhận biết cảnh (Arammaṇa-vijānana-lakkhaṇaṁ). Trong Abhidhamma phân định 89 tâm (hoặc 121 tâm mở rộng).',
    interpretiveNotes:
      'Tương đương với khái niệm pure consciousness / subjective awareness trong triết học tâm trí và khoa học thần kinh hiện đại.',
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
  },
  {
    id: 'lex-pali-cetasika',
    slug: 'cetasika',
    terms: {
      vietnamese: 'Tâm Sở / Sở Hữu Tâm (52 Tâm Sở)',
      pali: 'Cetasika',
      sanskrit: 'Caitasika (चैतसिक)',
      hanTu: '心所 / 心數',
      pinyin: 'Xīnsuǒ',
      english: 'Mental Factors / Concomitants of Consciousness',
    },
    domain: 'phat-hoc',
    subCategory: 'Abhidhamma',
    etymology: {
      root: 'cetas (tâm thức) + ika (thuộc về)',
      morphology: 'cetasika (thuộc tính của tâm)',
      literalMeaning: 'Các trạng thái tâm lý nương vào tâm mà hiện khởi',
    },
    canonicalDefinition:
      'Các trạng thái tâm lý đồng sanh (Ekuppāda), đồng diệt (Ekanirodha), đồng nương một căn (Ekavatthuka), và đồng bắt một cảnh (Ekārammaṇa) với Tâm.',
    interpretiveNotes:
      'Là các đơn vị cấu trúc vi mô của cảm xúc, nhận thức, động cơ và ý chí trong phân tâm học Phật giáo.',
    sources: [
      {
        sourceTitle: 'Abhidhammattha-saṅgaha',
        sectionRef: 'Chương 2: Cetasika-pariccheda',
      },
      {
        sourceTitle: 'Atthasālinī',
        sectionRef: 'Cetasikakaṇḍa § 107',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-pali-sobhana',
    slug: 'sobhana',
    terms: {
      vietnamese: 'Tịnh Hảo (24 Tâm Dục Giới Tịnh Hảo / Sobhana)',
      pali: 'Sobhana',
      sanskrit: 'Śobhana (शोभन)',
      hanTu: '淨美 / 善美心',
      pinyin: 'Jìngměi Xīn',
      english: 'Beautiful / Wholesome Conscious States',
    },
    domain: 'phat-hoc',
    subCategory: 'Abhidhamma',
    etymology: {
      root: '√subh (thanh tịnh, tốt đẹp, sáng chói)',
      literalMeaning: 'Các trạng thái tâm thức đẹp đẽ, trong sáng, đi kèm với các căn tịnh hảo (Vô tham, Vô sân, Vô si)',
    },
    canonicalDefinition:
      'Nhóm 24 tâm thức thuộc cõi Dục giới đi kèm với các yếu tố tâm lý thiện hảo (gồm 8 Đại Thiện, 8 Đại Quả, và 8 Đại Duy Tác). Là nền tảng thực hành Giới - Định - Tuệ.',
    interpretiveNotes:
      'Tương đương với các trạng thái tâm lý tích cực (Positive Psychology, Prosocial States, Eudaimonia).',
    sources: [
      {
        sourceTitle: 'Abhidhammattha-saṅgaha',
        sectionRef: 'Chương 1: Kāmāvacara-sobhana-citta',
      },
      {
        sourceTitle: 'Dhammasaṅgaṇī',
        sectionRef: 'Kusaladhamma-niddesa § 1-364',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-pali-ahetuka',
    slug: 'ahetuka',
    terms: {
      vietnamese: 'Vô Nhân (18 Tâm Vô Nhân / Ahetuka)',
      pali: 'Ahetuka',
      sanskrit: 'Ahetuka (अहेतुक)',
      hanTu: '無因心',
      pinyin: 'Wúyīn Xīn',
      english: 'Rootless Consciousness',
    },
    domain: 'phat-hoc',
    subCategory: 'Abhidhamma',
    etymology: {
      root: 'a (tiền tố phủ định không) + hetu (nhân, căn rễ)',
      literalMeaning: 'Không đi kèm với 6 tâm sở căn (Tham, Sân, Si, Vô tham, Vô sân, Vô si)',
    },
    canonicalDefinition:
      'Nhóm 18 trạng thái tâm thức thụ động hoặc sơ khởi (gồm 7 Quả bất thiện, 8 Quả thiện vô nhân, và 3 Duy tác vô nhân). Đóng vai trò tiếp nhận thụ cảm giác quan và chuyển hướng tâm thức.',
    interpretiveNotes:
      'Tương đương với các phản xạ thần kinh sơ cấp và tiến trình xử lý thông tin giác quan tiền ý thức (Pre-attentive Sensorimotor Processing).',
    sources: [
      {
        sourceTitle: 'Abhidhammattha-saṅgaha',
        sectionRef: 'Chương 1: Ahetuka-citta-vibhāga',
      },
      {
        sourceTitle: 'Dhammasaṅgaṇī',
        sectionRef: 'Ahetuka-vipāka-niddesa § 431-576',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-pali-vitakka',
    slug: 'vitakka',
    terms: {
      vietnamese: 'Tầm (Tâm sở hướng tâm áp đặt vào cảnh)',
      pali: 'Vitakka',
      sanskrit: 'Vitarka (वितर्क)',
      hanTu: '尋 / 覺',
      pinyin: 'Xún',
      english: 'Initial Application of Mind / Directed Thought',
    },
    domain: 'phat-hoc',
    subCategory: 'Abhidhamma',
    etymology: {
      root: 'vi (biệt phân) + √takk (suy nghĩ, định hướng)',
      literalMeaning: 'Nâng đỡ và đưa tâm áp sát vào đối tượng',
    },
    canonicalDefinition:
      'Tâm sở Biệt cảnh thứ 1 trong nhóm 6 Pakiṇṇaka. Đặc tính là nâng tâm lên đối tượng (Cittassa ārammaṇe abhiniropana-lakkhaṇo). Là chi thiền thứ nhất của Sơ thiền.',
    interpretiveNotes:
      'Tương đương với thao tác định hướng chú ý tập trung chủ động (Active Attentional Focus) trong tâm lý học nhận thức.',
    sources: [
      {
        sourceTitle: 'Atthasālinī',
        sectionRef: 'Vitakkakaṇḍa § 114',
      },
      {
        sourceTitle: 'Visuddhimagga',
        sectionRef: 'Chương IV: Pathamajjhāna-niddesa',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-pali-lobha-mula',
    slug: 'lobha-mula',
    terms: {
      vietnamese: 'Tham Căn (Tâm sở Tham ái / Lobha)',
      pali: 'Lobha',
      sanskrit: 'Lobha (लोभ)',
      hanTu: '貪根 / 貪心所',
      pinyin: 'Tāngēn',
      english: 'Greed / Attachment / Craving',
    },
    domain: 'phat-hoc',
    subCategory: 'Abhidhamma',
    etymology: {
      root: '√lubh (khao khát, dính mắc, bám víu)',
      literalMeaning: 'Bám dính lấy đối tượng như nhựa cây dính vào da',
    },
    canonicalDefinition:
      'Tâm sở bất thiện đứng đầu nhóm Tham phần (Lobhatika). Đặc tính là dính mắc cảnh (Ārammaṇagahaṇa-lakkhaṇo), phận sự là đam mê (Abhisaṅga-raso).',
    interpretiveNotes:
      'Tương đương với cơ chế phần thưởng và sự thôi thúc dopaminergic (Reward-seeking Addiction Cycle).',
    sources: [
      {
        sourceTitle: 'Atthasālinī',
        sectionRef: 'Lobhakaṇḍa § 249',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-pali-manasikara',
    slug: 'manasikara',
    terms: {
      vietnamese: 'Tác Ý (Hướng tâm đến đối tượng)',
      pali: 'Manasikāra',
      sanskrit: 'Manaskāra (मनस्कार)',
      hanTu: '作意',
      pinyin: 'Zuòyì',
      english: 'Attention / Mental Orientation',
    },
    domain: 'phat-hoc',
    subCategory: 'Abhidhamma',
    etymology: {
      root: 'manas (ý) + √kṛ / kāra (tác thành, tạo tác)',
      literalMeaning: 'Đặt tâm vào đối tượng',
    },
    canonicalDefinition:
      'Tâm sở Biến hành thứ 7 có phận sự dẫn dắt và hướng các pháp đồng sanh vào đúng đối tượng (Sāraṇaraso). Gồm Như lý tác ý (Yonisomanasikāra) và Phi như lý tác ý (Ayonisomanasikāra).',
    interpretiveNotes:
      'Tương đương với cơ chế chú ý chọn lọc (Selective Attention) trong tâm lý học nhận thức.',
    sources: [
      {
        sourceTitle: 'Atthasālinī',
        sectionRef: 'Manasikāraniddesa § 133',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-pali-paticcasamuppada',
    slug: 'paticcasamuppada',
    terms: {
      vietnamese: 'Duyên Khởi / Thập Nhị Nhân Duyên',
      pali: 'Paṭiccasamuppāda',
      sanskrit: 'Pratītyasamutpāda (प्रतीत्यसमुत्पाद)',
      hanTu: '十二因緣 / 緣起',
      pinyin: 'Yuánqǐ / Shí\'èr Yīnyuán',
      english: 'Dependent Origination / Interdependent Co-Arising',
    },
    domain: 'phat-hoc',
    subCategory: 'Sutta / Abhidhamma',
    etymology: {
      root: 'paṭi + √i (nương vào) + sam + ud + √pad (đồng sanh khởi)',
      morphology: 'paṭicca (bất biến từ) + samuppāda (danh từ khởi sanh)',
      literalMeaning: 'Nương gá lẫn nhau mà cùng sanh khởi',
    },
    canonicalDefinition:
      'Quy luật phổ quát về sự tương liên nhân quả: "Imasmiṁ sati idaṁ hoti, Imass’uppādā idaṁ uppajjati" (Cái này có thì cái kia có; cái này sanh thì cái kia sanh). Gồm 12 chi phần vận hành trong 3 thời.',
    interpretiveNotes:
      'Hệ thống lý thuyết tương hỗ phi tuyến tính, có tính tương đồng sâu sắc với Lý thuyết hệ thống phức hợp (Complex Systems Theory) và Cơ học lượng tử.',
    sources: [
      {
        sourceTitle: 'Saṁyutta Nikāya (Tương Ưng Bộ)',
        sectionRef: 'SN 12 Nidāna-saṁyutta',
        ptsRef: 'SN II 1-133',
      },
      {
        sourceTitle: 'Visuddhimagga (Thanh Tịnh Đạo)',
        sectionRef: 'Chương XVII: Paññā-bhūmi-niddesa',
      },
    ],
    coverage: 'canonical',
  },

  // -------------------------------------------------------------
  // 2. Huyền Học & Dịch Lý (I Ching & Eastern Cosmogony)
  // -------------------------------------------------------------
  {
    id: 'lex-iching-qian',
    slug: 'iching-qian',
    terms: {
      vietnamese: 'Thuần Càn (Trời / Cương Kiện)',
      pali: '—',
      sanskrit: '—',
      hanTu: '乾為天',
      pinyin: 'Qián wéi Tiān',
      english: 'The Creative / Pure Yang Heaven',
    },
    domain: 'huyen-hoc',
    subCategory: 'Kinh Dịch',
    etymology: {
      root: 'Chữ Càn (乾): gồm chữ Trúc/Nhật (ánh sáng mặt trời vươn lên) và chữ Khất (vận động không ngừng)',
      morphology: 'Lục hào thuần Dương (⚊⚊⚊⚊⚊⚊)',
      literalMeaning: 'Trời, cương dương, chủ động tạo tác',
    },
    canonicalDefinition:
      'Quẻ đầu tiên trong Chu Dịch. Tượng trưng cho năng lượng nguyên khởi, đại diện Đạo của bậc Quân tử không ngừng tự cường (Thiên hành kiện, quân tử dĩ tự cường bất tức). Tứ đức: Nguyên - Hanh - Lợi - Trinh.',
    interpretiveNotes:
      'Trong triết học đối sánh, Càn tương đương với Đại Tinh Tấn Căn (Viriya) và Ý chí sáng tạo chủ động (Active Creative Will).',
    sources: [
      {
        sourceTitle: 'Chu Dịch (Zhou Yi)',
        sectionRef: 'Quẻ Càn (Thoán Từ, Tượng Từ, Văn Ngôn Truyện)',
        standardEdition: 'Thập Dực - Khổng Tử chú giải',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-iching-kun',
    slug: 'iching-kun',
    terms: {
      vietnamese: 'Thuần Khôn (Đất / Nhu Thuận)',
      pali: '—',
      sanskrit: '—',
      hanTu: '坤為地',
      pinyin: 'Kūn wéi Dì',
      english: 'The Receptive / Pure Yin Earth',
    },
    domain: 'huyen-hoc',
    subCategory: 'Kinh Dịch',
    etymology: {
      root: 'Chữ Khôn (坤): gồm chữ Thổ (đất) và chữ Thân (duỗi ra, trải rộng)',
      morphology: 'Lục hào thuần Âm (⚋⚋⚋⚋⚋⚋)',
      literalMeaning: 'Đất, nhu thuận, dung nạp vạn vật',
    },
    canonicalDefinition:
      'Quẻ thứ hai trong Chu Dịch. Tượng trưng cho đức dày chở che muôn loài (Địa thế khôn, quân tử dĩ hậu đức tải vật). Đức nhu thuận, tùy thời tiếp nhận tạo hóa.',
    interpretiveNotes:
      'Tương đương với Tâm Từ Vô Lượng (Mettā) và Hạnh Nhẫn Nhục Ba La Mật (Khanti-pāramī).',
    sources: [
      {
        sourceTitle: 'Chu Dịch (Zhou Yi)',
        sectionRef: 'Quẻ Khôn (Thoán Từ, Tượng Từ, Văn Ngôn Truyện)',
        standardEdition: 'Thập Dực - Khổng Tử chú giải',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-iching-zhun',
    slug: 'iching-zhun',
    terms: {
      vietnamese: 'Thủy Lôi Truân (Sơ Khởi Gian Nan)',
      pali: '—',
      sanskrit: '—',
      hanTu: '水雷屯',
      pinyin: 'Shuǐ Léi Zhūn',
      english: 'Difficulty at the Beginning / Initial Sprouting',
    },
    domain: 'huyen-hoc',
    subCategory: 'Kinh Dịch',
    etymology: {
      root: 'Chữ Truân (屯): mầm cây cong queo đội đất trồi lên trong bão tố',
      morphology: 'Thượng Khảm (Nước/Hiểm) + Hạ Chấn (Sấm/Động)',
      literalMeaning: 'Gian nan lúc khởi đầu, tích lũy nội lực',
    },
    canonicalDefinition:
      'Quẻ thứ ba trong Chu Dịch. Biểu thị giai đoạn vạn vật mới sinh đầy trắc trở; quân tử cần kiến thiết quy củ và tìm kiếm hiền tài.',
    interpretiveNotes:
      'Tương đương với giai đoạn sơ cơ phát tâm tu tập cần nương tựa Thiện tri thức (Kalyāṇamitta).',
    sources: [
      {
        sourceTitle: 'Chu Dịch (Zhou Yi)',
        sectionRef: 'Quẻ Truân (Thoán Từ, Tượng Từ)',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-iching-tai',
    slug: 'iching-tai',
    terms: {
      vietnamese: 'Địa Thiên Thái (Thông Suốt / Thái Hòa)',
      pali: '—',
      sanskrit: '—',
      hanTu: '地天泰',
      pinyin: 'Dì Tiān Tài',
      english: 'Peace / Harmonious Intercourse',
    },
    domain: 'huyen-hoc',
    subCategory: 'Kinh Dịch',
    etymology: {
      root: 'Chữ Thái (泰): bình an, hanh thông, trật tự hòa điệu',
      morphology: 'Thượng Khôn (Đất) + Hạ Càn (Trời)',
      literalMeaning: 'Khí Trời giáng xuống, khí Đất thăng lên, âm dương giao hòa',
    },
    canonicalDefinition:
      'Quẻ thứ 11 trong Chu Dịch. Tượng trưng cho thái bình thịnh trị, tiểu nhân vãng, quân tử lai, cát hanh.',
    interpretiveNotes:
      'Tương ứng với trạng thái tâm Thiện câu hành Hỷ Xả trong trạng thái cân bằng nội tâm hoàn hảo.',
    sources: [
      {
        sourceTitle: 'Chu Dịch (Zhou Yi)',
        sectionRef: 'Quẻ Thái (Thoán Từ, Tượng Từ)',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-iching-pi',
    slug: 'iching-pi',
    terms: {
      vietnamese: 'Thiên Địa Bĩ (Bế Tắc / Bất Giao)',
      pali: '—',
      sanskrit: '—',
      hanTu: '天地否',
      pinyin: 'Tiān Dì Pǐ',
      english: 'Standstill / Stagnation / Obstruction',
    },
    domain: 'huyen-hoc',
    subCategory: 'Kinh Dịch',
    etymology: {
      root: 'Chữ Bĩ (否): bế tắc, không tương thông',
      morphology: 'Thượng Càn (Trời) + Hạ Khôn (Đất)',
      literalMeaning: 'Trời bay lên trên, Đất chìm xuống dưới, âm dương chia lìa bế tắc',
    },
    canonicalDefinition:
      'Quẻ thứ 12 trong Chu Dịch. Tượng trưng cho thời kỳ suy thoái bế tắc; quân tử cần kiệm đức tỵ nạn, không dùng vinh hoa lộc vị.',
    interpretiveNotes:
      'Tương ứng với trạng thái tâm Si Vô Minh ngăn che Chánh kiến.',
    sources: [
      {
        sourceTitle: 'Chu Dịch (Zhou Yi)',
        sectionRef: 'Quẻ Bĩ (Thoán Từ, Tượng Từ)',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-iching-kan',
    slug: 'iching-kan',
    terms: {
      vietnamese: 'Thuần Khảm (Nước / Trùng Trùng Hiểm Trở)',
      pali: '—',
      sanskrit: '—',
      hanTu: '坎為水',
      pinyin: 'Kǎn wéi Shuǐ',
      english: 'The Abysmal Water / Repeated Danger',
    },
    domain: 'huyen-hoc',
    subCategory: 'Kinh Dịch',
    etymology: {
      root: 'Chữ Khảm (坎): hố sâu, hiểm địa, dòng nước chảy xiết',
      morphology: 'Lục hào: Dương hãm giữa hai Âm (☵ trên ☵)',
      literalMeaning: 'Nước chảy không ngừng, giữ tâm kiên định vượt hiểm nguy',
    },
    canonicalDefinition:
      'Quẻ thứ 29 trong Chu Dịch. Tượng trưng cho sự hiểm nguy trùng điệp; người có lòng thành tín (duy tâm hanh) thì hành động sẽ được tôn kính.',
    interpretiveNotes:
      'Tương ứng với các Thác loạn phiền não (Ogha / Ásava) trong biển luân hồi Dukkha.',
    sources: [
      {
        sourceTitle: 'Chu Dịch (Zhou Yi)',
        sectionRef: 'Quẻ Khảm (Thoán Từ, Tượng Từ)',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-iching-li',
    slug: 'iching-li',
    terms: {
      vietnamese: 'Thuần Ly (Lửa / Sáng Suốt & Nương Tựa)',
      pali: '—',
      sanskrit: '—',
      hanTu: '離為火',
      pinyin: 'Lí wéi Huǒ',
      english: 'The Clinging Fire / Radiance',
    },
    domain: 'huyen-hoc',
    subCategory: 'Kinh Dịch',
    etymology: {
      root: 'Chữ Ly (離): gắn bó, nương gá, tỏa sáng rực rỡ',
      morphology: 'Lục hào: Âm nương giữa hai Dương (☲ trên ☲)',
      literalMeaning: 'Lửa phải nương củi mới sáng; người phải nương chính đạo mới rạng rỡ',
    },
    canonicalDefinition:
      'Quẻ thứ 30 trong Chu Dịch. Tượng trưng cho trí tuệ sáng suốt, khả năng soi tỏ vạn vật (Trùng minh dĩ lệ hồ chính, hóa thành thiên hạ).',
    interpretiveNotes:
      'Tương ứng với Tuệ Căn (Paññā-indriya) và Ánh sáng Trí tuệ Phật pháp (Dhammāloka).',
    sources: [
      {
        sourceTitle: 'Chu Dịch (Zhou Yi)',
        sectionRef: 'Quẻ Ly (Thoán Từ, Tượng Từ)',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-qimen-dunjia',
    slug: 'qimen-dunjia',
    terms: {
      vietnamese: 'Kỳ Môn Độn Giáp (Tam Thức)',
      pali: '—',
      sanskrit: '—',
      hanTu: '奇門遁甲',
      pinyin: 'Qí Mén Dùn Jiǎ',
      english: 'Qi Men Dun Jia / Esoteric Spatiotemporal Matrix',
    },
    domain: 'huyen-hoc',
    subCategory: 'Tam Thức',
    etymology: {
      root: 'Kỳ (Tam Kỳ: Ất Bính Đinh) + Môn (Bát Môn) + Độn (Ẩn tàng) + Giáp (Thủ lĩnh Thiên can)',
      literalMeaning: 'Cửa kỳ diệu ẩn giấu can Giáp',
    },
    canonicalDefinition:
      'Mô hình toán học phương Đông kết hợp không-thời gian dựa trên Cửu Cung Lạc Thư, Bát Quái, Tam Kỳ, Lục Nghi, Cửu Tinh, Bát Môn và Bát Thần để tối ưu hóa quyết định hành động.',
    interpretiveNotes:
      'Một dạng bản đồ trường năng lượng tương hỗ giữa Địa từ trường và Tâm thức học.',
    provenanceNote: 'Khảo cứu từ Hoàng Đế Âm Phù Kinh và Kỳ Môn Độn Giáp Bí Kíp Toàn Thư',
    sources: [
      {
        sourceTitle: 'Kỳ Môn Độn Giáp Bí Kíp Toàn Thư',
        sectionRef: 'Tổng luận Khởi Cục & Cửu Cung Bát Môn',
      },
    ],
    coverage: 'verified',
  },
  {
    id: 'lex-pali-rupavacara',
    slug: 'rupavacara',
    terms: {
      vietnamese: 'Sắc Giới Tâm (15 Tâm Sắc Giới)',
      pali: 'Rūpāvacara Citta',
      sanskrit: 'Rūpāvacara Citta (रूपावचर चित्त)',
      hanTu: '色界心',
      pinyin: 'Sèjiè Xīn',
      english: 'Fine-Material-Sphere Consciousness',
    },
    domain: 'phat-hoc',
    subCategory: 'Abhidhamma',
    etymology: {
      root: 'rūpa (sắc chất tinh tế) + avacara (vận hành, cảnh giới di chuyển)',
      morphology: 'rūpāvacara (thuộc cõi sắc giới thiền định)',
      literalMeaning: 'Tâm thức vận hành trong cảnh giới định sắc',
    },
    canonicalDefinition:
      'Nhóm 15 tâm thức thuộc cõi Sắc Giới sinh khởi qua sự chứng đắc 5 tầng thiền (Sơ thiền, Nhị thiền, Tam thiền, Tứ thiền, Ngũ thiền), gồm 5 Thiện, 5 Quả và 5 Duy Tác.',
    interpretiveNotes:
      'Trạng thái định sâu lắng loại trừ 5 triền cái và tràn ngập hỷ lạc thanh tịnh.',
    sources: [
      {
        sourceTitle: 'Dhammasaṅgaṇī',
        sectionRef: 'Rūpāvacarakusala § 160-268',
      },
      {
        sourceTitle: 'Abhidhammattha-saṅgaha',
        sectionRef: 'Chương 1 § Rūpāvacara-citta',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-pali-arupavacara',
    slug: 'arupavacara',
    terms: {
      vietnamese: 'Vô Sắc Giới Tâm (12 Tâm Vô Sắc Giới)',
      pali: 'Arūpāvacara Citta',
      sanskrit: 'Arūpāvacara Citta (अरूपावचर चित्त)',
      hanTu: '無色界心',
      pinyin: 'Wúsèjiè Xīn',
      english: 'Immaterial-Sphere Consciousness',
    },
    domain: 'phat-hoc',
    subCategory: 'Abhidhamma',
    etymology: {
      root: 'a (không) + rūpa (sắc) + avacara (cảnh giới)',
      morphology: 'arūpāvacara (thuộc cõi vô sắc)',
      literalMeaning: 'Tâm thức vượt qua mọi ý niệm về sắc tướng vật lý',
    },
    canonicalDefinition:
      'Nhóm 12 tâm thức chứng đạt 4 tầng thiền vô sắc (Không vô biên, Thức vô biên, Vô sở hữu, Phi tưởng phi phi tưởng xứ), gồm 4 Thiện, 4 Quả và 4 Duy Tác.',
    interpretiveNotes:
      'Cảnh giới tâm thức trừu tượng thuần túy, hoàn toàn xả ly sắc pháp hữu hạn.',
    sources: [
      {
        sourceTitle: 'Dhammasaṅgaṇī',
        sectionRef: 'Arūpāvacarakusala § 269-276',
      },
      {
        sourceTitle: 'Abhidhammattha-saṅgaha',
        sectionRef: 'Chương 1 § Arūpāvacara-citta',
      },
    ],
    coverage: 'canonical',
  },
  {
    id: 'lex-pali-lokuttara',
    slug: 'lokuttara',
    terms: {
      vietnamese: 'Siêu Thế Tâm (8 Tâm Đạo & Quả Siêu Thế)',
      pali: 'Lokuttara Citta',
      sanskrit: 'Lokottara Citta (लोकोत्तर चित्त)',
      hanTu: '出世間心',
      pinyin: 'Chūshìjiān Xīn',
      english: 'Supramundane Consciousness',
    },
    domain: 'phat-hoc',
    subCategory: 'Abhidhamma',
    etymology: {
      root: 'loka (thế gian) + uttara (vượt lên trên, siêu việt)',
      morphology: 'lokuttara (vượt thoát tam giới luân hồi)',
      literalMeaning: 'Tâm thức vượt thoát mọi trói buộc của thế gian',
    },
    canonicalDefinition:
      'Nhóm 8 tâm lấy Niết Bàn (Nibbāna) làm đối tượng trực tiếp: 4 Tâm Đạo (Sotāpatti, Sakadāgāmī, Anāgāmī, Arahatta Magga) diệt trừ kiết sử và 4 Tâm Quả (Phala) thụ hưởng an lạc giải thoát.',
    interpretiveNotes:
      'Đỉnh cao giác ngộ tối hậu trong Vi Diệu Pháp, chấm dứt hoàn toàn tiến trình 12 Nhân Duyên Vô Minh.',
    sources: [
      {
        sourceTitle: 'Dhammasaṅgaṇī',
        sectionRef: 'Lokuttarakusala § 277-364',
      },
      {
        sourceTitle: 'Abhidhammattha-saṅgaha',
        sectionRef: 'Chương 1 § Lokuttara-citta',
      },
    ],
    coverage: 'canonical',
  },
];
