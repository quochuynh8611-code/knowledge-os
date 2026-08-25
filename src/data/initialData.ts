import { Category, Topic, Note, Resource, Tag } from "../types";

export const INITIAL_CATEGORIES: Category[] = [
  // Phật Học (Theravāda & Triết học Đại Thừa)
  {
    id: "cat-tam-tang",
    name: "Tam Tạng (Tipiṭaka)",
    slug: "tam-tang",
    type: "phat-hoc",
    description:
      "Ba tạng thánh điển Phật giáo: Tạng Kinh (Sutta), Tạng Luật (Vinaya) và Tạng Luận (Abhidhamma).",
    icon: "Scroll",
    color: "#D97706",
  },
  {
    id: "cat-abhidharma",
    name: "Abhidharma (Vi Diệu Pháp)",
    slug: "abhidharma",
    type: "phat-hoc",
    description:
      "Thắng Pháp Tạng - Hệ thống phân tích thực tại tối hậu gồm Tâm (Citta), Tâm Sở (Cetasika), Sắc Pháp (Rūpa) và Niết Bàn (Nibbāna).",
    icon: "BookOpen",
    color: "#B45309",
  },
  {
    id: "cat-thien-dinh",
    name: "Thiền Định (Bhāvanā)",
    slug: "thien-dinh",
    type: "phat-hoc",
    description:
      "Phương pháp tu tập tâm thức: Thiền Chỉ (Samatha) và Thiền Quán Minh Sát (Vipassanā).",
    icon: "Sparkles",
    color: "#059669",
  },
  {
    id: "cat-triet-hoc-phat-giao",
    name: "Triết Học Phật Giáo",
    slug: "triet-hoc-phat-giao",
    type: "phat-hoc",
    description:
      "Bát Nhã Ba La Mật Đa (Prajñāpāramitā), Trung Quán Luận (Mūlamadhyamakakārikā) và Duyên Khởi Luận.",
    icon: "Feather",
    color: "#7C3AED",
  },

  // Huyền Học Phương Đông
  {
    id: "cat-tam-thuc",
    name: "Tam Thức (Kỳ Môn - Thái Ất - Lục Nhâm)",
    slug: "tam-thuc",
    type: "huyen-hoc",
    description:
      "Ba môn chiêm bốc và dự trắc thời không tối cao của cổ học phương Đông: Thiên - Địa - Nhân.",
    icon: "Compass",
    color: "#2563EB",
  },
  {
    id: "cat-dich-hoc",
    name: "Dịch Học (Kinh Dịch)",
    slug: "dich-hoc",
    type: "huyen-hoc",
    description:
      "Đạo biến dịch của vũ trụ, Tiên Thiên - Hậu Thiên Bát Quái và hệ thống 64 Quẻ Dịch.",
    icon: "CircleDot",
    color: "#C026D3",
  },
  {
    id: "cat-phong-thuy",
    name: "Phong Thủy Học",
    slug: "phong-thuy",
    type: "huyen-hoc",
    description:
      "Khoa học điều hòa khí trường môi trường thông qua Loan Đầu hình thể và Huyền Không Lý Khí.",
    icon: "Mountain",
    color: "#0284C7",
  },
  {
    id: "cat-tu-vi-tu-tru",
    name: "Tử Vi & Tứ Trụ",
    slug: "tu-vi-tu-tru",
    type: "huyen-hoc",
    description:
      "Mệnh lý học phương Đông: Tinh bàn Tử Vi Đẩu Số và Bát Tự Hà Lạc / Tử Bình.",
    icon: "Layers",
    color: "#4F46E5",
  },
];

export const INITIAL_TAGS: Tag[] = [
  {
    id: "tag-1",
    name: "Abhidharma",
    slug: "abhidharma",
    color: "#D97706",
    count: 9,
  },
  {
    id: "tag-2",
    name: "Vi Diệu Pháp",
    slug: "vi-dieu-phap",
    color: "#B45309",
    count: 5,
  },
  {
    id: "tag-3",
    name: "Luận Tạng",
    slug: "luan-tang",
    color: "#92400E",
    count: 8,
  },
  {
    id: "tag-4",
    name: "Thiền Định",
    slug: "thien-dinh",
    color: "#059669",
    count: 4,
  },
  {
    id: "tag-5",
    name: "Vipassana",
    slug: "vipassana",
    color: "#10B981",
    count: 3,
  },
  { id: "tag-6", name: "Kỳ Môn", slug: "ky-mon", color: "#2563EB", count: 2 },
  {
    id: "tag-7",
    name: "Tam Thức",
    slug: "tam-thuc",
    color: "#1D4ED8",
    count: 4,
  },
  {
    id: "tag-8",
    name: "Phong Thủy",
    slug: "phong-thuy",
    color: "#0D9488",
    count: 3,
  },
  {
    id: "tag-9",
    name: "Kinh Dịch",
    slug: "kinh-dich",
    color: "#C026D3",
    count: 4,
  },
  { id: "tag-10", name: "Tử Vi", slug: "tu-vi", color: "#4F46E5", count: 4 },
  {
    id: "tag-11",
    name: "Bát Nhã",
    slug: "bat-nha",
    color: "#7C3AED",
    count: 4,
  },
  {
    id: "tag-12",
    name: "Duyên Hệ",
    slug: "duyen-he",
    color: "#F59E0B",
    count: 2,
  },
];

export const INITIAL_TOPICS: Topic[] = [
  // 1. TOPIC LEGACY 1
  {
    id: "topic-abhidharma-tong-quan",
    title: "Abhidharma - Vi Diệu Pháp Toàn Tập",
    slug: "abhidharma-vi-dieu-phap",
    categoryId: "cat-abhidharma",
    categorySlug: "abhidharma",
    categoryName: "Abhidharma (Vi Diệu Pháp)",
    type: "phat-hoc",
    description:
      "Giáo lý cao siêu phân tích thực tại tối hậu thành 4 Pháp Thực Tính (Paramattha): Tâm (Citta), Tâm Sở (Cetasika), Sắc Pháp (Rūpa) và Niết Bàn (Nibbāna).",
    tags: ["Abhidharma", "Vi Diệu Pháp", "Luận Tạng"],
    content: `## 1. Khái Niệm & Tổng Quan Về Abhidharma
Abhidhamma Piṭaka (Tạng Vi Diệu Pháp / Tạng Thắng Pháp) là phần sâu sắc và thâm viễn nhất trong Tam Tạng Phật Giáo Nguyên Thủy Pāli. Nếu như Kinh Tạng (Sutta) dùng ngôn ngữ chế định thế gian (*Sammuti Sacca*) để giảng dạy cho đại chúng theo căn cơ, thì Luận Tạng dùng ngôn ngữ chân đế (*Paramattha Sacca*) để phân tích bản chất tận cùng của vạn hữu.

### 4 Pháp Thực Tính (Paramattha Dhamma):
1. **Tâm (Citta)**: Yếu tố biết cảnh (89 hoặc 121 tâm thức).
2. **Tâm Sở (Cetasika)**: 52 trạng thái tâm lý đồng sanh đồng diệt với tâm (Biến hành, Biệt cảnh, Bất thiện, Tịnh hảo).
3. **Sắc Pháp (Rūpa)**: 28 sắc pháp hữu vi cấu tạo nên thế giới vật chất và thân căn (Tứ đại và Sắc y sinh).
4. **Niết Bàn (Nibbāna)**: Pháp vô vi tuyệt đối, trạng thái tịch diệt hoàn toàn khổ đau và luân hồi.

## 2. 7 Bộ Sách Căn Bản Trong Abhidhamma
- **1. Pháp Tụ (Dhammasaṅgaṇī)**: Bảng phân loại chi tiết các pháp thiện, bất thiện, vô ký.
- **2. Phân Tích (Vibhaṅga)**: Khảo sát 18 đề mục lớn như Uẩn, Xứ, Giới, Đế, Duyên Khởi.
- **3. Chất Ngữ (Dhātukathā)**: Đối chiếu các pháp theo Uẩn, Xứ, Giới.
- **4. Nhân Chế Định (Puggala-paññatti)**: Phân loại các mẫu tính cách và hạng người tu học.
- **5. Ngữ Tông (Kathāvatthu)**: 216 cuộc biện luận giáo lý lịch sử do ngài Moggaliputta Tissa chủ trì tại Đại hội kết tập lần 3.
- **6. Song Đối (Yamaka)**: Dùng phương pháp luận logic đối ngẫu để kiểm tra tính chuẩn xác của các định nghĩa.
- **7. Vị Trí (Paṭṭhāna)**: Tuyệt đỉnh của luận tạng khảo sát 24 Duyên Hệ (*Paccaya*) chi phối vũ trụ và tâm thức.`,
    links: [
      {
        id: "link-1",
        sourceId: "topic-abhidharma-tong-quan",
        targetId: "topic-phap-tu",
        linkType: "prerequisite",
        strength: 5,
        notes:
          "Bộ đầu tiên trong 7 bộ Thắng Pháp luận giải 89 tâm và 52 tâm sở",
      },
      {
        id: "link-2",
        sourceId: "topic-abhidharma-tong-quan",
        targetId: "topic-vi-tri-patthana",
        linkType: "advanced",
        strength: 5,
        notes:
          "Bộ Vị Trí hoàn thiện hệ thống quan hệ duyên hệ của 4 pháp chân đế",
      },
      {
        id: "link-3",
        sourceId: "topic-abhidharma-tong-quan",
        targetId: "topic-thien-vipassana",
        linkType: "related",
        strength: 5,
        notes:
          "Vi Diệu Pháp là nền tảng bản đồ thực nghiệm cho thiền quán Danh Sắc",
      },
      {
        id: "link-4",
        sourceId: "topic-abhidharma-tong-quan",
        targetId: "topic-bat-nha",
        linkType: "related",
        strength: 4,
        notes: "So sánh chân đế Vi Diệu Pháp với Tánh Không Bát Nhã",
      },
    ],
    studyProgress: {
      topicId: "topic-abhidharma-tong-quan",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 2. TOPIC LEGACY 2
  {
    id: "topic-phap-tu",
    title: "Bộ Pháp Tụ (Dhammasangani) - Phân Loại Tâm & Tâm Sở",
    slug: "bo-phap-tu-dhammasangani",
    categoryId: "cat-abhidharma",
    categorySlug: "abhidharma",
    categoryName: "Abhidharma (Vi Diệu Pháp)",
    type: "phat-hoc",
    description:
      "Tác phẩm đầu tiên trong 7 bộ Vi Diệu Pháp, liệt kê và phân loại 89/121 Tâm, 52 Tâm Sở và 28 Sắc Pháp theo Ba Cụm (Tam Đề Tikas) và Hai Cụm (Nhị Đề Dukas).",
    tags: ["Abhidharma", "Vi Diệu Pháp", "Luận Tạng"],
    content: `## Cấu Trúc Bộ Pháp Tụ
Bộ Pháp Tụ phân định toàn bộ pháp chân đế thành 3 nhóm lớn:
1. **Thiện Pháp (Kusala Dhamma)**
2. **Bất Thiện Pháp (Akusala Dhamma)**
3. **Vô Ký Pháp (Abyākata Dhamma)**

### 52 Tâm Sở Đồng Sanh:
- **7 Biến Hành**: Xúc, Thọ, Tưởng, Tư, Nhất Tâm, Mạng Căn, Tác Ý.
- **6 Biệt Cảnh**: Tầm, Tứ, Thắng Giải, Cần, Hỷ, Dục.
- **14 Bất Thiện**: Si, Vô Tàm, Vô Úy, Phóng Dật, Tham, Tà Kiến, Ngã Mạn, Sân, Tật, Lận, Hối, Hôn Trầm, Thụy Miên, Hoài Nghi.
- **25 Tịnh Hảo**: Tín, Niệm, Tàm, Úy, Vô Tham, Vô Sân, Hành Xả, Thân Khinh An, Tâm Khinh An...`,
    links: [
      {
        id: "link-5",
        sourceId: "topic-phap-tu",
        targetId: "topic-abhidharma-tong-quan",
        linkType: "related",
        strength: 5,
        notes: "Bộ nòng cốt của Thắng Pháp Tạng",
      },
      {
        id: "link-6",
        sourceId: "topic-phap-tu",
        targetId: "topic-thien-vipassana",
        linkType: "advanced",
        strength: 4,
        notes: "Nhận diện tâm sở trực tiếp trong lúc hành thiền",
      },
    ],
    studyProgress: {
      topicId: "topic-phap-tu",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 3. TOPIC LEGACY 3
  {
    id: "topic-vi-tri-patthana",
    title: "Bộ Vị Trí (Patthana) - 24 Duyên Hệ Tương Sinh",
    slug: "bo-vi-tri-patthana",
    categoryId: "cat-abhidharma",
    categorySlug: "abhidharma",
    categoryName: "Abhidharma (Vi Diệu Pháp)",
    type: "phat-hoc",
    description:
      "Bộ sách đồ sộ và uyên áo nhất giảng giải 24 Duyên Hệ (Paccaya) lý giải mạng lưới nhân duyên tương tác đa chiều của toàn vũ trụ tâm sinh vật lý.",
    tags: ["Abhidharma", "Duyên Hệ", "Vi Diệu Pháp"],
    content: `## Khái Niệm Về 24 Duyên Hệ (24 Paccaya)
24 Duyên Hệ là quy luật tương tác tương duyên chỉ rõ năng lực vận hành giữa Pháp Năng Duyên (*Paccaya Dhamma*) và Pháp Sở Duyên (*Paccayuppanna Dhamma*).

### Các Duyên Nổi Bật:
1. **Nhân Duyên (Hetu Paccaya)**: 6 nhân (Tham, Sân, Si, Vô Tham, Vô Sân, Vô Si).
2. **Cảnh Duyên (Ārammaṇa Paccaya)**: Cảnh giới làm đối tượng cho tâm thức khởi sinh.
3. **Trưởng Duyên (Adhipati Paccaya)**: Năng lực chủ đạo áp đảo (Dục, Cần, Tâm, Thẩm).
4. **Vô Gián Duyên (Anantara Paccaya)**: Tâm trước diệt nhường chỗ cho tâm sau sinh khởi liên tục không kẽ hở.
5. **Đồng Sanh Duyên (Sahajāta Paccaya)**: Cùng sinh và hỗ trợ nhau như ngọn lửa và ánh sáng.
6. **Tiền Sanh Duyên (Purejāta Paccaya)** & **Hậu Sanh Duyên (Pacchājāta Paccaya)**.`,
    links: [
      {
        id: "link-7",
        sourceId: "topic-vi-tri-patthana",
        targetId: "topic-abhidharma-tong-quan",
        linkType: "advanced",
        strength: 5,
        notes: "Bộ tối cao giải thích duyên sinh vạn pháp",
      },
      {
        id: "link-8",
        sourceId: "topic-vi-tri-patthana",
        targetId: "topic-kinh-dich",
        linkType: "related",
        strength: 4,
        notes: "So sánh Duyên Hệ vô thường với Dịch lý biến dịch phương Đông",
      },
    ],
    studyProgress: {
      topicId: "topic-vi-tri-patthana",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 4. TOPIC LEGACY 4
  {
    id: "topic-thien-vipassana",
    title: "Thiền Vipassana (Minh Sát Tuệ) & Tứ Niệm Xứ",
    slug: "thien-vipassana-tu-niem-xu",
    categoryId: "cat-thien-dinh",
    categorySlug: "thien-dinh",
    categoryName: "Thiền Định (Bhāvanā)",
    type: "phat-hoc",
    description:
      "Con đường duy nhất dẫn đến thanh lọc tâm trí, đoạn tận khổ đau qua việc quan sát thực tại Danh - Sắc nơi Thân, Thọ, Tâm, Pháp.",
    tags: ["Thiền Định", "Vipassana"],
    content: `## Bốn Lãnh Vực Tứ Niệm Xứ (Satipaṭṭhāna)
1. **Quán Thân trên Thân (Kāyānupassanā)**: Hơi thở vào ra (*Ānāpānasati*), oai nghi, tứ đại (đất, nước, lửa, gió).
2. **Quán Thọ trên Thọ (Vedanānupassanā)**: Nhận biết cảm thọ lạc, khổ, bất khổ bất lạc với tâm xả ly.
3. **Quán Tâm trên Tâm (Cittānupassanā)**: Nhận biết tâm có tham hay không tham, có sân, có si, tán loạn hay định tĩnh.
4. **Quán Pháp trên Pháp (Dhammānupassanā)**: Nhận rõ Năm Triền Cái, Năm Uẩn, Sáu Xứ, Thất Giác Chi và Bốn Thánh Đế.

## Tiến Trình 16 Tầng Tuệ Giác (Ñāṇa):
- Tuệ Phân Biệt Danh Sắc (*Nāmarūpapariccheda Ñāṇa*)
- Tuệ Duyên Khởi (*Paccaya-pariggaha Ñāṇa*)
- Tuệ Thẩm Sát Tam Tướng (*Sammasana Ñāṇa*)
- Tuệ Sinh Diệt (*Udayabbaya Ñāṇa*)... đến Tuệ Đạo và Tuệ Quả.`,
    links: [
      {
        id: "link-9",
        sourceId: "topic-thien-vipassana",
        targetId: "topic-abhidharma-tong-quan",
        linkType: "prerequisite",
        strength: 5,
        notes: "Nắm vững phân tích Danh Sắc để soi chiếu trong thiền tập",
      },
      {
        id: "link-10",
        sourceId: "topic-thien-vipassana",
        targetId: "topic-bat-nha",
        linkType: "related",
        strength: 5,
        notes:
          "Tuệ giác Minh Sát tương đồng với Bát Nhã chiếu kiến ngũ uẩn giai không",
      },
    ],
    studyProgress: {
      topicId: "topic-thien-vipassana",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 5. TOPIC LEGACY 5
  {
    id: "topic-bat-nha",
    title: "Bát Nhã Ba La Mật Đa & Trung Quán Luận",
    slug: "bat-nha-trung-quan-luan",
    categoryId: "cat-triet-hoc-phat-giao",
    categorySlug: "triet-hoc-phat-giao",
    categoryName: "Triết Học Phật Giáo",
    type: "phat-hoc",
    description:
      "Trí tuệ thấy rõ Tánh Không (Śūnyatā) của vạn pháp - Long Thọ Bồ Tát và lý thuyết Bát Bất Trung Đạo giải trừ nhị biên phân biệt.",
    tags: ["Bát Nhã"],
    content: `## Tinh Yếu Bát Nhã Tâm Kinh & Trung Luận
*“Sắc bất dị Không, Không bất dị Sắc; Sắc tức thị Không, Không tức thị Sắc.”*

### 8 Phủ Định (Bát Bất) của Ngài Long Thọ (Nāgārjuna):
- Bất sinh - Bất diệt (Không sinh - Không diệt)
- Bất thường - Bất đoạn (Không thường còn - Không đứt đoạn)
- Bất nhất - Bất dị (Không phải một - Không phải khác biệt)
- Bất lai - Bất xuất (Không từ đâu đến - Không đi về đâu)

### Hai Chân Lý (Nhị Đế):
1. **Tục Đế (Saṃvṛti-satya)**: Chân lý quy ước thế gian để chỉ bày phương tiện.
2. **Chân Đế (Paramārtha-satya)**: Chân lý tuyệt đối thấy rõ thực tính vô ngã và tánh không.`,
    links: [
      {
        id: "link-11",
        sourceId: "topic-bat-nha",
        targetId: "topic-thien-vipassana",
        linkType: "related",
        strength: 5,
        notes: "Thực nghiệm tánh không qua thiền quán",
      },
      {
        id: "link-12",
        sourceId: "topic-bat-nha",
        targetId: "topic-kinh-dich",
        linkType: "related",
        strength: 3,
        notes:
          "So sánh Tánh Không Phật học với Vô Cực - Thái Cực trong Dịch Học",
      },
    ],
    studyProgress: {
      topicId: "topic-bat-nha",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 6. TOPIC LEGACY 6
  {
    id: "topic-ky-mon-don-giap",
    title: "Kỳ Môn Độn Giáp - Môn Dự Trắc Địa Lý & Bát Trận",
    slug: "ky-mon-don-giap",
    categoryId: "cat-tam-thuc",
    categorySlug: "tam-thuc",
    categoryName: "Tam Thức (Kỳ Môn - Thái Ất - Lục Nhâm)",
    type: "huyen-hoc",
    description:
      "Một trong Tam Thức cổ điển, kết hợp Thiên Can Địa Chi, Bát Môn, Cửu Tinh, Bát Thần và Cửu Cung để mưu sự, chọn thời điểm và điều hướng khí trường phong thủy.",
    tags: ["Kỳ Môn", "Tam Thức"],
    content: `## 1. Bản Chất Của Kỳ Môn Độn Giáp
Kỳ Môn Độn Giáp là môn học địa lý và chiến lược dựa trên sự chuyển động của các nguồn năng lượng vũ trụ tác động lên không gian và thời gian.

### Các Yếu Tố Cấu Thành Bàn Cờ Kỳ Môn:
- **Tam Kỳ**: Ất Kỳ (Nhật Kỳ), Bính Kỳ (Nguyệt Kỳ), Đinh Kỳ (Tinh Kỳ).
- **Lục Nghi**: Mậu, Kỷ, Canh, Tân, Nhâm, Quý (chứa ẩn Giáp).
- **Cửu Tinh (Thiên Bàn)**: Thiên Bồng, Thiên Nhuế, Thiên Xung, Thiên Phụ, Thiên Cầm, Thiên Tâm, Thiên Trụ, Thiên Nhậm, Thiên Anh.
- **Bát Môn (Nhân Bàn)**: Hưu Môn, Sinh Môn, Thương Môn, Đỗ Môn, Cảnh Môn, Tử Môn, Kinh Môn, Khai Môn.
- **Bát Thần (Thần Bàn)**: Trực Phù, Đằng Xà, Thái Âm, Lục Hợp, Bạch Hổ, Huyền Vũ, Cửu Địa, Cửu Thiên.

## 2. Ứng Dụng Trong Nghiên Cứu
- Phân tích cát hung thời không để lựa chọn thời điểm xuất hành, khởi sự.
- Ứng dụng điều chỉnh phong thủy hình thế và lý khí môi trường.
- Dự trắc biến động của sự việc dựa trên thế tương tác giữa Môn - Tinh - Thần - Nghi.`,
    links: [
      {
        id: "link-13",
        sourceId: "topic-ky-mon-don-giap",
        targetId: "topic-thai-at-than-kinh",
        linkType: "related",
        strength: 5,
        notes: "Cùng nằm trong hệ thống Tam Thức cổ học",
      },
      {
        id: "link-14",
        sourceId: "topic-ky-mon-don-giap",
        targetId: "topic-kinh-dich",
        linkType: "prerequisite",
        strength: 5,
        notes: "Kỳ môn bắt nguồn từ Cửu Cung Lạc Thư và Bát Quái",
      },
      {
        id: "link-15",
        sourceId: "topic-ky-mon-don-giap",
        targetId: "topic-phong-thuy-ly-khi",
        linkType: "related",
        strength: 4,
        notes: "Kết hợp hướng thời không với lý khí nhà đất",
      },
    ],
    studyProgress: {
      topicId: "topic-ky-mon-don-giap",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 7. TOPIC LEGACY 7
  {
    id: "topic-thai-at-than-kinh",
    title: "Thái Ất Thần Kinh - Dự Trắc Thiên Vận & Khí Số Quốc Gia",
    slug: "thai-at-than-kinh",
    categoryId: "cat-tam-thuc",
    categorySlug: "tam-thuc",
    categoryName: "Tam Thức (Kỳ Môn - Thái Ất - Lục Nhâm)",
    type: "huyen-hoc",
    description:
      "Môn dự đoán thiên văn và vận thế vĩ mô đỉnh cao trong Tam Thức, nghiên cứu chu kỳ Thái Ất cửu cung và sự dịch chuyển của 16 Thần Sát.",
    tags: ["Tam Thức"],
    content: `## Tổng Quan Về Thái Ất Thần Kinh
Thái Ất coi sao Bắc Đẩu và thiên đế làm trung tâm, dùng Thái Ất thần kim tinh bàn để quán sát thiên tượng, khí hậu và sự biến thiên chu kỳ lớn.

### Các Trọng Cực Trong Thái Ất:
- **Thái Ất 16 Cung**: Vòng xoay Cửu cung và các vị trí chuyển dịch.
- **Chủ Tướng & Khách Tướng**: So sánh lực lượng đối đãi hai bên.
- **72 Cục Thái Ất**: Phân chia theo Dương Độn và Âm Độn.`,
    links: [
      {
        id: "link-16",
        sourceId: "topic-thai-at-than-kinh",
        targetId: "topic-ky-mon-don-giap",
        linkType: "related",
        strength: 5,
        notes: "Tam Thức phối hợp Thiên - Địa",
      },
      {
        id: "link-17",
        sourceId: "topic-thai-at-than-kinh",
        targetId: "topic-kinh-dich",
        linkType: "prerequisite",
        strength: 4,
        notes: "Nền tảng âm dương tiêu trưởng của Dịch học",
      },
    ],
    studyProgress: {
      topicId: "topic-thai-at-than-kinh",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 8. TOPIC LEGACY 8
  {
    id: "topic-kinh-dich",
    title: "Kinh Dịch - Đạo Biến Dịch & 64 Quẻ",
    slug: "kinh-dich-64-que",
    categoryId: "cat-dich-hoc",
    categorySlug: "dich-hoc",
    categoryName: "Dịch Học (Kinh Dịch)",
    type: "huyen-hoc",
    description:
      "Nguồn gốc của mọi môn huyền học phương Đông: Thái Cực sinh Lưỡng Nghi, Lưỡng Nghi sinh Tứ Tượng, Tứ Tượng sinh Bát Quái và 64 Quẻ biến dịch khôn lường.",
    tags: ["Kinh Dịch"],
    content: `## Bản Chất Của Dịch Lý
Dịch có 3 nghĩa: **Biến Dịch** (thay đổi không ngừng), **Bất Dịch** (quy luật cốt lõi vĩnh hằng), và **Giản Dị** (đạo lý cùng tột là giản đơn).

### Cấu Trúc Quẻ Dịch:
- **Tiên Thiên Bát Quái** (Phục Hy): Càn (Trời), Đoài (Đầm), Ly (Lửa), Chấn (Sấm), Tốn (Gió), Khảm (Nước), Cấn (Núi), Khôn (Đất).
- **Hậu Thiên Bát Quái** (Văn Vương): Thể hiện sự vận hành 4 mùa và ngũ hành phương vị.
- **64 Quẻ Kép**: Mỗi quẻ gồm Nội quái và Ngoại quái, 6 hào từ, Thoán từ và Đại Tượng từ.`,
    links: [
      {
        id: "link-18",
        sourceId: "topic-kinh-dich",
        targetId: "topic-ky-mon-don-giap",
        linkType: "related",
        strength: 5,
        notes: "Kỳ Môn ứng dụng Dịch lý vào cửu cung",
      },
      {
        id: "link-19",
        sourceId: "topic-kinh-dich",
        targetId: "topic-phong-thuy-ly-khi",
        linkType: "prerequisite",
        strength: 5,
        notes: "Phong thủy Huyền Không xây dựng trên Hậu Thiên Bát Quái",
      },
      {
        id: "link-20",
        sourceId: "topic-kinh-dich",
        targetId: "topic-tu-vi-dau-so",
        linkType: "prerequisite",
        strength: 4,
        notes: "Can chi và ngũ hành trong Tử Vi bắt nguồn từ Dịch học",
      },
      {
        id: "link-21",
        sourceId: "topic-kinh-dich",
        targetId: "topic-bat-nha",
        linkType: "related",
        strength: 4,
        notes: "Đối chiếu triết học vô thường, dịch biến với tánh không",
      },
    ],
    studyProgress: {
      topicId: "topic-kinh-dich",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 9. TOPIC LEGACY 9
  {
    id: "topic-phong-thuy-ly-khi",
    title: "Phong Thủy Huyền Không Phi Tinh & Bát Trạch",
    slug: "phong-thuy-huyen-khong-phi-tinh",
    categoryId: "cat-phong-thuy",
    categorySlug: "phong-thuy",
    categoryName: "Phong Thủy Học",
    type: "huyen-hoc",
    description:
      "Nghiên cứu sự phân bố vượng suy của Cửu Tinh qua các thời vận (Vận 8 Bát Bạch, Vận 9 Cửu Tử) kết hợp hướng nhà tọa hướng và loan đầu ngoại cảnh.",
    tags: ["Phong Thủy"],
    content: `## 1. Khái Niệm Huyền Không Phi Tinh
Phi tinh nghiên cứu 9 ngôi sao (Nhất Bạch, Nhị Hắc, Tam Bích, Tứ Lục, Ngũ Hoàng, Lục Bạch, Thất Xích, Bát Bạch, Cửu Tử) bay vào 9 cung theo quỹ đạo Lường Thiên Xích.

### Cấu Trúc Tinh Bàn:
- **Vận Tinh**: Tinh bàn trung cung theo vận hiện tại (2024-2043 là Vận 9 Cửu Tử Ly Hỏa).
- **Sơn Tinh**: Quản nhân đinh, sức khỏe, sự hòa thuận của người cư ngụ.
- **Hướng Tinh**: Quản tài lộc, sự nghiệp, dòng tiền và cơ hội.`,
    links: [
      {
        id: "link-22",
        sourceId: "topic-phong-thuy-ly-khi",
        targetId: "topic-kinh-dich",
        linkType: "prerequisite",
        strength: 5,
        notes: "Lạc Thư và Bát Quái là nền tảng tinh bàn",
      },
      {
        id: "link-23",
        sourceId: "topic-phong-thuy-ly-khi",
        targetId: "topic-ky-mon-don-giap",
        linkType: "related",
        strength: 4,
        notes: "Điều chỉnh phong thủy bổ trợ trường khí Kỳ Môn",
      },
    ],
    studyProgress: {
      topicId: "topic-phong-thuy-ly-khi",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 10. TOPIC LEGACY 10
  {
    id: "topic-tu-vi-dau-so",
    title: "Tử Vi Đẩu Số & 14 Chính Tinh Toàn Thư",
    slug: "tu-vi-dau-so-14-chinh-tinh",
    categoryId: "cat-tu-vi-tu-tru",
    categorySlug: "tu-vi-tu-tru",
    categoryName: "Tử Vi & Mệnh Lý",
    type: "huyen-hoc",
    description:
      "Nghệ thuật lập và giải đoán lá số Tử Vi dựa trên giờ, ngày, tháng, năm sinh với 12 cung chức và 14 chính tinh phân cấp miếu hãm đắc địa.",
    tags: ["Tử Vi"],
    content: `## Cấu Trúc Tinh Bàn Tử Vi
Lá số Tử Vi gồm 12 Cung: Mệnh, Phụ Mẫu, Phúc Đức, Điền Trạch, Quan Lộc, Nô Bộc, Thiên Di, Tật Ách, Tài Bạch, Tử Tức, Phu Thê, Huynh Đệ.

### 14 Chính Tinh Trọng Yếu:
- **Chòm Tử Vi**: Tử Vi, Thiên Cơ, Thái Dương, Vũ Khúc, Thiên Đồng, Liêm Trinh.
- **Chòm Thiên Phủ**: Thiên Phủ, Thái Âm, Tham Lang, Cự Môn, Thiên Tướng, Thiên Lương, Thất Sát, Phá Quân.
- **Tứ Hóa Biến Hóa**: Hóa Lộc (tài lộc, sinh khí), Hóa Quyền (quyền năng, hành động), Hóa Khoa (danh tiếng, giải ách), Hóa Kỵ (trở ngại, thử thách, nghiệp duyên).`,
    links: [
      {
        id: "link-24",
        sourceId: "topic-tu-vi-dau-so",
        targetId: "topic-kinh-dich",
        linkType: "prerequisite",
        strength: 4,
        notes: "Ngũ hành sinh khắc can chi",
      },
      {
        id: "link-25",
        sourceId: "topic-tu-vi-dau-so",
        targetId: "topic-thai-at-than-kinh",
        linkType: "related",
        strength: 3,
        notes: "Mệnh lý cá nhân đối chiếu với đại vận thiên văn",
      },
    ],
    studyProgress: {
      topicId: "topic-tu-vi-dau-so",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 11. TOPIC NEW 11: Tạng Kinh Nikāya
  {
    id: "topic-tang-kinh-nikaya",
    title: "Tạng Kinh (Sutta Piṭaka) & 5 Bộ Nikāya",
    slug: "tang-kinh-nikaya",
    categoryId: "cat-tam-tang",
    categorySlug: "tam-tang",
    categoryName: "Tam Tạng (Tipiṭaka)",
    type: "phat-hoc",
    description:
      "Kho tàng giáo lý nguyên thủy của Đức Phật gồm 5 bộ Nikāya: Trường Bộ, Trung Bộ, Tương Ưng Bộ, Tăng Chi Bộ và Tiểu Bộ.",
    tags: ["Luận Tạng", "Thiền Định"],
    content: `## 5 Bộ Nikāya Trong Tạng Kinh
1. **Trường Bộ (Dīgha Nikāya)**: 34 bài kinh dài giảng giải các chuyên đề triết học, đạo đức và thiền quán lớn.
2. **Trung Bộ (Majjhima Nikāya)**: 152 bài kinh trung bình chứa đựng những lời dạy căn bản và thực tiễn nhất.
3. **Tương Ưng Bộ (Saṃyutta Nikāya)**: 5 tập kinh nhóm theo các chủ đề: Uẩn, Xứ, Giới, Đế, Duyên Khởi...
4. **Tăng Chi Bộ (Aṅguttara Nikāya)**: Tập hợp các pháp số tăng dần từ 1 Pháp đến 11 Pháp.
5. **Tiểu Bộ (Khuddaka Nikāya)**: 15 tập kinh gồm Pháp Cú (Dhammapada), Phật Tự Thuyết (Udāna), Phật Thuyết Như Vậy (Itivuttaka)...`,
    links: [
      {
        id: "link-26",
        sourceId: "topic-tang-kinh-nikaya",
        targetId: "topic-tang-luat-vinaya",
        linkType: "related",
        strength: 5,
        notes: "Kinh và Luật là Pháp và Luật tối thượng của bậc Đạo Sư",
      },
      {
        id: "link-27",
        sourceId: "topic-tang-kinh-nikaya",
        targetId: "topic-thien-vipassana",
        linkType: "prerequisite",
        strength: 5,
        notes: "Đại Niệm Xứ nằm trong Trường Bộ và Trung Bộ",
      },
      {
        id: "link-28",
        sourceId: "topic-tang-kinh-nikaya",
        targetId: "topic-abhidharma-tong-quan",
        linkType: "related",
        strength: 4,
        notes: "Kinh Tạng giảng pháp tục đế, Luận Tạng thuyết pháp chân đế",
      },
    ],
    studyProgress: {
      topicId: "topic-tang-kinh-nikaya",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 12. TOPIC NEW 12: Tạng Luật Vinaya
  {
    id: "topic-tang-luat-vinaya",
    title: "Tạng Luật (Vinaya Piṭaka) & Giới Bổn Pātimokkha",
    slug: "tang-luat-vinaya",
    categoryId: "cat-tam-tang",
    categorySlug: "tam-tang",
    categoryName: "Tam Tạng (Tipiṭaka)",
    type: "phat-hoc",
    description:
      "Nền tảng thanh tịnh của Tăng đoàn và đời sống phạm hạnh: Phân Tích Giới Bổn (Suttavibhaṅga), Đại Phẩm (Mahāvagga) và Tiểu Phẩm (Cullavagga).",
    tags: ["Luận Tạng"],
    content: `## Cấu Trúc Tạng Luật Pāli
Tạng Luật là cương lĩnh gìn giữ sự trường tồn của Chánh Pháp:
1. **Phân Tích Giới Đề (Suttavibhaṅga)**: 227 giới Tỳ-kheo (Bhikkhu) và 311 giới Tỳ-kheo-ni (Bhikkhunī).
2. **Đại Phẩm (Mahāvagga)**: Các quy chế thọ giới, an cư kiết hạ, y phục, thuốc men và sinh hoạt Tăng sự.
3. **Tiểu Phẩm (Cullavagga)**: Xử lý tranh chấp, kiến thiết tinh xá và lịch sử kết tập kinh điển.
4. **Tập Yếu (Parivāra)**: Bảng tóm tắt và tra cứu hệ thống luật học.`,
    links: [
      {
        id: "link-29",
        sourceId: "topic-tang-luat-vinaya",
        targetId: "topic-tang-kinh-nikaya",
        linkType: "related",
        strength: 5,
        notes: "Pháp và Luật tương hỗ",
      },
      {
        id: "link-30",
        sourceId: "topic-tang-luat-vinaya",
        targetId: "topic-7-giai-doan-thanh-tinh",
        linkType: "prerequisite",
        strength: 5,
        notes: "Giới Thanh Tịnh là nấc thang đầu tiên của Thất Tịnh",
      },
    ],
    studyProgress: {
      topicId: "topic-tang-luat-vinaya",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 13. TOPIC NEW 13: Tâm & Tâm Sở
  {
    id: "topic-tam-va-tam-so",
    title: "89/121 Tâm & 52 Tâm Sở Đồng Sanh Chi Tiết",
    slug: "tam-va-tam-so",
    categoryId: "cat-abhidharma",
    categorySlug: "abhidharma",
    categoryName: "Abhidharma (Vi Diệu Pháp)",
    type: "phat-hoc",
    description:
      "Bản đồ chi tiết phân loại 89/121 Tâm thức (Citta) và 52 Tâm Sở (Cetasika) đồng sinh đồng diệt trong từng sát-na tâm.",
    tags: ["Abhidharma", "Vi Diệu Pháp"],
    content: `## 89 Tâm Thức (Citta) Phân Loại:
- **Dục Giới Tâm (54)**: 12 Bất Thiện, 18 Vô Nhân, 24 Tịnh Hảo.
- **Sắc Giới Tâm (15)**: 5 Thiện, 5 Quả, 5 Duy Tác (Tương ứng 5 tầng Thiền Sắc Giới).
- **Vô Sắc Giới Tâm (12)**: 4 Thiện, 4 Quả, 4 Duy Tác (Không vô biên, Thức vô biên, Vô sở hữu, Phi tưởng phi phi tưởng).
- **Siêu Thế Tâm (8 hoặc 40)**: 4 Tâm Đạo (Sơ đạo, Nhị đạo, Tam đạo, Tứ đạo) và 4 Tâm Quả tương ứng.

## 52 Tâm Sở Đồng Sanh:
- 13 Tợ Tha (7 Biến Hành + 6 Biệt Cảnh).
- 14 Bất Thiện (Tham, Sân, Si, Tà kiến, Ngã mạn, Hoài nghi...).
- 25 Tịnh Hảo (Tín, Niệm, Tàm, Úy, Vô tham, Vô sân, Trí tuệ...).`,
    links: [
      {
        id: "link-31",
        sourceId: "topic-tam-va-tam-so",
        targetId: "topic-phap-tu",
        linkType: "prerequisite",
        strength: 5,
        notes: "Bộ Pháp Tụ phân tích chi tiết các tâm sở",
      },
      {
        id: "link-32",
        sourceId: "topic-tam-va-tam-so",
        targetId: "topic-sac-phap-rupa",
        linkType: "related",
        strength: 5,
        notes: "Danh pháp và Sắc pháp tương tác",
      },
      {
        id: "link-33",
        sourceId: "topic-tam-va-tam-so",
        targetId: "topic-lo-trinh-tam-citta-vithi",
        linkType: "advanced",
        strength: 5,
        notes: "Tâm và tâm sở vận hành theo lộ trình tâm",
      },
    ],
    studyProgress: {
      topicId: "topic-tam-va-tam-so",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 14. TOPIC NEW 14: Sắc Pháp Rūpa
  {
    id: "topic-sac-phap-rupa",
    title: "28 Sắc Pháp & Bản Chất Vật Chất Hữu Vi",
    slug: "sac-phap-rupa",
    categoryId: "cat-abhidharma",
    categorySlug: "abhidharma",
    categoryName: "Abhidharma (Vi Diệu Pháp)",
    type: "phat-hoc",
    description:
      "Khảo sát 4 Sắc Đại Hiển (Đất, Nước, Lửa, Gió) và 24 Sắc Y Sinh cấu tạo nên thế giới vật chất và thân căn giác quan.",
    tags: ["Abhidharma", "Vi Diệu Pháp"],
    content: `## 28 Sắc Pháp Thực Tính (Rūpa)
1. **4 Sắc Tứ Đại (Mahābhūta)**:
   - Địa đại (Đất - Tính cứng/mềm, nâng đỡ).
   - Thủy đại (Nước - Tính gắn kết, thẩm thấu).
   - Hỏa đại (Lửa - Tính nhiệt độ, thành thục).
   - Phong đại (Gió - Tính chuyển động, căng phồng).
2. **24 Sắc Y Sinh (Upādārūpa)**:
   - 5 Sắc Thần Kinh (Mắt, Tai, Mũi, Lưỡi, Thân).
   - 4 Sắc Cảnh Giới (Sắc, Thinh, Khí, Vị).
   - 2 Sắc Tính Khí (Nam tính, Nữ tính).
   - 1 Sắc Ý Căn (Hadaya-vatthu - Trụ xứ của ý thức).
   - 1 Sắc Mạng Quyền (Jīvitindriya - Duy trì sự sống sắc pháp).
   - 1 Sắc Vật Thực (Ojā - Dinh dưỡng).`,
    links: [
      {
        id: "link-34",
        sourceId: "topic-sac-phap-rupa",
        targetId: "topic-tam-va-tam-so",
        linkType: "related",
        strength: 5,
        notes: "Khảo sát thực tại Danh và Sắc",
      },
      {
        id: "link-35",
        sourceId: "topic-sac-phap-rupa",
        targetId: "topic-thien-vipassana",
        linkType: "related",
        strength: 4,
        notes: "Quán chiếu Sắc pháp qua thân niệm xứ",
      },
    ],
    studyProgress: {
      topicId: "topic-sac-phap-rupa",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 15. TOPIC NEW 15: Lộ Trình Tâm Citta Vīthi
  {
    id: "topic-lo-trinh-tam-citta-vithi",
    title: "Lộ Trình Tâm (Citta Vīthi) & Tiến Trình Tái Sanh",
    slug: "lo-trinh-tam-citta-vithi",
    categoryId: "cat-abhidharma",
    categorySlug: "abhidharma",
    categoryName: "Abhidharma (Vi Diệu Pháp)",
    type: "phat-hoc",
    description:
      "Quy luật chuyển biến của 17 sát-na tâm qua Ngũ Môn Lộ Trình (Nhãn, Nhĩ, Tỷ, Thiệt, Thân) và Ý Môn Lộ Trình trong tiến trình tạo nghiệp và tái sanh.",
    tags: ["Abhidharma", "Vi Diệu Pháp", "Duyên Hệ"],
    content: `## Tiến Trình 17 Sát-Na Tâm Ngũ Môn Lộ:
1. **Atīta Bhavaṅga**: Hữu phần vừa qua.
2. **Bhavaṅga Calana**: Hữu phần rúng động.
3. **Bhavaṅgupaccheda**: Hữu phần dứt dòng.
4. **Pañcadvārāvajjana**: Khai ngũ môn.
5. **Cakkhuviññāṇa**: Nhãn thức (nhìn thấy cảnh sắc).
6. **Sampaṭicchana**: Tiếp thâu tâm.
7. **Santīraṇa**: Thẩm tấn tâm.
8. **Voṭṭhabbana**: Đoán định tâm.
9-15. **Javana (7 sát-na)**: Đổng lực tâm (Tạo nghiệp thiện hoặc ác).
16-17. **Tadārammaṇa (2 sát-na)**: Đồng cảnh tâm, sau đó chìm lại vào dòng Hữu phần.`,
    links: [
      {
        id: "link-36",
        sourceId: "topic-lo-trinh-tam-citta-vithi",
        targetId: "topic-tam-va-tam-so",
        linkType: "prerequisite",
        strength: 5,
        notes: "Hiểu tâm sở để theo dõi từng sát na lộ trình",
      },
      {
        id: "link-37",
        sourceId: "topic-lo-trinh-tam-citta-vithi",
        targetId: "topic-vi-tri-patthana",
        linkType: "advanced",
        strength: 5,
        notes: "Vô gián duyên và đẳng vô gián duyên trong lộ trình tâm",
      },
    ],
    studyProgress: {
      topicId: "topic-lo-trinh-tam-citta-vithi",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 16. TOPIC NEW 16: Bộ Phân Tích Vibhaṅga
  {
    id: "topic-bo-phan-tich-vibhanga",
    title: "Bộ Phân Tích (Vibhaṅga) - 18 Đề Mục Luận Giải",
    slug: "bo-phan-tich-vibhanga",
    categoryId: "cat-abhidharma",
    categorySlug: "abhidharma",
    categoryName: "Abhidharma (Vi Diệu Pháp)",
    type: "phat-hoc",
    description:
      "Tác phẩm thứ 2 trong Thắng Pháp Luận giải Uẩn, Xứ, Giới, Đế, Căn, Duyên Khởi theo 3 phương thức: Kinh Thuyết, Luận Thuyết và Vấn Đáp.",
    tags: ["Abhidharma", "Luận Tạng"],
    content: `## 18 Phẩm Luận Giải Trong Bộ Phân Tích:
- Phân tích Uẩn (Khandha-vibhaṅga), Phân tích Xứ (Āyatana), Phân tích Giới (Dhātu).
- Phân tích Thánh Đế (Sacca), Phân tích Căn (Indriya), Phân tích Duyên Khởi (Paticcasamuppāda).
- Phân tích Niệm Xứ (Satipaṭṭhāna), Chánh Cần (Sammappadhāna), Như Ý Túc (Iddhipāda), Giác Chi (Bojjhaṅga), Đạo Chi (Magga)...
- Mỗi đề mục được đối chiếu chuẩn xác theo góc nhìn thực nghiệm thiền quán.`,
    links: [
      {
        id: "link-38",
        sourceId: "topic-bo-phan-tich-vibhanga",
        targetId: "topic-phap-tu",
        linkType: "related",
        strength: 5,
        notes: "Nối tiếp bảng pháp tụ sang phân tích đề mục",
      },
      {
        id: "link-39",
        sourceId: "topic-bo-phan-tich-vibhanga",
        targetId: "topic-tu-niem-xu-satipatthana",
        linkType: "related",
        strength: 4,
        notes: "Phân tích Tứ Niệm Xứ theo góc độ Thắng Pháp",
      },
    ],
    studyProgress: {
      topicId: "topic-bo-phan-tich-vibhanga",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 17. TOPIC NEW 17: Bộ Chất Ngữ Dhātukathā
  {
    id: "topic-bo-chat-ngu-dhatukatha",
    title: "Bộ Chất Ngữ (Dhātukathā) - Khảo Sát Giới Xứ",
    slug: "bo-chat-ngu-dhatukatha",
    categoryId: "cat-abhidharma",
    categorySlug: "abhidharma",
    categoryName: "Abhidharma (Vi Diệu Pháp)",
    type: "phat-hoc",
    description:
      "Tác phẩm thứ 3 trong Luận Tạng dùng 14 phương thức quy nạp và đối chiếu các pháp chân đế vào 5 Uẩn, 12 Xứ và 18 Giới.",
    tags: ["Abhidharma", "Luận Tạng"],
    content: `## Phương Pháp Quy Nạp Của Bộ Chất Ngữ:
Khảo sát câu hỏi căn bản: *“Một pháp bất kỳ được thâu nhiếp vào Uẩn, Xứ, Giới nào? Tương ưng với tâm sở nào và bất tương ưng với uẩn xứ giới nào?”*
Giúp hành giả không bị nhầm lẫn giữa các pháp danh chế định và thực tính chân đế.`,
    links: [
      {
        id: "link-40",
        sourceId: "topic-bo-chat-ngu-dhatukatha",
        targetId: "topic-bo-phan-tich-vibhanga",
        linkType: "prerequisite",
        strength: 5,
        notes: "Quy nạp các đề mục phân tích về Uẩn, Xứ, Giới",
      },
      {
        id: "link-41",
        sourceId: "topic-bo-chat-ngu-dhatukatha",
        targetId: "topic-tam-va-tam-so",
        linkType: "related",
        strength: 4,
        notes: "Khảo cứu chân đế",
      },
    ],
    studyProgress: {
      topicId: "topic-bo-chat-ngu-dhatukatha",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 18. TOPIC NEW 18: Bộ Nhân Chế Định Puggala-Paññatti
  {
    id: "topic-bo-nhan-che-dinh-puggala",
    title: "Bộ Nhân Chế Định (Puggala-Paññatti) & Căn Cơ Tu Học",
    slug: "bo-nhan-che-dinh-puggala",
    categoryId: "cat-abhidharma",
    categorySlug: "abhidharma",
    categoryName: "Abhidharma (Vi Diệu Pháp)",
    type: "phat-hoc",
    description:
      "Tác phẩm thứ 4 trong Luận Tạng phân loại các hạng người, tính cách tâm lý và cấp bậc tu chứng (Phàm phu, Bậc Hữu học, Bậc Vô học).",
    tags: ["Abhidharma", "Luận Tạng"],
    content: `## Phân Loại Hạng Người Tu Học:
- Hạng người thuận dòng và nghịch dòng ái dục.
- Hạng người Tín căn, Tấn căn, Niệm căn, Định căn, Tuệ căn thắng trội.
- 4 Đôi 8 Hạng Thánh Nhân: Sơ đạo - Sơ quả (Sotāpanna), Nhị đạo - Nhị quả (Sakadāgāmī), Tam đạo - Tam quả (Anāgāmī), Tứ đạo - Tứ quả (Arahant).`,
    links: [
      {
        id: "link-42",
        sourceId: "topic-bo-nhan-che-dinh-puggala",
        targetId: "topic-tang-kinh-nikaya",
        linkType: "related",
        strength: 4,
        notes: "Khảo sát hạng người tương đồng Tăng Chi Bộ",
      },
      {
        id: "link-43",
        sourceId: "topic-bo-nhan-che-dinh-puggala",
        targetId: "topic-7-giai-doan-thanh-tinh",
        linkType: "advanced",
        strength: 4,
        notes: "Các tầng bậc tu chứng của bậc Thánh nhân",
      },
    ],
    studyProgress: {
      topicId: "topic-bo-nhan-che-dinh-puggala",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 19. TOPIC NEW 19: Bộ Ngữ Tông Kathāvatthu
  {
    id: "topic-bo-ngu-tong-kathavatthu",
    title: "Bộ Ngữ Tông (Kathāvatthu) & 216 Biện Luận Lịch Sử",
    slug: "bo-ngu-tong-kathavatthu",
    categoryId: "cat-abhidharma",
    categorySlug: "abhidharma",
    categoryName: "Abhidharma (Vi Diệu Pháp)",
    type: "phat-hoc",
    description:
      "Tác phẩm thứ 5 do ngài Mục Kiền Liên Tử Đế Tu (Moggaliputta Tissa) kết tập tại Đại hội lần 3 bác bỏ 216 tà thuyết của các bộ phái.",
    tags: ["Abhidharma", "Luận Tạng"],
    content: `## 216 Điểm Biện Giải Giáo Lý Cốt Lõi:
- Bác bỏ tà thuyết "Ngã chấp thực có" (Puggalavāda).
- Bác bỏ tà thuyết "Tam thế thực hữu" (Sarvāstivāda).
- Bảo vệ tri kiến Chánh Pháp Nguyên Thủy về Vô Thường, Khổ, Vô Ngã và Niết Bàn tịch tịnh.`,
    links: [
      {
        id: "link-44",
        sourceId: "topic-bo-ngu-tong-kathavatthu",
        targetId: "topic-bo-song-doi-yamaka",
        linkType: "related",
        strength: 5,
        notes: "Phương pháp luận biện giải logic",
      },
      {
        id: "link-45",
        sourceId: "topic-bo-ngu-tong-kathavatthu",
        targetId: "topic-trung-quan-long-tho",
        linkType: "related",
        strength: 4,
        notes: "Đối chiếu nghệ thuật phá tà hiển chánh với Trung Quán",
      },
    ],
    studyProgress: {
      topicId: "topic-bo-ngu-tong-kathavatthu",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 20. TOPIC NEW 20: Bộ Song Đối Yamaka
  {
    id: "topic-bo-song-doi-yamaka",
    title: "Bộ Song Đối (Yamaka) & Phương Pháp Luận Logic",
    slug: "bo-song-doi-yamaka",
    categoryId: "cat-abhidharma",
    categorySlug: "abhidharma",
    categoryName: "Abhidharma (Vi Diệu Pháp)",
    type: "phat-hoc",
    description:
      "Tác phẩm thứ 6 trong Luận Tạng sử dụng hệ thống câu hỏi đối ngẫu thuận nghịch để kiểm tra sự chuẩn xác tuyệt đối của các thuật ngữ giáo lý.",
    tags: ["Abhidharma", "Luận Tạng"],
    content: `## Logic Đối Ngẫu Thuận Nghịch (Yamaka):
Ví dụ khảo sát Căn (Mūla-yamaka):
- *Thuận:* “Pháp nào là Thiện căn, pháp đó có phải là Thiện pháp không?” (Đúng).
- *Nghịch:* “Pháp nào là Thiện pháp, pháp đó có phải là Thiện căn không?” (Không nhất thiết, vì có thiện pháp không phải là thiện căn).
Phương pháp này loại bỏ hoàn toàn các lỗi ngụy biện và mơ hồ trong nhận thức.`,
    links: [
      {
        id: "link-46",
        sourceId: "topic-bo-song-doi-yamaka",
        targetId: "topic-vi-tri-patthana",
        linkType: "prerequisite",
        strength: 5,
        notes: "Chuẩn bị luận lý logic trước khi vào bộ Vị Trí",
      },
      {
        id: "link-47",
        sourceId: "topic-bo-song-doi-yamaka",
        targetId: "topic-phap-tu",
        linkType: "related",
        strength: 4,
        notes: "Thẩm định bảng danh mục pháp tụ",
      },
    ],
    studyProgress: {
      topicId: "topic-bo-song-doi-yamaka",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 21. TOPIC NEW 21: Thiền Chỉ Samatha
  {
    id: "topic-thien-chi-samatha",
    title: "Thiền Định Chỉ (Samatha) & 40 Đề Mục Định Tâm",
    slug: "thien-chi-samatha",
    categoryId: "cat-thien-dinh",
    categorySlug: "thien-dinh",
    categoryName: "Thiền Định (Bhāvanā)",
    type: "phat-hoc",
    description:
      "Phương pháp rèn luyện định lực tâm thức qua 40 đề mục (10 Kasiṇa, 10 Bất tịnh, 10 Tùy niệm, 4 Vô lượng tâm, 4 Vô sắc định, 1 Tưởng, 1 Định).",
    tags: ["Thiền Định"],
    content: `## 40 Đề Mục Thiền Định Samatha:
- **10 Kasiṇa (Biến xứ)**: Đất, Nước, Lửa, Gió, Xanh, Vàng, Đỏ, Trắng, Ánh sáng, Hư không.
- **10 Asubha (Bất tịnh)**: Quán tử thi 10 giai đoạn để dứt trừ tâm tham dục.
- **10 Anussati (Tùy niệm)**: Niệm Phật, Pháp, Tăng, Giới, Thí, Thiên, Chết, Thân, Hơi thở, Tịch tịnh.
- **4 Brahmavihāra (Phạm trú)**: Từ, Bi, Hỷ, Xả.
- **4 Arūpa (Vô sắc)**: Không vô biên, Thức vô biên, Vô sở hữu, Phi tưởng phi phi tưởng xứ.
- **1 Aharepatikulasanna** (Tưởng bất tịnh vật thực) & **1 Catudhatuvavatthana** (Phân tích tứ đại).`,
    links: [
      {
        id: "link-48",
        sourceId: "topic-thien-chi-samatha",
        targetId: "topic-thien-vipassana",
        linkType: "prerequisite",
        strength: 5,
        notes: "Định là nền tảng sinh khởi Tuệ giác",
      },
      {
        id: "link-49",
        sourceId: "topic-thien-chi-samatha",
        targetId: "topic-7-giai-doan-thanh-tinh",
        linkType: "related",
        strength: 5,
        notes: "Tâm Thanh Tịnh trong Thất Tịnh",
      },
    ],
    studyProgress: {
      topicId: "topic-thien-chi-samatha",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 22. TOPIC NEW 22: Tứ Niệm Xứ Satipaṭṭhāna
  {
    id: "topic-tu-niem-xu-satipatthana",
    title: "Tứ Niệm Xứ (Satipaṭṭhāna) - Con Đường Độc Nhất",
    slug: "tu-niem-xu-satipatthana",
    categoryId: "cat-thien-dinh",
    categorySlug: "thien-dinh",
    categoryName: "Thiền Định (Bhāvanā)",
    type: "phat-hoc",
    description:
      "Thực hành Chánh Niệm trọn vẹn trên Thân, Thọ, Tâm, Pháp để đoạn diệt ưu bi, chứng đạt Chánh Trí và Niết Bàn.",
    tags: ["Thiền Định", "Vipassana"],
    content: `## Cương Lĩnh Tứ Niệm Xứ:
*“Này các Tỳ-kheo, đây là con đường độc nhất đưa đến thanh tịnh cho chúng sanh, vượt khỏi sầu não, diệt trừ khổ ưu, thành tựu chánh trí, chứng ngộ Niết Bàn: đó là Bốn Niệm Xứ.”*
- **Quán Thân (Kāya)**: Hơi thở, oai nghi, cử động rõ biết, bất tịnh thể, tứ đại.
- **Quán Thọ (Vedanā)**: Cảm nhận khổ, lạc, xả nơi thân tâm không đồng hóa.
- **Quán Tâm (Citta)**: Nhận biết trạng thái tâm thức hiện tiền.
- **Quán Pháp (Dhamma)**: Soi chiếu ngũ triền cái, ngũ uẩn, thập nhị xứ, thất giác chi, tứ thánh đế.`,
    links: [
      {
        id: "link-50",
        sourceId: "topic-tu-niem-xu-satipatthana",
        targetId: "topic-thien-vipassana",
        linkType: "related",
        strength: 5,
        notes: "Tứ Niệm Xứ là cốt lõi của thiền Minh Sát",
      },
      {
        id: "link-51",
        sourceId: "topic-tu-niem-xu-satipatthana",
        targetId: "topic-tang-kinh-nikaya",
        linkType: "prerequisite",
        strength: 4,
        notes: "Kinh Đại Niệm Xứ trong Kinh Tạng",
      },
    ],
    studyProgress: {
      topicId: "topic-tu-niem-xu-satipatthana",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 23. TOPIC NEW 23: Thất Tịnh & 16 Tuệ Minh Sát
  {
    id: "topic-7-giai-doan-thanh-tinh",
    title: "Thất Tịnh & 16 Tầng Tuệ Minh Sát (Visuddhimagga)",
    slug: "7-giai-doan-thanh-tinh",
    categoryId: "cat-thien-dinh",
    categorySlug: "thien-dinh",
    categoryName: "Thiền Định (Bhāvanā)",
    type: "phat-hoc",
    description:
      "Bản đồ 7 chặng thanh tịnh (Giới, Tâm, Kiến, Đoạn nghi, Đạo phi đạo, Tri kiến tiến trình, Tri kiến) và 16 tuệ minh sát theo Thanh Tịnh Đạo của ngài Buddhaghosa.",
    tags: ["Thiền Định", "Vipassana"],
    content: `## 7 Chặng Đường Thanh Tịnh (Visuddhi):
1. **Giới Thanh Tịnh**: Giữ gìn giới bổn thanh tịnh.
2. **Tâm Thanh Tịnh**: Thành tựu định tâm (Cận định hoặc An chỉ định).
3. **Kiến Thanh Tịnh**: Tuệ phân biệt rốt ráo Danh Pháp và Sắc Pháp.
4. **Đoạn Nghi Thanh Tịnh**: Thấy rõ duyên khởi quá khứ, hiện tại, vị lai.
5. **Đạo Phi Đạo Tri Kiến Thanh Tịnh**: Vượt qua 10 tùy phiền não thiền quán.
6. **Tri Kiến Tiến Trình Thanh Tịnh**: Trải nghiệm 9 tầng tuệ minh sát sinh diệt, diệt vong, kinh sợ, hiểm họa, nhàm chán, muốn giải thoát, thẩm sát, hành xả, thuận thứ.
7. **Tri Kiến Thanh Tịnh**: Thành tựu 4 Thánh Đạo và 4 Thánh Quả.`,
    links: [
      {
        id: "link-52",
        sourceId: "topic-7-giai-doan-thanh-tinh",
        targetId: "topic-thien-vipassana",
        linkType: "related",
        strength: 5,
        notes: "Tiến trình phát triển tuệ giác Minh Sát",
      },
      {
        id: "link-53",
        sourceId: "topic-7-giai-doan-thanh-tinh",
        targetId: "topic-abhidharma-tong-quan",
        linkType: "prerequisite",
        strength: 5,
        notes: "Hiểu Danh Sắc để hoàn thành Kiến Thanh Tịnh",
      },
    ],
    studyProgress: {
      topicId: "topic-7-giai-doan-thanh-tinh",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 24. TOPIC NEW 24: Trung Quán Long Thọ
  {
    id: "topic-trung-quan-long-tho",
    title: "Trung Quán Luận & Biện Chứng Tánh Không (Śūnyatā)",
    slug: "trung-quan-long-tho",
    categoryId: "cat-triet-hoc-phat-giao",
    categorySlug: "triet-hoc-phat-giao",
    categoryName: "Triết Học Phật Giáo",
    type: "phat-hoc",
    description:
      "Khảo sát 27 phẩm của Trung Luận (Mūlamadhyamakakārikā): Bát Bất Duyên Khởi, Nhị Đế, và sự viên dung giữa Duyên Sinh và Tánh Không.",
    tags: ["Bát Nhã"],
    content: `## Luận Điểm Căn Bản Của Trung Luận (Nāgārjuna):
*“Các pháp do duyên sinh, Ta nói tức là Không, cũng gọi là Giả danh, cũng là nghĩa Trung đạo.”*
Ngài Long Thọ chứng minh rằng vạn pháp vì Duyên Khởi nên Vô Tự Tính (*Niḥsvabhāva*), và vì Vô Tự Tính nên tức là Tánh Không (*Śūnyatā*). Tánh Không không phải là hư vô chủ nghĩa mà chính là động lực cho sự vận hành biến chuyển không ngừng của vũ trụ.`,
    links: [
      {
        id: "link-54",
        sourceId: "topic-trung-quan-long-tho",
        targetId: "topic-bat-nha",
        linkType: "related",
        strength: 5,
        notes: "Trung Quán là sự hoàn thiện triết học của Bát Nhã",
      },
      {
        id: "link-55",
        sourceId: "topic-trung-quan-long-tho",
        targetId: "topic-du-gia-duy-thuc",
        linkType: "related",
        strength: 4,
        notes: "Đối chiếu Trung Quán Tánh Không với Duy Thức Tam Tính",
      },
    ],
    studyProgress: {
      topicId: "topic-trung-quan-long-tho",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 25. TOPIC NEW 25: Duy Thức Học Yogācāra
  {
    id: "topic-du-gia-duy-thuc",
    title: "Duy Thức Học (Yogācāra) - Tam Tự Tính & Bát Thức",
    slug: "du-gia-duy-thuc",
    categoryId: "cat-triet-hoc-phat-giao",
    categorySlug: "triet-hoc-phat-giao",
    categoryName: "Triết Học Phật Giáo",
    type: "phat-hoc",
    description:
      "Hệ thống triết học Du Già Duy Thức của Thế Thân và Vô Trước: Bát Thức Tâm Vương (A-lại-da thức), Tam Tự Tính (Biến kế sở chấp, Y tha khởi, Viên thành thật).",
    tags: ["Bát Nhã", "Luận Tạng"],
    content: `## Bát Thức Tâm Vương Trong Duy Thức:
1-5. Tiền ngũ thức (Nhãn, Nhĩ, Tỷ, Thiệt, Thân thức).
6. Đệ lục Ý thức (Phân biệt suy luận).
7. Đệ thất Mạt-na thức (Chấp ngã, tư lương).
8. Đệ bát A-lại-da thức (Tàng thức chứa giữ chủng tử nghiệp).

## Tam Tự Tính (Trisvabhāva):
- **Biến Kế Sở Chấp Tính (Parikalpita)**: Ảo tưởng về ngã và pháp thực có.
- **Y Tha Khởi Tính (Paratantra)**: Thực tại hiện khởi do duyên sinh tương tác.
- **Viên Thành Thật Tính (Pariniṣpanna)**: Thực tại chân như viên mãn khi chuyển thức thành trí.`,
    links: [
      {
        id: "link-56",
        sourceId: "topic-du-gia-duy-thuc",
        targetId: "topic-tam-va-tam-so",
        linkType: "related",
        strength: 5,
        notes: "So sánh 51 tâm sở Duy Thức với 52 tâm sở Abhidhamma",
      },
      {
        id: "link-57",
        sourceId: "topic-du-gia-duy-thuc",
        targetId: "topic-trung-quan-long-tho",
        linkType: "related",
        strength: 4,
        notes: "Hai trụ cột của triết học Đại Thừa",
      },
    ],
    studyProgress: {
      topicId: "topic-du-gia-duy-thuc",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 26. TOPIC NEW 26: Đại Lục Nhâm
  {
    id: "topic-dai-luc-nham",
    title: "Đại Lục Nhâm - Thần Khóa Nhân Sự & Thập Nhị Nguyệt Tướng",
    slug: "dai-luc-nham",
    categoryId: "cat-tam-thuc",
    categorySlug: "tam-thuc",
    categoryName: "Tam Thức (Kỳ Môn - Thái Ất - Lục Nhâm)",
    type: "huyen-hoc",
    description:
      "Một trong Tam Thức tối cao, chuyên dự đoán nhân sự thế thái dựa trên Thiên Bàn, Địa Bàn, Tứ Khóa và Tam Truyền.",
    tags: ["Tam Thức"],
    content: `## Cơ Chế Khởi Quẻ Đại Lục Nhâm:
- **Địa Bàn**: 12 cung cố định từ Tý đến Hợi.
- **Thiên Bàn**: Nguyệt Tướng gia vào Giờ xem để xoay vòng 12 cung thiên bàn.
- **Tứ Khóa (Can Chi Tương Phối)**:
  - Khóa 1 & 2: Dương Thần và Âm Thần của Ngày (Nhật can).
  - Khóa 3 & 4: Dương Thần và Âm Thần của Chi (Nhật chi).
- **Tam Truyền (Sơ Truyền, Trung Truyền, Mạt Truyền)**: Diễn tiến quá khứ, hiện tại và kết quả tương lai qua 9 cách khởi truyền (Tặc Khắc, Tỷ Dụng, Thiệp Hại, Dao Khắc...).`,
    links: [
      {
        id: "link-58",
        sourceId: "topic-dai-luc-nham",
        targetId: "topic-ky-mon-don-giap",
        linkType: "related",
        strength: 5,
        notes:
          "Tam Thức kết hợp Thiên (Thái Ất), Địa (Kỳ Môn), Nhân (Lục Nhâm)",
      },
      {
        id: "link-59",
        sourceId: "topic-dai-luc-nham",
        targetId: "topic-kinh-dich",
        linkType: "prerequisite",
        strength: 4,
        notes: "Dịch lý âm dương ngũ hành sinh khắc",
      },
    ],
    studyProgress: {
      topicId: "topic-dai-luc-nham",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 27. TOPIC NEW 27: Kỳ Môn Âm Dương Độn
  {
    id: "topic-ky-mon-am-duong-don",
    title: "Kỳ Môn 1080 Cục Bàn - Âm Dương Độn Chi Tiết",
    slug: "ky-mon-am-duong-don",
    categoryId: "cat-tam-thuc",
    categorySlug: "tam-thuc",
    categoryName: "Tam Thức (Kỳ Môn - Thái Ất - Lục Nhâm)",
    type: "huyen-hoc",
    description:
      "Quy luật khởi cục 1080 bàn Kỳ Môn Độn Giáp qua Dương Độn (Đông Chí đến Hạ Chí) và Âm Độn (Hạ Chí đến Đông Chí).",
    tags: ["Kỳ Môn", "Tam Thức"],
    content: `## Quy Luật Khởi Cục Âm Dương Độn:
- **Dương Độn (Khí Thuận - Đi theo chiều số tiến)**: Bắt đầu từ Đông Chí, gồm 12 tiết khí: Đông Chí, Tiểu Hàn, Đại Hàn, Lập Xuân, Vũ Thủy, Kinh Trập, Xuân Phân, Thanh Minh, Cốc Vũ, Lập Hạ, Tiểu Mãn, Mang Chủng (Dương Độn 1 đến 9 cục).
- **Âm Độn (Khí Nghịch - Đi theo chiều số lùi)**: Bắt đầu từ Hạ Chí, gồm 12 tiết khí: Hạ Chí, Tiểu Thử, Đại Thử, Lập Thu, Xử Thử, Bạch Lộ, Thu Phân, Hàn Lộ, Sương Giáng, Lập Đông, Tiểu Tuyết, Đại Tuyết (Âm Độn 9 về 1 cục).`,
    links: [
      {
        id: "link-60",
        sourceId: "topic-ky-mon-am-duong-don",
        targetId: "topic-ky-mon-don-giap",
        linkType: "related",
        strength: 5,
        notes: "Đi sâu vào thực hành cục bàn Kỳ Môn",
      },
      {
        id: "link-61",
        sourceId: "topic-ky-mon-am-duong-don",
        targetId: "topic-phong-thuy-ly-khi",
        linkType: "related",
        strength: 4,
        notes: "Ứng dụng định vị phương hướng thời không",
      },
    ],
    studyProgress: {
      topicId: "topic-ky-mon-am-duong-don",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 28. TOPIC NEW 28: Tiên Thiên & Hậu Thiên Bát Quái
  {
    id: "topic-tien-hau-thien-bat-quai",
    title: "Tiên Thiên & Hậu Thiên Bát Quái Toàn Thư",
    slug: "tien-hau-thien-bat-quai",
    categoryId: "cat-dich-hoc",
    categorySlug: "dich-hoc",
    categoryName: "Dịch Học (Kinh Dịch)",
    type: "huyen-hoc",
    description:
      "Khảo sát bản thể đối đãi của Tiên Thiên Bát Quái (Phục Hy) và quy luật vận hành bốn mùa của Hậu Thiên Bát Quái (Văn Vương).",
    tags: ["Kinh Dịch"],
    content: `## Tiên Thiên vs Hậu Thiên Bát Quái:
1. **Tiên Thiên Bát Quái (Thể - Bản thể tĩnh)**:
   - Càn (Nam, Trời, 1) đối Khôn (Bắc, Đất, 8).
   - Đoài (Đông Nam, 2) đối Cấn (Tây Bắc, 7).
   - Ly (Đông, 3) đối Khảm (Tây, 6).
   - Chấn (Đông Bắc, 4) đối Tốn (Tây Nam, 5).
   - Quy luật: Cặp đối đãi tổng số bằng 9, biểu thị sự cân bằng âm dương tuyệt đối trước khi vạn vật sinh hóa.
2. **Hậu Thiên Bát Quái (Dụng - Vận hành động)**:
   - Khảm (Bắc, Thủy, 1), Khôn (Tây Nam, Thổ, 2), Chấn (Đông, Mộc, 3), Tốn (Đông Nam, Mộc, 4), Trung Cung (Thổ, 5), Càn (Tây Bắc, Kim, 6), Đoài (Tây, Kim, 7), Cấn (Đông Bắc, Thổ, 8), Ly (Nam, Hỏa, 9).
   - Nền tảng của Lạc Thư, Cửu Cung Phi Tinh và phong thủy thực hành.`,
    links: [
      {
        id: "link-62",
        sourceId: "topic-tien-hau-thien-bat-quai",
        targetId: "topic-kinh-dich",
        linkType: "related",
        strength: 5,
        notes: "Bát Quái là nền tảng 64 quẻ Dịch",
      },
      {
        id: "link-63",
        sourceId: "topic-tien-hau-thien-bat-quai",
        targetId: "topic-64-que-dich-toan-thu",
        linkType: "prerequisite",
        strength: 5,
        notes: "Ghép Bát Quái thành Trùng Quái",
      },
    ],
    studyProgress: {
      topicId: "topic-tien-hau-thien-bat-quai",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 29. TOPIC NEW 29: 64 Quẻ Dịch Toàn Thư
  {
    id: "topic-64-que-dich-toan-thu",
    title: "64 Quẻ Kinh Dịch - Thoán Từ & Hào Từ Thực Hành",
    slug: "64-que-dich-toan-thu",
    categoryId: "cat-dich-hoc",
    categorySlug: "dich-hoc",
    categoryName: "Dịch Học (Kinh Dịch)",
    type: "huyen-hoc",
    description:
      "Khảo sát chi tiết 64 quẻ kép từ Thuần Càn, Thuần Khôn đến Thủy Hỏa Ký Tế, Hỏa Thủy Vị Tế: thoán từ, hào từ, hào biến và đại tượng truyện.",
    tags: ["Kinh Dịch"],
    content: `## 64 Quẻ Kép (Trùng Quái):
Mỗi quẻ gồm Thượng Quái (Ngoại quái) và Hạ Quái (Nội quái) với 6 hào âm dương:
- **Bát Thuần Quẻ (8)**: Càn, Khôn, Chấn, Tốn, Khảm, Ly, Cấn, Đoài.
- **Thượng Kinh (30 quẻ)**: Bắt đầu từ Càn Khôn, mở ra quy luật thiên địa tự nhiên.
- **Hạ Kinh (34 quẻ)**: Bắt đầu từ Hàm Hằng, mở ra quy luật đạo vợ chồng, nhân sự và xã hội.
- **Quy tắc giải quẻ**: Dựa trên thời của quẻ (*Thời trung*), tương ứng tương cầu của các hào, thế hào ứng hào và hào động biến hóa.`,
    links: [
      {
        id: "link-64",
        sourceId: "topic-64-que-dich-toan-thu",
        targetId: "topic-kinh-dich",
        linkType: "related",
        strength: 5,
        notes: "Toàn thư giải nghĩa 64 quẻ",
      },
      {
        id: "link-65",
        sourceId: "topic-64-que-dich-toan-thu",
        targetId: "topic-mai-hoa-dich-so",
        linkType: "advanced",
        strength: 4,
        notes: "Ứng dụng quẻ dịch trong dự đoán Mai Hoa",
      },
    ],
    studyProgress: {
      topicId: "topic-64-que-dich-toan-thu",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 30. TOPIC NEW 30: Mai Hoa Dịch Số
  {
    id: "topic-mai-hoa-dich-so",
    title: "Mai Hoa Dịch Số - Tâm Pháp Thiệu Ung",
    slug: "mai-hoa-dich-so",
    categoryId: "cat-dich-hoc",
    categorySlug: "dich-hoc",
    categoryName: "Dịch Học (Kinh Dịch)",
    type: "huyen-hoc",
    description:
      "Phương pháp khởi quẻ bất kỳ theo năm tháng ngày giờ, âm thanh, phương hướng, màu sắc của Thiệu Khang Tiết (Thiệu Ung).",
    tags: ["Kinh Dịch"],
    content: `## Tâm Pháp Mai Hoa Dịch Số:
1. **Khởi Quẻ Theo Thời Gian**: (Năm + Tháng + Ngày) chia 8 lấy số dư làm Thượng Quái; (Năm + Tháng + Ngày + Giờ) chia 8 lấy số dư làm Hạ Quái; tổng chia 6 lấy số dư làm Hào Động.
2. **Thể Dụng Học Thuyết**:
   - **Thể Quái**: Đại diện cho chủ thể, bản thân người hỏi sự việc (Cần sinh vượng).
   - **Dụng Quái**: Đại diện cho sự việc đối phương (Tương sinh với Thể là cát, tương khắc là hung).
   - **Biến Quái**: Kết quả sau cùng của sự việc.
   - **Hổ Quái**: Tiến trình trung gian diễn biến bên trong.`,
    links: [
      {
        id: "link-66",
        sourceId: "topic-mai-hoa-dich-so",
        targetId: "topic-64-que-dich-toan-thu",
        linkType: "prerequisite",
        strength: 5,
        notes: "Luận giải dựa trên 64 quẻ",
      },
      {
        id: "link-67",
        sourceId: "topic-mai-hoa-dich-so",
        targetId: "topic-bat-tu-tu-tru",
        linkType: "related",
        strength: 3,
        notes: "Phối hợp thời không can chi",
      },
    ],
    studyProgress: {
      topicId: "topic-mai-hoa-dich-so",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 31. TOPIC NEW 31: Bát Tự Tứ Trụ
  {
    id: "topic-bat-tu-tu-tru",
    title: "Bát Tự Tứ Trụ (Tử Bình) & Thập Thần Học Luận",
    slug: "bat-tu-tu-tru",
    categoryId: "cat-tu-vi-tu-tru",
    categorySlug: "tu-vi-tu-tru",
    categoryName: "Tử Vi & Mệnh Lý",
    type: "huyen-hoc",
    description:
      "Phân tích 4 trụ Năm, Tháng, Ngày, Giờ sinh (Bát Tự Can Chi): Nhật Chủ cường nhược, Thập Thần (Chính Quan, Thiên Tài, Thực Thần...), Dụng Thần và Đại Vận.",
    tags: ["Tử Vi"],
    content: `## Cấu Trúc Bát Tự Tứ Trụ:
- **Tứ Trụ**: Trụ Năm (Gốc rễ, tổ tiên), Trụ Tháng (Môi trường, phụ mẫu, lệnh tháng), Trụ Ngày (Bản thân Nhật Can & Vợ chồng Nhật Chi), Trụ Giờ (Con cái, hậu vận).
- **Thập Thần Đối Chiếu Với Nhật Chủ**:
  - Sinh ta: Chính Ấn, Kiêu Thần (Thiên Ấn).
  - Khắc ta: Chính Quan, Thất Sát (Thiên Quan).
  - Ta sinh: Thực Thần, Thương Quan.
  - Ta khắc: Chính Tài, Thiên Tài.
  - Đồng ta: Tỷ Kiên, Kiếp Tài.
- **Dụng Thần Cốt Lõi**: Phù ức, Điều hầu, Thông quan để đưa mệnh cục về trạng thái ngũ hành cân bằng.`,
    links: [
      {
        id: "link-68",
        sourceId: "topic-bat-tu-tu-tru",
        targetId: "topic-tu-vi-dau-so",
        linkType: "related",
        strength: 5,
        notes: "Hai trụ cột mệnh lý học phương Đông",
      },
      {
        id: "link-69",
        sourceId: "topic-bat-tu-tu-tru",
        targetId: "topic-kinh-dich",
        linkType: "prerequisite",
        strength: 4,
        notes: "Ngũ hành âm dương can chi",
      },
    ],
    studyProgress: {
      topicId: "topic-bat-tu-tu-tru",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 32. TOPIC NEW 32: Tử Vi 14 Chính Tinh
  {
    id: "topic-tu-vi-14-chinh-tinh",
    title: "Tử Vi Đẩu Số - 14 Chính Tinh & Tứ Hóa Luận",
    slug: "tu-vi-14-chinh-tinh",
    categoryId: "cat-tu-vi-tu-tru",
    categorySlug: "tu-vi-tu-tru",
    categoryName: "Tử Vi & Mệnh Lý",
    type: "huyen-hoc",
    description:
      "Khảo sát chuyên sâu đặc tính, miếu vượng đắc hãm của 14 chính tinh và quy luật Hóa Lộc, Hóa Quyền, Hóa Khoa, Hóa Kỵ theo 10 Thiên Can.",
    tags: ["Tử Vi"],
    content: `## 14 Chính Tinh và Tứ Hóa:
- **Bộ Tử Phủ Vũ Tướng Liêm**: Đại diện cho vương quyền, tài chính, kỷ cương và tổ chức hành chính.
- **Bộ Sát Phá Tham**: Đại diện cho biến động, tiên phong, khai sáng, thương trường và tranh đấu.
- **Bộ Cự Nhật**: Đại diện cho tài hùng biện, ngoại giao, xuất ngoại và quang minh chính đại.
- **Bộ Cơ Nguyệt Đồng Lương**: Đại diện cho mưu trí, từ thiện, công chức, chuyên môn học thuật.
- **Tứ Hóa Tinh Túy**: Lộc (Sinh sôi, duyên phận), Quyền (Uy quyền, năng lực), Khoa (Danh tiếng, hóa giải), Kỵ (Nợ nần, trăn trở, chấp niệm).`,
    links: [
      {
        id: "link-70",
        sourceId: "topic-tu-vi-14-chinh-tinh",
        targetId: "topic-tu-vi-dau-so",
        linkType: "related",
        strength: 5,
        notes: "Cốt lõi giải đoán lá số Tử Vi",
      },
      {
        id: "link-71",
        sourceId: "topic-tu-vi-14-chinh-tinh",
        targetId: "topic-tu-vi-12-cung-chuc",
        linkType: "related",
        strength: 5,
        notes: "An sao chính tinh vào 12 cung chức",
      },
    ],
    studyProgress: {
      topicId: "topic-tu-vi-14-chinh-tinh",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 33. TOPIC NEW 33: Tử Vi 12 Cung Chức
  {
    id: "topic-tu-vi-12-cung-chuc",
    title: "Hệ Thống 12 Cung Chức & Bàng Tinh Chiêm Nghiệm",
    slug: "tu-vi-12-cung-chuc",
    categoryId: "cat-tu-vi-tu-tru",
    categorySlug: "tu-vi-tu-tru",
    categoryName: "Tử Vi & Mệnh Lý",
    type: "huyen-hoc",
    description:
      "Phân tích Tam Phương Tứ Chính, cung Mệnh, Thân, Quan Lộc, Tài Bạch, Thiên Di... phối hợp cùng Lục Sát Tinh, Lục Cát Tinh.",
    tags: ["Tử Vi"],
    content: `## Tam Phương Tứ Chính 12 Cung:
- **Tam Hợp Mệnh - Tài - Quan**: Trục cốt lõi thể hiện bản lĩnh, tài chính và sự nghiệp của đương số.
- **Trục Mệnh - Di**: Tương tác giữa nội tâm và môi trường đối ngoại xã hội.
- **Trục Phu Thê - Quan Lộc**: Hậu phương gia đình hỗ trợ con đường công danh.
- **Phối Hợp Bàng Tinh**:
  - Lục Cát Tinh: Tả Phụ, Hữu Bật, Văn Xương, Văn Khúc, Thiên Khôi, Thiên Việt.
  - Lục Sát Tinh: Kình Dương, Đà La, Hỏa Tinh, Linh Tinh, Địa Không, Địa Kiếp.`,
    links: [
      {
        id: "link-72",
        sourceId: "topic-tu-vi-12-cung-chuc",
        targetId: "topic-tu-vi-14-chinh-tinh",
        linkType: "prerequisite",
        strength: 5,
        notes: "Phối hợp chính tinh với cung chức",
      },
      {
        id: "link-73",
        sourceId: "topic-tu-vi-12-cung-chuc",
        targetId: "topic-bat-tu-tu-tru",
        linkType: "related",
        strength: 4,
        notes: "Đối chiếu cung Mệnh Thân với Nhật Chủ Bát Tự",
      },
    ],
    studyProgress: {
      topicId: "topic-tu-vi-12-cung-chuc",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 34. TOPIC NEW 34: Phong Thủy Loan Đầu
  {
    id: "topic-phong-thuy-loan-dau",
    title: "Phong Thủy Loan Đầu - Hình Thế, Long, Huyệt, Sa, Thủy",
    slug: "phong-thuy-loan-dau",
    categoryId: "cat-phong-thuy",
    categorySlug: "phong-thuy",
    categoryName: "Phong Thủy Học",
    type: "huyen-hoc",
    description:
      "Khoa học phong thủy hình thế thực địa: Tứ Tượng (Thanh Long, Bạch Hổ, Chu Tước, Huyền Vũ), Long mạch kết huyệt, Sa bọc Thủy tụ.",
    tags: ["Phong Thủy"],
    content: `## 5 Yếu Tố Căn Bản Loan Đầu (Ngũ Quyết):
1. **Long**: Lai Long khởi nguyên từ tổ sơn, thế uốn lượn sinh khí (*Sống động là Chân Long*).
2. **Huyệt**: Điểm tụ khí tối ưu nơi Long mạch dừng lại (*Tụ khí tàng phong*).
3. **Sa**: Các ngọn núi, gò đồi, kiến trúc bao bọc hai bên: Tả Thanh Long (cao dày), Hữu Bạch Hổ (thuần phục), Án sơn và Triều sơn phía trước.
4. **Thủy**: Dòng sông, con đường uốn khúc ôm ấp (*Khúc tắc hữu tình, trực tắc sinh sát*).
5. **Hướng**: Xác định tọa hướng thu nạp sinh khí vượng sơn vượng hướng.`,
    links: [
      {
        id: "link-74",
        sourceId: "topic-phong-thuy-loan-dau",
        targetId: "topic-phong-thuy-ly-khi",
        linkType: "related",
        strength: 5,
        notes: "Loan Đầu là Thể, Lý Khí là Dụng",
      },
      {
        id: "link-75",
        sourceId: "topic-phong-thuy-loan-dau",
        targetId: "topic-phong-thuy-huyen-khong-van-9",
        linkType: "related",
        strength: 4,
        notes: "Phối hợp địa hình với phi tinh vận 9",
      },
    ],
    studyProgress: {
      topicId: "topic-phong-thuy-loan-dau",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // 35. TOPIC NEW 35: Phong Thủy Huyền Không Vận 9
  {
    id: "topic-phong-thuy-huyen-khong-van-9",
    title: "Phong Thủy Huyền Không Phi Tinh Vận 9 (2024 - 2043)",
    slug: "phong-thuy-huyen-khong-van-9",
    categoryId: "cat-phong-thuy",
    categorySlug: "phong-thuy",
    categoryName: "Phong Thủy Học",
    type: "huyen-hoc",
    description:
      "Chuyên khảo trạch vận thời đại Vận 9 (Cửu Tử Hỏa Tinh): Tinh bàn đắc vận, vượng sơn vượng hướng, thành môn quyết và hóa giải sát khí thời vận.",
    tags: ["Phong Thủy"],
    content: `## Đặc Tính Thời Vận 9 Cửu Tử Ly Hỏa (2024 - 2043):
- **Cửu Tử Ly Hỏa Đương Lệnh**: Sao số 9 làm Lệnh Tinh nhập trung cung, chủ về công nghệ số, trí tuệ nhân tạo, tâm linh, năng lượng mới, văn hóa và y học.
- **Sao Sinh Khí & Tiến Khí**: Nhất Bạch (Sao số 1 - Thủy) là Sinh Khí; Nhị Hắc (Sao số 2 - Thổ) là Tiến Khí tương lai.
- **Sao Suy Tử & Sát Khí**: Thất Xích (Số 7) và Bát Bạch (Số 8) đã thoái khí; Ngũ Hoàng (Số 5) và Tam Bích (Số 3) là đại sát tinh cần hóa giải.
- **Bố Cục Trạch Bàn Vận 9**: Ưu tiên phương Nam có ánh sáng, phương Bắc có thủy tụ sinh khí để đắc vượng tài đinh.`,
    links: [
      {
        id: "link-76",
        sourceId: "topic-phong-thuy-huyen-khong-van-9",
        targetId: "topic-phong-thuy-ly-khi",
        linkType: "prerequisite",
        strength: 5,
        notes: "Nắm vững lý khí phi tinh cơ bản",
      },
      {
        id: "link-77",
        sourceId: "topic-phong-thuy-huyen-khong-van-9",
        targetId: "topic-phong-thuy-loan-dau",
        linkType: "related",
        strength: 5,
        notes: "Phối hợp phi tinh với hình thế loan đầu thực tế",
      },
    ],
    studyProgress: {
      topicId: "topic-phong-thuy-huyen-khong-van-9",
      status: "not_started",
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_NOTES: Note[] = [
  {
    id: "note-1",
    topicId: "topic-abhidharma-tong-quan",
    topicTitle: "Abhidharma - Vi Diệu Pháp Toàn Tập",
    title: "Hiểu sâu về Tâm Vương và Tâm Sở trong thiền quán",
    content: `Khi khảo sát trong [[Thiền Vipassana (Minh Sát Tuệ) & Tứ Niệm Xứ]], nhận thấy Tâm thức (*Citta*) chỉ là sự thuần túy nhận biết đối tượng (như ánh sáng chiếu lên cảnh vật), trong khi các Tâm Sở (*Cetasika*) như Tầm, Tứ, Hỷ, Lạc mới là yếu tố tạo nên sắc thái và chất lượng cảm thọ của khoảnh khắc đó.
    
Điều này giúp hóa giải ảo tưởng về một "Cái Tôi" bất biến điều khiển tâm trí, bởi mọi diễn biến đều là sự tương tác duyên khởi của 52 tâm sở.`,
    type: "insight",
    isPrivate: false,
    tags: ["Vi Diệu Pháp", "Abhidharma"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "note-2",
    topicId: "topic-thien-vipassana",
    topicTitle: "Thiền Vipassana (Minh Sát Tuệ) & Tứ Niệm Xứ",
    title: "Ghi chú về Thất Giác Chi và sự cân bằng Tâm Định - Tâm Tuệ",
    content: `Trong quá trình tu tập Tứ Niệm Xứ, cần lưu ý cân bằng giữa:
- **Tín Căn** và **Tuệ Căn** (quá nhiều Tín sinh mê tín, quá nhiều Tuệ sinh hoài nghi suy luận suông).
- **Tấn Căn** và **Định Căn** (quá nhiều Tấn sinh phóng dật bất an, quá nhiều Định sinh hôn trầm thụ động).
- **Niệm Căn** luôn đóng vai trò điều hòa trung tâm như người gác cổng sáng suốt.`,
    type: "study",
    isPrivate: false,
    tags: ["Thiền Định", "Vipassana"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "note-3",
    topicId: "topic-ky-mon-don-giap",
    topicTitle: "Kỳ Môn Độn Giáp - Môn Dự Trắc Địa Lý & Bát Trận",
    title: "Tổng kết quy tắc Bát Môn đắc địa và tương khắc với Địa Bàn",
    content: `Quy tắc xem xét Bát Môn trong [[Kỳ Môn Độn Giáp - Môn Dự Trắc Địa Lý & Bát Trận]]:
- **Khai, Hưu, Sinh** là Tam Cát Môn. Nhưng nếu Khai Môn (Kim) bay đến Cung Chấn/Tốn (Mộc) gọi là "Môn Bách Cung" (cửa ép cung), cát khí suy giảm.
- **Tử, Kinh, Thương** là Tam Hung Môn. Nhưng nếu Tử Môn (Thổ) bay đến Cung Càn/Đoài (Kim) thì Thổ sinh Kim, biến hung thành bình hòa.
- Luôn kết hợp với Trực Phù và Cửu Tinh để định toàn cục cát hung.`,
    type: "summary",
    isPrivate: false,
    tags: ["Kỳ Môn", "Tam Thức"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "note-4",
    topicId: "topic-bat-nha",
    topicTitle: "Bát Nhã Ba La Mật Đa & Trung Quán Luận",
    title: "Phân biệt Chân Đế trong Vi Diệu Pháp vs Tánh Không Bát Nhã",
    content: `Trong [[Abhidharma - Vi Diệu Pháp Toàn Tập]], 4 Pháp Chân Đế (Tâm, Tâm Sở, Sắc, Niết Bàn) được coi là thực tại cứu cánh có tự tính riêng (*Sabhāva*).
Tuy nhiên trong [[Bát Nhã Ba La Mật Đa & Trung Quán Luận]], Ngài Long Thọ tuyên bố tất cả các pháp đều vô tự tính (*Nissabhāva*) và Duyên Khởi tức là Tánh Không.

*Biện giải*: Luận Tạng phân tích thực tại hữu vi theo góc nhìn chức năng vi mô để hành giả không bám chấp vào khối giả danh (*Ghana*), còn Bát Nhã đứng ở bình diện rốt ráo để chặt đứt mọi chấp thủ vào chính các pháp.`,
    type: "insight",
    isPrivate: false,
    tags: ["Bát Nhã"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "note-5",
    topicId: "topic-kinh-dich",
    topicTitle: "Kinh Dịch - Đạo Biến Dịch & 64 Quẻ",
    title: "Nguyên lý Tiên Thiên Bát Quái và đối đãi Âm Dương",
    content: `Trong Tiên Thiên Bát Quái:
- Càn (Trời, 1) đối Khôn (Đất, 8) -> Tổng số hào = 9
- Đoài (Đầm, 2) đối Cấn (Núi, 7)
- Ly (Lửa, 3) đối Khảm (Nước, 6)
- Chấn (Sấm, 4) đối Tốn (Gió, 5)

Mọi cặp đối đều có tính chất bù trừ cân bằng tuyệt đối, biểu thị trạng thái tĩnh và bản thể của vũ trụ trước khi sinh hóa vạn vật.`,
    type: "study",
    isPrivate: false,
    tags: ["Kinh Dịch"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_RESOURCES: Resource[] = [
  {
    id: "res-1",
    topicId: "topic-abhidharma-tong-quan",
    topicTitle: "Abhidharma - Vi Diệu Pháp Toàn Tập",
    title: "Thắng Pháp Tập Yếu Luận (Abhidhammattha Saṅgaha)",
    type: "book",
    author: "Trưởng Lão Anuruddha (Bản dịch Việt ngữ & Chú giải)",
    url: "https://suttacentral.net/pitaka/abhidhamma",
    notes:
      "Sách giáo khoa căn bản tra cứu 89 tâm, 52 tâm sở, 28 sắc pháp và 24 duyên hệ.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "res-2",
    topicId: "topic-thien-vipassana",
    topicTitle: "Thiền Vipassana (Minh Sát Tuệ) & Tứ Niệm Xứ",
    title: "Đại Niệm Xứ Kinh (Mahā Satipaṭṭhāna Sutta - Dīgha Nikāya 22)",
    type: "article",
    author: "Đức Phật Thích Ca Mâu Ni / HT. Thích Minh Châu dịch",
    url: "https://suttacentral.net/dn22",
    notes: "Kinh điển căn bản về 4 lãnh vực quán niệm Thân, Thọ, Tâm, Pháp.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "res-3",
    topicId: "topic-kinh-dich",
    topicTitle: "Kinh Dịch - Đạo Biến Dịch & 64 Quẻ",
    title: "Chu Dịch Toàn Thư & Thập Dực Khảo Luận",
    type: "book",
    author: "Phục Hy, Chu Văn Vương, Khổng Tử (Thập Dực)",
    url: "https://ctext.org/book-of-changes/vi",
    notes:
      "Văn bản kinh viện gốc khảo sát 64 quẻ, thoán từ, hào từ và đại tượng truyện.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "res-4",
    topicId: "topic-ky-mon-don-giap",
    topicTitle: "Kỳ Môn Độn Giáp - Môn Dự Trắc Địa Lý & Bát Trận",
    title: "Kỳ Môn Độn Giáp Bí Kíp Toàn Thư (Bát Môn & Cửu Tinh Bàn)",
    type: "pdf",
    author: "Gia Cát Lượng / Lưu Bá Ôn chú giải",
    url: "https://ctext.org/",
    notes: "Tài liệu cổ bản tra cứu 1080 cục bàn Kỳ Môn Âm Dương Độn.",
    createdAt: new Date().toISOString(),
  },
];
