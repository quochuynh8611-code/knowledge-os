import { Category, Topic, Note, Resource, Tag } from "../types";

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: "cat-root-dong-y",
    name: "Đông Y",
    slug: "dong-y",
    type: "dong-y",
    parentId: null,
    description:
      "Lĩnh vực nghiên cứu Đông Y — Lý luận cơ bản, Tạng tượng, Bát cương, Dược học và Kinh lạc châm cứu.",
    icon: "Layers",
    color: "#059669",
  },
];

export const INITIAL_TOPICS: Topic[] = [
  {
    id: "topic-dong-y-co-ban",
    title: "Lý Luận Cơ Bản Đông Y",
    slug: "ly-luan-co-ban-dong-y",
    categoryId: "cat-root-dong-y",
    type: "dong-y",
    parentId: null,
    description:
      "Nền tảng âm dương, ngũ hành, tạng tượng và khí huyết trong Đông Y học cổ truyền.",
    content: "Nội dung cơ bản về Đông Y học cổ truyền.",
    tags: ["dong-y", "ly-luan-co-ban"],
    links: [],
    studyProgress: {
      topicId: "topic-dong-y-co-ban",
      status: "not_started",
      progress: 0,
      repetitions: 0,
      easeFactor: 2.5,
      interval: 0,
      totalNotes: 1,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_NOTES: Note[] = [
  {
    id: "note-commercial-onboarding",
    topicId: "topic-dong-y-co-ban",
    title: "Hướng dẫn bắt đầu sử dụng Knowledge OS",
    content: `# Chào mừng bạn đến với Knowledge OS!

Đây là không gian học tập, nghiên cứu và quản lý tri thức cá nhân hóa theo phương pháp chuyên sâu.

## Các tính năng chính:
- **Cây chủ đề (Topic Tree)**: Tổ chức tri thức theo từng lĩnh vực khoa học, chuyên ngành.
- **Ghi chú thông minh (Notes)**: Hỗ trợ ghi chú Markdown, liên kết đa chiều.
- **Flashcards & Spaced Repetition (SM-2)**: Ôn tập ngắt quãng thông minh giúp ghi nhớ dài hạn.
- **Research Hub**: Tích hợp nghiên cứu chuyên sâu và tài liệu tham khảo.
- **Thư Viện Sách (EPUB Reader)**: Đọc sách điện tử EPUB với giao diện tập trung và mượt mà.

Hãy bắt đầu khám phá bằng cách tạo chủ đề mới hoặc thêm flashcards của riêng bạn!`,
    type: "summary",
    isPrivate: false,
    tags: ["huong-dan", "onboarding"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_RESOURCES: Resource[] = [];

export const INITIAL_TAGS: Tag[] = [
  {
    id: "tag-dong-y",
    name: "Đông Y",
    slug: "dong-y",
    count: 1,
    color: "#059669",
  },
  {
    id: "tag-ly-luan",
    name: "Lý Luận Cơ Bản",
    slug: "ly-luan-co-ban",
    count: 1,
    color: "#D97706",
  },
];
