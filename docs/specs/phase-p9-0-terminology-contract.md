# Phase P9.0 Mini-Spec: Universal Terminology Contract & Foundation

**Status**: PROPOSED (Awaiting Human Sign-off)  
**Author**: Staff Software Engineer / Technical Architect  
**Domain**: Terminology Contract & Multi-Domain Ontology Architecture  
**Baseline**: Phase P8.4 Complete (Commit `498e603`)

---

## 1. Mục Tiêu Thiết Kế

Nâng cấp mô hình thuật ngữ từ dạng hẹp, gắn chặt với Scholar Suite (`LexiconEntry`) thành một **Universal Terminology Contract** tổng quát, trừu tượng và có khả năng mở rộng cho mọi miền tri thức:
1. **Contract Trừu Tượng Hóa (`src/types/terminology.ts`)**:
   - `CoreKnowledgeDomain`: Tập hợp các miền tri thức cốt lõi hiện có (`'phat-hoc' | 'huyen-hoc' | 'triet-hoc' | 'khoa-hoc-tam-thuc' | 'da-nganh'`).
   - `KnowledgeDomain`: Mở rộng mở (Open Union `CoreKnowledgeDomain | (string & {})`) để cho phép các miền tri thức tương lai (`'y-hoc-co-truyen'`, `'western-philosophy'`, v.v.) mà vẫn giữ được autocomplete của IDE.
   - `TerminologySource`: Chuẩn hóa nguồn tham chiếu học thuật mở rộng, hỗ trợ cả kinh điển cổ điển (`ptsRef`, `taishoRef`) lẫn xuất bản hiện đại (`doi`, `url`, `standardEdition`).
   - `TerminologyEntry`: Đại diện chuẩn cho một mục từ tri thức độc lập.
   - `TerminologyDictionary`: Interface trừu tượng cho các từ điển / ontology registries, định nghĩa các thao tác `getEntry`, `search`, `listAll`.
2. **Bảo Toàn Tương Thích Ngược 100%**:
   - Không phá vỡ `LexiconEntry`, `SystemNode`, `MatrixRelation` hay `ScholarCitationViewModel`.
   - Chuẩn bị nền tảng để các adapter trong `normalizer.ts` có thể chuyển đổi mượt mà giữa `TerminologyEntry` và `ScholarCitationViewModel`.

---

## 2. Chi Tiết Kiểu Dữ Liệu (`src/types/terminology.ts`)

```typescript
export type CoreKnowledgeDomain =
  | 'phat-hoc'
  | 'huyen-hoc'
  | 'triet-hoc'
  | 'khoa-hoc-tam-thuc'
  | 'da-nganh';

export type KnowledgeDomain = CoreKnowledgeDomain | (string & {});

export interface TerminologySource {
  sourceTitle: string;
  sectionRef?: string;
  ptsRef?: string;
  taishoRef?: string;
  standardEdition?: string;
  doi?: string;
  url?: string;
}

export interface TerminologyEntry {
  readonly id: string;
  readonly title: string;
  readonly domain: KnowledgeDomain;
  readonly code?: string;
  readonly canonicalTerm?: string;
  readonly aliases?: Record<string, string>;
  readonly summary?: string;
  readonly provenanceNote?: string;
  readonly sources?: TerminologySource[];
}

export interface TerminologyDictionary {
  readonly name: string;
  readonly domain: KnowledgeDomain;
  getEntry(id: string): TerminologyEntry | undefined;
  search(query: string): TerminologyEntry[];
  listAll?(): TerminologyEntry[];
}
```

---

## 4. Blast Radius & Giai Đoạn Triển Khai (Staged Rollout)

- **Mức độ: Blast radius thấp**:
  - Giai đoạn 1 (Phase 1) giới hạn ở `docs/`, `tests/unit/` và định nghĩa kiểu dữ liệu thuần túy `src/types/terminology.ts`.
  - Không sửa đổi mã nguồn sản xuất hiện hữu (`src/types/scholarSuite.ts`, `src/types/scholarCitation.ts`).
  - Giai đoạn 2 (Phase 2) sẽ tích hợp adapter chuẩn hóa `normalizeTerminologyEntry` và tương thích ngược với Scholar Suite, có kiểm soát theo phase và bài kiểm thử RED $\rightarrow$ GREEN độc lập.

