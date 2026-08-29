# Phase P9.2 Mini-Spec: Read-Only Terminology Dictionary Adapter for Lexicon Registry

**Status**: PROPOSED (Awaiting Human Sign-off)  
**Author**: Staff Software Engineer / Technical Architect  
**Domain**: Terminology Subsystem / Dictionary Adapter  
**Baseline**: Phase P9.1 Complete

---

## 1. Mục Tiêu Thiết Kế

Tạo một adapter chỉ-đọc (read-only) `src/lib/terminology/lexiconDictionary.ts` để kết nối kho dữ liệu thuật ngữ hiện có (`LEXICON_REGISTRY`) với interface chuẩn `TerminologyDictionary`:
1. **Ánh Xạ Một Chiều (`LexiconEntry -> TerminologyEntry`)**:
   - Chuyển đổi `LexiconEntry` sang `TerminologyEntry` một cách tất định và bảo toàn toàn bộ định danh đa ngôn ngữ (`terms` $\rightarrow$ `aliases`).
   - Giữ nguyên các trường metadata cốt lõi: `id`, `slug` $\rightarrow$ `code`, `canonicalDefinition` $\rightarrow$ `summary`, `sources`, `provenanceNote`.
2. **Cài Đặt Interface `TerminologyDictionary`**:
   - Cung cấp phương thức `getEntry(id: string)`: tra cứu nhanh O(1).
   - Cung cấp phương thức `search(query: string)`: tìm kiếm thuần túy (pure, deterministic), khớp trên tiêu đề, tóm tắt, mã code, thuật ngữ kinh điển và toàn bộ các bí danh ngôn ngữ (`aliases`).
   - Cung cấp phương thức `listAll()`: trả về danh sách toàn bộ các mục từ dưới dạng `TerminologyEntry[]`.
3. **Bất Biến Nghiêm Ngặt**:
   - Read-only, không làm biến đổi (mutate) dữ liệu của `LEXICON_REGISTRY`.
   - Không thay đổi UI components.
   - Chưa làm reverse adapter (`TerminologyEntry -> LexiconEntry`).

---

## 2. Chi Tiết Kỹ Thuật

### A. Hàm Ánh Xạ Thuần (`mapLexiconEntryToTerminology`)
```typescript
export function mapLexiconEntryToTerminology(entry: LexiconEntry): TerminologyEntry {
  const canonicalName = entry.terms.pali || entry.terms.sanskrit;
  const title = canonicalName
    ? `${canonicalName} (${entry.terms.vietnamese})`
    : entry.terms.vietnamese;

  const aliases: Record<string, string> = {
    vietnamese: entry.terms.vietnamese,
    english: entry.terms.english,
  };
  if (entry.terms.pali) aliases.pali = entry.terms.pali;
  if (entry.terms.sanskrit) aliases.sanskrit = entry.terms.sanskrit;
  if (entry.terms.hanTu) aliases.hanTu = entry.terms.hanTu;
  if (entry.terms.pinyin) aliases.pinyin = entry.terms.pinyin;

  return {
    id: entry.id,
    title,
    domain: entry.domain,
    code: entry.slug,
    canonicalTerm: entry.terms.pali || entry.terms.sanskrit || entry.slug,
    aliases,
    summary: entry.canonicalDefinition,
    provenanceNote: entry.provenanceNote,
    sources: entry.sources.map((s) => ({
      sourceTitle: s.sourceTitle,
      sectionRef: s.sectionRef,
      ptsRef: s.ptsRef,
      taishoRef: s.taishoRef,
      standardEdition: s.standardEdition,
    })),
  };
}
```

### B. Factory & Adapter (`createLexiconDictionary`)
```typescript
export function createLexiconDictionary(
  entries: LexiconEntry[] = LEXICON_REGISTRY,
  name = 'Scholar Suite Lexicon Dictionary'
): TerminologyDictionary
```
