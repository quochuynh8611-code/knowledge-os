import { Category, Topic, Note, Resource, Tag } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  // Phật Học (Theravāda & Triết học Đại Thừa)
  {
    id: 'cat-tam-tang',
    name: 'Tam Tạng (Tipiṭaka)',
    slug: 'tam-tang',
    type: 'phat-hoc',
    description: 'Ba tạng thánh điển Phật giáo: Tạng Kinh (Sutta), Tạng Luật (Vinaya) và Tạng Luận (Abhidhamma).',
    icon: 'Scroll',
    color: '#D97706',
  },
  {
    id: 'cat-abhidharma',
    name: 'Abhidharma (Vi Diệu Pháp)',
    slug: 'abhidharma',
    type: 'phat-hoc',
    parentId: 'cat-tam-tang',
    description: 'Thắng Pháp Tạng - Hệ thống phân tích thực tại tối hậu gồm Tâm (Citta), Tâm Sở (Cetasika), Sắc Pháp (Rūpa) và Niết Bàn (Nibbāna).',
    icon: 'BookOpen',
    color: '#B45309',
  },
  {
    id: 'cat-thien-dinh',
    name: 'Thiền Định (Bhāvanā)',
    slug: 'thien-dinh',
    type: 'phat-hoc',
    description: 'Phương pháp tu tập tâm thức: Thiền Chỉ (Samatha) và Thiền Quán Minh Sát (Vipassanā).',
    icon: 'Sparkles',
    color: '#059669',
  },
  {
    id: 'cat-triet-hoc-phat-giao',
    name: 'Triết Học Phật Giáo',
    slug: 'triet-hoc-phat-giao',
    type: 'phat-hoc',
    description: 'Bát Nhã Ba La Mật Đa (Prajñāpāramitā), Trung Quán Luận (Mūlamadhyamakakārikā) và Duyên Khởi Luận.',
    icon: 'Feather',
    color: '#7C3AED',
  },

  // Huyền Học Phương Đông
  {
    id: 'cat-tam-thuc',
    name: 'Tam Thức (Kỳ Môn - Thái Ất - Lục Nhâm)',
    slug: 'tam-thuc',
    type: 'huyen-hoc',
    description: 'Ba môn chiêm bốc và dự trắc thời không tối cao của cổ học phương Đông: Thiên - Địa - Nhân.',
    icon: 'Compass',
    color: '#2563EB',
  },
  {
    id: 'cat-dich-hoc',
    name: 'Dịch Học (Kinh Dịch)',
    slug: 'dich-hoc',
    type: 'huyen-hoc',
    description: 'Đạo biến dịch của vũ trụ, Tiên Thiên - Hậu Thiên Bát Quái và hệ thống 64 Quẻ Dịch.',
    icon: 'CircleDot',
    color: '#C026D3',
  },
  {
    id: 'cat-phong-thuy',
    name: 'Phong Thủy Học',
    slug: 'phong-thuy',
    type: 'huyen-hoc',
    description: 'Khoa học điều hòa khí trường môi trường thông qua Loan Đầu hình thể và Huyền Không Lý Khí.',
    icon: 'Mountain',
    color: '#0D9488',
  },
  {
    id: 'cat-tu-vi-tu-tru',
    name: 'Tử Vi & Mệnh Lý',
    slug: 'tu-vi-tu-tru',
    type: 'huyen-hoc',
    description: 'Hệ thống luận giải vận mệnh, tinh bàn 14 chính tinh và ngũ hành can chi sinh khắc.',
    icon: 'Star',
    color: '#4F46E5',
  },
];

export const INITIAL_TAGS: Tag[] = [
  { id: 'tag-1', name: 'Abhidharma', slug: 'abhidharma', color: '#D97706', count: 3 },
  { id: 'tag-2', name: 'Vi Diệu Pháp', slug: 'vi-dieu-phap', color: '#B45309', count: 3 },
  { id: 'tag-3', name: 'Luận Tạng', slug: 'luan-tang', color: '#92400E', count: 2 },
  { id: 'tag-4', name: 'Thiền Định', slug: 'thien-dinh', color: '#059669', count: 1 },
  { id: 'tag-5', name: 'Vipassana', slug: 'vipassana', color: '#10B981', count: 1 },
  { id: 'tag-6', name: 'Kỳ Môn', slug: 'ky-mon', color: '#2563EB', count: 1 },
  { id: 'tag-7', name: 'Tam Thức', slug: 'tam-thuc', color: '#1D4ED8', count: 2 },
  { id: 'tag-8', name: 'Phong Thủy', slug: 'phong-thuy', color: '#0D9488', count: 1 },
  { id: 'tag-9', name: 'Kinh Dịch', slug: 'kinh-dich', color: '#C026D3', count: 1 },
  { id: 'tag-10', name: 'Tử Vi', slug: 'tu-vi', color: '#4F46E5', count: 1 },
  { id: 'tag-11', name: 'Bát Nhã', slug: 'bat-nha', color: '#7C3AED', count: 1 },
  { id: 'tag-12', name: 'Duyên Hệ', slug: 'duyen-he', color: '#F59E0B', count: 1 },
];

export const INITIAL_TOPICS: Topic[] = [
  {
    id: 'topic-abhidharma-tong-quan',
    title: 'Abhidharma - Vi Diệu Pháp Toàn Tập',
    slug: 'abhidharma-vi-dieu-phap',
    categoryId: 'cat-abhidharma',
    categorySlug: 'abhidharma',
    categoryName: 'Abhidharma (Vi Diệu Pháp)',
    type: 'phat-hoc',
    description: 'Giáo lý cao siêu phân tích thực tại tối hậu thành 4 Pháp Thực Tính (Paramattha): Tâm (Citta), Tâm Sở (Cetasika), Sắc Pháp (Rūpa) và Niết Bàn (Nibbāna).',
    tags: ['Abhidharma', 'Vi Diệu Pháp', 'Luận Tạng'],
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
      { id: 'link-1', sourceId: 'topic-abhidharma-tong-quan', targetId: 'topic-phap-tu', linkType: 'prerequisite', strength: 5, notes: 'Bộ đầu tiên trong 7 bộ Thắng Pháp luận giải 89 tâm và 52 tâm sở' },
      { id: 'link-2', sourceId: 'topic-abhidharma-tong-quan', targetId: 'topic-vi-tri-patthana', linkType: 'advanced', strength: 5, notes: 'Bộ Vị Trí hoàn thiện hệ thống quan hệ duyên hệ của 4 pháp chân đế' },
      { id: 'link-3', sourceId: 'topic-abhidharma-tong-quan', targetId: 'topic-thien-vipassana', linkType: 'related', strength: 5, notes: 'Vi Diệu Pháp là nền tảng bản đồ thực nghiệm cho thiền quán Danh Sắc' },
      { id: 'link-4', sourceId: 'topic-abhidharma-tong-quan', targetId: 'topic-bat-nha', linkType: 'related', strength: 4, notes: 'So sánh chân đế Vi Diệu Pháp với Tánh Không Bát Nhã' },
    ],
    studyProgress: {
      topicId: 'topic-abhidharma-tong-quan',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 1,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'topic-phap-tu',
    title: 'Bộ Pháp Tụ (Dhammasangani) - Phân Loại Tâm & Tâm Sở',
    slug: 'bo-phap-tu-dhammasangani',
    categoryId: 'cat-abhidharma',
    categorySlug: 'abhidharma',
    categoryName: 'Abhidharma (Vi Diệu Pháp)',
    type: 'phat-hoc',
    description: 'Tác phẩm đầu tiên trong 7 bộ Vi Diệu Pháp, liệt kê và phân loại 89/121 Tâm, 52 Tâm Sở và 28 Sắc Pháp theo Ba Cụm (Tam Đề Tikas) và Hai Cụm (Nhị Đề Dukas).',
    tags: ['Abhidharma', 'Vi Diệu Pháp', 'Luận Tạng'],
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
      { id: 'link-5', sourceId: 'topic-phap-tu', targetId: 'topic-abhidharma-tong-quan', linkType: 'related', strength: 5, notes: 'Bộ nòng cốt của Thắng Pháp Tạng' },
      { id: 'link-6', sourceId: 'topic-phap-tu', targetId: 'topic-thien-vipassana', linkType: 'advanced', strength: 4, notes: 'Nhận diện tâm sở trực tiếp trong lúc hành thiền' },
    ],
    studyProgress: {
      topicId: 'topic-phap-tu',
      status: 'not_started',
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
  {
    id: 'topic-vi-tri-patthana',
    title: 'Bộ Vị Trí (Patthana) - 24 Duyên Hệ Tương Sinh',
    slug: 'bo-vi-tri-patthana',
    categoryId: 'cat-abhidharma',
    categorySlug: 'abhidharma',
    categoryName: 'Abhidharma (Vi Diệu Pháp)',
    type: 'phat-hoc',
    description: 'Bộ sách đồ sộ và uyên áo nhất giảng giải 24 Duyên Hệ (Paccaya) lý giải mạng lưới nhân duyên tương tác đa chiều của toàn vũ trụ tâm sinh vật lý.',
    tags: ['Abhidharma', 'Duyên Hệ', 'Vi Diệu Pháp'],
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
      { id: 'link-7', sourceId: 'topic-vi-tri-patthana', targetId: 'topic-abhidharma-tong-quan', linkType: 'advanced', strength: 5, notes: 'Bộ tối cao giải thích duyên sinh vạn pháp' },
      { id: 'link-8', sourceId: 'topic-vi-tri-patthana', targetId: 'topic-kinh-dich', linkType: 'related', strength: 4, notes: 'So sánh Duyên Hệ vô thường với Dịch lý biến dịch phương Đông' },
    ],
    studyProgress: {
      topicId: 'topic-vi-tri-patthana',
      status: 'not_started',
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
  {
    id: 'topic-thien-vipassana',
    title: 'Thiền Vipassana (Minh Sát Tuệ) & Tứ Niệm Xứ',
    slug: 'thien-vipassana-tu-niem-xu',
    categoryId: 'cat-thien-dinh',
    categorySlug: 'thien-dinh',
    categoryName: 'Thiền Định (Bhāvanā)',
    type: 'phat-hoc',
    description: 'Con đường duy nhất dẫn đến thanh lọc tâm trí, đoạn tận khổ đau qua việc quan sát thực tại Danh - Sắc nơi Thân, Thọ, Tâm, Pháp.',
    tags: ['Thiền Định', 'Vipassana'],
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
      { id: 'link-9', sourceId: 'topic-thien-vipassana', targetId: 'topic-abhidharma-tong-quan', linkType: 'prerequisite', strength: 5, notes: 'Nắm vững phân tích Danh Sắc để soi chiếu trong thiền tập' },
      { id: 'link-10', sourceId: 'topic-thien-vipassana', targetId: 'topic-bat-nha', linkType: 'related', strength: 5, notes: 'Tuệ giác Minh Sát tương đồng với Bát Nhã chiếu kiến ngũ uẩn giai không' },
    ],
    studyProgress: {
      topicId: 'topic-thien-vipassana',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 1,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'topic-bat-nha',
    title: 'Bát Nhã Ba La Mật Đa & Trung Quán Luận',
    slug: 'bat-nha-trung-quan-luan',
    categoryId: 'cat-triet-hoc-phat-giao',
    categorySlug: 'triet-hoc-phat-giao',
    categoryName: 'Triết Học Phật Giáo',
    type: 'phat-hoc',
    description: 'Trí tuệ thấy rõ Tánh Không (Śūnyatā) của vạn pháp - Long Thọ Bồ Tát và lý thuyết Bát Bất Trung Đạo giải trừ nhị biên phân biệt.',
    tags: ['Bát Nhã'],
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
      { id: 'link-11', sourceId: 'topic-bat-nha', targetId: 'topic-thien-vipassana', linkType: 'related', strength: 5, notes: 'Thực nghiệm tánh không qua thiền quán' },
      { id: 'link-12', sourceId: 'topic-bat-nha', targetId: 'topic-kinh-dich', linkType: 'related', strength: 3, notes: 'So sánh Tánh Không Phật học với Vô Cực - Thái Cực trong Dịch Học' },
    ],
    studyProgress: {
      topicId: 'topic-bat-nha',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 1,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // HUYỀN HỌC PHƯƠNG ĐÔNG
  {
    id: 'topic-ky-mon-don-giap',
    title: 'Kỳ Môn Độn Giáp - Môn Dự Trắc Địa Lý & Bát Trận',
    slug: 'ky-mon-don-giap',
    categoryId: 'cat-tam-thuc',
    categorySlug: 'tam-thuc',
    categoryName: 'Tam Thức (Kỳ Môn - Thái Ất - Lục Nhâm)',
    type: 'huyen-hoc',
    description: 'Một trong Tam Thức cổ điển, kết hợp Thiên Can Địa Chi, Bát Môn, Cửu Tinh, Bát Thần và Cửu Cung để mưu sự, chọn thời điểm và điều hướng khí trường phong thủy.',
    tags: ['Kỳ Môn', 'Tam Thức'],
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
      { id: 'link-13', sourceId: 'topic-ky-mon-don-giap', targetId: 'topic-thai-at-than-kinh', linkType: 'related', strength: 5, notes: 'Cùng nằm trong hệ thống Tam Thức cổ học' },
      { id: 'link-14', sourceId: 'topic-ky-mon-don-giap', targetId: 'topic-kinh-dich', linkType: 'prerequisite', strength: 5, notes: 'Kỳ môn bắt nguồn từ Cửu Cung Lạc Thư và Bát Quái' },
      { id: 'link-15', sourceId: 'topic-ky-mon-don-giap', targetId: 'topic-phong-thuy-ly-khi', linkType: 'related', strength: 4, notes: 'Kết hợp hướng thời không với lý khí nhà đất' },
    ],
    studyProgress: {
      topicId: 'topic-ky-mon-don-giap',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 1,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'topic-thai-at-than-kinh',
    title: 'Thái Ất Thần Kinh - Dự Trắc Thiên Vận & Khí Số Quốc Gia',
    slug: 'thai-at-than-kinh',
    categoryId: 'cat-tam-thuc',
    categorySlug: 'tam-thuc',
    categoryName: 'Tam Thức (Kỳ Môn - Thái Ất - Lục Nhâm)',
    type: 'huyen-hoc',
    description: 'Môn dự đoán thiên văn và vận thế vĩ mô đỉnh cao trong Tam Thức, nghiên cứu chu kỳ Thái Ất cửu cung và sự dịch chuyển của 16 Thần Sát.',
    tags: ['Tam Thức'],
    content: `## Tổng Quan Về Thái Ất Thần Kinh
Thái Ất coi sao Bắc Đẩu và thiên đế làm trung tâm, dùng Thái Ất thần kim tinh bàn để quán sát thiên tượng, khí hậu và sự biến thiên chu kỳ lớn.

### Các Trọng Cực Trong Thái Ất:
- **Thái Ất 16 Cung**: Vòng xoay Cửu cung và các vị trí chuyển dịch.
- **Chủ Tướng & Khách Tướng**: So sánh lực lượng đối đãi hai bên.
- **72 Cục Thái Ất**: Phân chia theo Dương Độn và Âm Độn.`,
    links: [
      { id: 'link-16', sourceId: 'topic-thai-at-than-kinh', targetId: 'topic-ky-mon-don-giap', linkType: 'related', strength: 5, notes: 'Tam Thức phối hợp Thiên - Địa' },
      { id: 'link-17', sourceId: 'topic-thai-at-than-kinh', targetId: 'topic-kinh-dich', linkType: 'prerequisite', strength: 4, notes: 'Nền tảng âm dương tiêu trưởng của Dịch học' },
    ],
    studyProgress: {
      topicId: 'topic-thai-at-than-kinh',
      status: 'not_started',
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
  {
    id: 'topic-kinh-dich',
    title: 'Kinh Dịch - Đạo Biến Dịch & 64 Quẻ',
    slug: 'kinh-dich-64-que',
    categoryId: 'cat-dich-hoc',
    categorySlug: 'dich-hoc',
    categoryName: 'Dịch Học (Kinh Dịch)',
    type: 'huyen-hoc',
    description: 'Nguồn gốc của mọi môn huyền học phương Đông: Thái Cực sinh Lưỡng Nghi, Lưỡng Nghi sinh Tứ Tượng, Tứ Tượng sinh Bát Quái và 64 Quẻ biến dịch khôn lường.',
    tags: ['Kinh Dịch'],
    content: `## Bản Chất Của Dịch Lý
Dịch có 3 nghĩa: **Biến Dịch** (thay đổi không ngừng), **Bất Dịch** (quy luật cốt lõi vĩnh hằng), và **Giản Dị** (đạo lý cùng tột là giản đơn).

### Cấu Trúc Quẻ Dịch:
- **Tiên Thiên Bát Quái** (Phục Hy): Càn (Trời), Đoài (Đầm), Ly (Lửa), Chấn (Sấm), Tốn (Gió), Khảm (Nước), Cấn (Núi), Khôn (Đất).
- **Hậu Thiên Bát Quái** (Văn Vương): Thể hiện sự vận hành 4 mùa và ngũ hành phương vị.
- **64 Quẻ Kép**: Mỗi quẻ gồm Nội quái và Ngoại quái, 6 hào từ, Thoán từ và Đại Tượng từ.`,
    links: [
      { id: 'link-18', sourceId: 'topic-kinh-dich', targetId: 'topic-ky-mon-don-giap', linkType: 'related', strength: 5, notes: 'Kỳ Môn ứng dụng Dịch lý vào cửu cung' },
      { id: 'link-19', sourceId: 'topic-kinh-dich', targetId: 'topic-phong-thuy-ly-khi', linkType: 'prerequisite', strength: 5, notes: 'Phong thủy Huyền Không xây dựng trên Hậu Thiên Bát Quái' },
      { id: 'link-20', sourceId: 'topic-kinh-dich', targetId: 'topic-tu-vi-dau-so', linkType: 'prerequisite', strength: 4, notes: 'Can chi và ngũ hành trong Tử Vi bắt nguồn từ Dịch học' },
      { id: 'link-21', sourceId: 'topic-kinh-dich', targetId: 'topic-bat-nha', linkType: 'related', strength: 4, notes: 'Đối chiếu triết học vô thường, dịch biến với tánh không' },
    ],
    studyProgress: {
      topicId: 'topic-kinh-dich',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 1,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'topic-phong-thuy-ly-khi',
    title: 'Phong Thủy Huyền Không Phi Tinh & Bát Trạch',
    slug: 'phong-thuy-huyen-khong-phi-tinh',
    categoryId: 'cat-phong-thuy',
    categorySlug: 'phong-thuy',
    categoryName: 'Phong Thủy Học',
    type: 'huyen-hoc',
    description: 'Nghiên cứu sự phân bố vượng suy của Cửu Tinh qua các thời vận (Vận 8 Bát Bạch, Vận 9 Cửu Tử) kết hợp hướng nhà tọa hướng và loan đầu ngoại cảnh.',
    tags: ['Phong Thủy'],
    content: `## 1. Khái Niệm Huyền Không Phi Tinh
Phi tinh nghiên cứu 9 ngôi sao (Nhất Bạch, Nhị Hắc, Tam Bích, Tứ Lục, Ngũ Hoàng, Lục Bạch, Thất Xích, Bát Bạch, Cửu Tử) bay vào 9 cung theo quỹ đạo Lường Thiên Xích.

### Cấu Trúc Tinh Bàn:
- **Vận Tinh**: Tinh bàn trung cung theo vận hiện tại (2024-2043 là Vận 9 Cửu Tử Ly Hỏa).
- **Sơn Tinh**: Quản nhân đinh, sức khỏe, sự hòa thuận của người cư ngụ.
- **Hướng Tinh**: Quản tài lộc, sự nghiệp, dòng tiền và cơ hội.`,
    links: [
      { id: 'link-22', sourceId: 'topic-phong-thuy-ly-khi', targetId: 'topic-kinh-dich', linkType: 'prerequisite', strength: 5, notes: 'Lạc Thư và Bát Quái là nền tảng tinh bàn' },
      { id: 'link-23', sourceId: 'topic-phong-thuy-ly-khi', targetId: 'topic-ky-mon-don-giap', linkType: 'related', strength: 4, notes: 'Điều chỉnh phong thủy bổ trợ trường khí Kỳ Môn' },
    ],
    studyProgress: {
      topicId: 'topic-phong-thuy-ly-khi',
      status: 'not_started',
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
  {
    id: 'topic-tu-vi-dau-so',
    title: 'Tử Vi Đẩu Số & 14 Chính Tinh Toàn Thư',
    slug: 'tu-vi-dau-so-14-chinh-tinh',
    categoryId: 'cat-tu-vi-tu-tru',
    categorySlug: 'tu-vi-tu-tru',
    categoryName: 'Tử Vi & Mệnh Lý',
    type: 'huyen-hoc',
    description: 'Nghệ thuật lập và giải đoán lá số Tử Vi dựa trên giờ, ngày, tháng, năm sinh với 12 cung chức và 14 chính tinh phân cấp miếu hãm đắc địa.',
    tags: ['Tử Vi'],
    content: `## Cấu Trúc Tinh Bàn Tử Vi
Lá số Tử Vi gồm 12 Cung: Mệnh, Phụ Mẫu, Phúc Đức, Điền Trạch, Quan Lộc, Nô Bộc, Thiên Di, Tật Ách, Tài Bạch, Tử Tức, Phu Thê, Huynh Đệ.

### 14 Chính Tinh Trọng Yếu:
- **Chòm Tử Vi**: Tử Vi, Thiên Cơ, Thái Dương, Vũ Khúc, Thiên Đồng, Liêm Trinh.
- **Chòm Thiên Phủ**: Thiên Phủ, Thái Âm, Tham Lang, Cự Môn, Thiên Tướng, Thiên Lương, Thất Sát, Phá Quân.
- **Tứ Hóa Biến Hóa**: Hóa Lộc (tài lộc, sinh khí), Hóa Quyền (quyền năng, hành động), Hóa Khoa (danh tiếng, giải ách), Hóa Kỵ (trở ngại, thử thách, nghiệp duyên).`,
    links: [
      { id: 'link-24', sourceId: 'topic-tu-vi-dau-so', targetId: 'topic-kinh-dich', linkType: 'prerequisite', strength: 4, notes: 'Ngũ hành sinh khắc can chi' },
      { id: 'link-25', sourceId: 'topic-tu-vi-dau-so', targetId: 'topic-thai-at-than-kinh', linkType: 'related', strength: 3, notes: 'Mệnh lý cá nhân đối chiếu với đại vận thiên văn' },
    ],
    studyProgress: {
      topicId: 'topic-tu-vi-dau-so',
      status: 'not_started',
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
    id: 'note-1',
    topicId: 'topic-abhidharma-tong-quan',
    topicTitle: 'Abhidharma - Vi Diệu Pháp Toàn Tập',
    title: 'Hiểu sâu về Tâm Vương và Tâm Sở trong thiền quán',
    content: `Khi khảo sát trong [[Thiền Vipassana (Minh Sát Tuệ) & Tứ Niệm Xứ]], nhận thấy Tâm thức (*Citta*) chỉ là sự thuần túy nhận biết đối tượng (như ánh sáng chiếu lên cảnh vật), trong khi các Tâm Sở (*Cetasika*) như Tầm, Tứ, Hỷ, Lạc mới là yếu tố tạo nên sắc thái và chất lượng cảm thọ của khoảnh khắc đó.
    
Điều này giúp hóa giải ảo tưởng về một "Cái Tôi" bất biến điều khiển tâm trí, bởi mọi diễn biến đều là sự tương tác duyên khởi của 52 tâm sở.`,
    type: 'insight',
    isPrivate: false,
    tags: ['Vi Diệu Pháp', 'Abhidharma'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    topicId: 'topic-thien-vipassana',
    topicTitle: 'Thiền Vipassana (Minh Sát Tuệ) & Tứ Niệm Xứ',
    title: 'Ghi chú về Thất Giác Chi và sự cân bằng Tâm Định - Tâm Tuệ',
    content: `Trong quá trình tu tập Tứ Niệm Xứ, cần lưu ý cân bằng giữa:
- **Tín Căn** và **Tuệ Căn** (quá nhiều Tín sinh mê tín, quá nhiều Tuệ sinh hoài nghi suy luận suông).
- **Tấn Căn** và **Định Căn** (quá nhiều Tấn sinh phóng dật bất an, quá nhiều Định sinh hôn trầm thụ động).
- **Niệm Căn** luôn đóng vai trò điều hòa trung tâm như người gác cổng sáng suốt.`,
    type: 'study',
    isPrivate: false,
    tags: ['Thiền Định', 'Vipassana'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-3',
    topicId: 'topic-ky-mon-don-giap',
    topicTitle: 'Kỳ Môn Độn Giáp - Môn Dự Trắc Địa Lý & Bát Trận',
    title: 'Tổng kết quy tắc Bát Môn đắc địa và tương khắc với Địa Bàn',
    content: `Quy tắc xem xét Bát Môn trong [[Kỳ Môn Độn Giáp - Môn Dự Trắc Địa Lý & Bát Trận]]:
- **Khai, Hưu, Sinh** là Tam Cát Môn. Nhưng nếu Khai Môn (Kim) bay đến Cung Chấn/Tốn (Mộc) gọi là "Môn Bách Cung" (cửa ép cung), cát khí suy giảm.
- **Tử, Kinh, Thương** là Tam Hung Môn. Nhưng nếu Tử Môn (Thổ) bay đến Cung Càn/Đoài (Kim) thì Thổ sinh Kim, biến hung thành bình hòa.
- Luôn kết hợp với Trực Phù và Cửu Tinh để định toàn cục cát hung.`,
    type: 'summary',
    isPrivate: false,
    tags: ['Kỳ Môn', 'Tam Thức'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-4',
    topicId: 'topic-bat-nha',
    topicTitle: 'Bát Nhã Ba La Mật Đa & Trung Quán Luận',
    title: 'Phân biệt Chân Đế trong Vi Diệu Pháp vs Tánh Không Bát Nhã',
    content: `Trong [[Abhidharma - Vi Diệu Pháp Toàn Tập]], 4 Pháp Chân Đế (Tâm, Tâm Sở, Sắc, Niết Bàn) được coi là thực tại cứu cánh có tự tính riêng (*Sabhāva*).
Tuy nhiên trong [[Bát Nhã Ba La Mật Đa & Trung Quán Luận]], Ngài Long Thọ tuyên bố tất cả các pháp đều vô tự tính (*Nissabhāva*) và Duyên Khởi tức là Tánh Không.

*Biện giải*: Luận Tạng phân tích thực tại hữu vi theo góc nhìn chức năng vi mô để hành giả không bám chấp vào khối giả danh (*Ghana*), còn Bát Nhã đứng ở bình diện rốt ráo để chặt đứt mọi chấp thủ vào chính các pháp.`,
    type: 'insight',
    isPrivate: false,
    tags: ['Bát Nhã'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-5',
    topicId: 'topic-kinh-dich',
    topicTitle: 'Kinh Dịch - Đạo Biến Dịch & 64 Quẻ',
    title: 'Nguyên lý Tiên Thiên Bát Quái và đối đãi Âm Dương',
    content: `Trong Tiên Thiên Bát Quái:
- Càn (Trời, 1) đối Khôn (Đất, 8) -> Tổng số hào = 9
- Đoài (Đầm, 2) đối Cấn (Núi, 7)
- Ly (Lửa, 3) đối Khảm (Nước, 6)
- Chấn (Sấm, 4) đối Tốn (Gió, 5)

Mọi cặp đối đều có tính chất bù trừ cân bằng tuyệt đối, biểu thị trạng thái tĩnh và bản thể của vũ trụ trước khi sinh hóa vạn vật.`,
    type: 'study',
    isPrivate: false,
    tags: ['Kinh Dịch'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_RESOURCES: Resource[] = [
  {
    id: 'res-1',
    topicId: 'topic-abhidharma-tong-quan',
    topicTitle: 'Abhidharma - Vi Diệu Pháp Toàn Tập',
    title: 'Thắng Pháp Tập Yếu Luận (Abhidhammattha Saṅgaha)',
    type: 'book',
    author: 'Trưởng Lão Anuruddha (Bản dịch Việt ngữ & Chú giải)',
    url: 'https://suttacentral.net/pitaka/abhidhamma',
    notes: 'Sách giáo khoa căn bản tra cứu 89 tâm, 52 tâm sở, 28 sắc pháp và 24 duyên hệ.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'res-2',
    topicId: 'topic-thien-vipassana',
    topicTitle: 'Thiền Vipassana (Minh Sát Tuệ) & Tứ Niệm Xứ',
    title: 'Đại Niệm Xứ Kinh (Mahā Satipaṭṭhāna Sutta - Dīgha Nikāya 22)',
    type: 'article',
    author: 'Đức Phật Thích Ca Mâu Ni / HT. Thích Minh Châu dịch',
    url: 'https://suttacentral.net/dn22',
    notes: 'Kinh điển căn bản về 4 lãnh vực quán niệm Thân, Thọ, Tâm, Pháp.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'res-3',
    topicId: 'topic-kinh-dich',
    topicTitle: 'Kinh Dịch - Đạo Biến Dịch & 64 Quẻ',
    title: 'Chu Dịch Toàn Thư & Thập Dực Khảo Luận',
    type: 'book',
    author: 'Phục Hy, Chu Văn Vương, Khổng Tử (Thập Dực)',
    url: 'https://ctext.org/book-of-changes/vi',
    notes: 'Văn bản kinh viện gốc khảo sát 64 quẻ, thoán từ, hào từ và đại tượng truyện.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'res-4',
    topicId: 'topic-ky-mon-don-giap',
    topicTitle: 'Kỳ Môn Độn Giáp - Môn Dự Trắc Địa Lý & Bát Trận',
    title: 'Kỳ Môn Độn Giáp Bí Kíp Toàn Thư (Bát Môn & Cửu Tinh Bàn)',
    type: 'pdf',
    author: 'Gia Cát Lượng / Lưu Bá Ôn chú giải',
    url: 'https://ctext.org/',
    notes: 'Tài liệu cổ bản tra cứu 1080 cục bàn Kỳ Môn Âm Dương Độn.',
    createdAt: new Date().toISOString(),
  },
];
