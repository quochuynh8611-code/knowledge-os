# Phase P9.1 Mini-Spec: Terminology Citation Normalizer & Bridge

**Status**: PROPOSED (Awaiting Human Sign-off)  
**Author**: Staff Software Engineer / Technical Architect  
**Domain**: Scholar Citation Engine / Terminology Normalization Bridge  
**Baseline**: Phase P9.0 Complete (Commit `498e603` + `src/types/terminology.ts`)

---

## 1. Mục Tiêu Thiết Kế

Tạo hàm adapter bridge chuẩn hóa `normalizeTerminologyEntry` để chuyển đổi bất kỳ `TerminologyEntry` nào sang `ScholarCitationViewModel`, đảm bảo:
1. Hỗ trợ đầy đủ các miền tri thức cốt lõi (`CoreKnowledgeDomain`) cũng như miền tri thức mở rộng tùy biến (`KnowledgeDomain`).
2. Tuân thủ 100% mô hình đánh giá mức độ đầy đủ nguồn (Tripartite Sufficiency Model):
   - `internal_note_only`: khi không có nguồn `sources` hoặc mảng nguồn rỗng.
   - `canonical_complete`: khi nguồn chính có `ptsRef`, `taishoRef` hoặc `standardEdition`.
   - `canonical_minimal`: khi có nguồn chính `sourceTitle` nhưng chưa có số hiệu định danh kinh điển cổ điển.
3. Sinh `citationKey` tất định (deterministic) tương thích định dạng LaTeX / BibTeX.
4. Bảo toàn tuyệt đối tính tương thích ngược cho:
   - `normalizeLexiconEntry`
   - `normalizeSystemNode`
   - `normalizeMatrixRelation`

---

## 2. Chi Tiết Kỹ Thuật

### A. Cập Nhật Kiểu Dữ Liệu (`src/types/scholarCitation.ts`)
- Mở rộng kiểu trường `domain` của `ScholarCitationViewModel` từ union hẹp sang `KnowledgeDomain`:
  ```typescript
  import type { KnowledgeDomain } from './terminology';
  export type { KnowledgeDomain } from './terminology';

  export interface ScholarCitationViewModel {
    readonly domain: KnowledgeDomain;
    // ... các trường khác giữ nguyên 100%
  }
  ```

### B. Hàm Chuẩn Hóa Lõi (`src/lib/scholarCitation/normalizer.ts`)
```typescript
export interface NormalizeTerminologyOptions {
  cslType?: 'entry-dictionary' | 'chapter';
  entityType?: 'term' | 'lex' | 'sys';
}

export function normalizeTerminologyEntry(
  entry: TerminologyEntry,
  options?: NormalizeTerminologyOptions
): ScholarCitationViewModel
```

---

## 3. Kế Hoạch Kiểm Thử (RED $\rightarrow$ GREEN)
- Tạo test suite: `tests/unit/scholar-citation-terminology-normalizer.test.ts`.
- Chạy toàn bộ regression test suites của Scholar Suite để đảm bảo zero breakage.
