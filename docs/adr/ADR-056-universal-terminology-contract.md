# ADR-056: Universal Terminology Contract & Extensible Knowledge Domain Foundation

**Status**: PROPOSED  
**Date**: 2026-08-29  
**Author**: Staff Software Engineer / Technical Architect  
**Deciders**: Engineering Lead, Technical Architect  
**Context**: Phase P9.0 — Universal Terminology Contract

---

## 1. Context & Problem Statement

Mô hình thuật ngữ hiện tại trong `src/types/scholarSuite.ts` (`LexiconEntry`) đang gắn chặt vào ngữ cảnh giao diện và hệ thống phân loại nội bộ của Scholar Suite với tập hợp domain bị giới hạn cố định. Khi ứng dụng mở rộng sang các miền tri thức mới (như Y học cổ truyền, Triết học phương Tây, Khoa học thần kinh, v.v.), hệ thống cần một bản giao kèo dữ liệu (Contract) độc lập, thuần túy, có thể tái sử dụng cho các module phân tích và trích dẫn mà không gây vỡ các cấu trúc dữ liệu hiện hữu.

---

## 2. Decision

1. **Tạo module contract chuyên biệt `src/types/terminology.ts`**:
   - Sử dụng kỹ thuật TypeScript Tagged Open Union `CoreKnowledgeDomain | (string & {})` cho `KnowledgeDomain` nhằm duy trì trải nghiệm gợi ý code (IDE Autocomplete) cho các miền cốt lõi, đồng thời mở rộng vô hạn cho các miền tri thức tùy biến trong tương lai.
   - Định nghĩa `TerminologySource` hỗ trợ cả mã định danh số hiện đại (`doi`, `url`) lẫn định danh kinh điển cổ điển (`ptsRef`, `taishoRef`, `standardEdition`).
   - Định nghĩa `TerminologyEntry` mang tính bất biến (`readonly`) với cấu trúc metadata tối thiểu cần thiết cho trích dẫn và nghiên cứu đối chiếu.
   - Định nghĩa interface `TerminologyDictionary` để chuẩn hóa các adapter từ điển tri thức.

2. **Giữ nguyên trạng các file hiện tại**:
   - Không xóa, không thay đổi chữ ký của `src/types/scholarSuite.ts` và `src/types/scholarCitation.ts` trong bước này.

---

## 3. Blast Radius Assessment

- **Mức độ: Blast radius thấp**:
  - Giai đoạn khởi tạo giới hạn ở tài liệu (`docs/`), bài kiểm thử (`tests/unit/`) và định nghĩa kiểu dữ liệu mới (`src/types/terminology.ts`).
  - Không sửa đổi hay làm gián đoạn các contract production hiện hữu (`src/types/scholarSuite.ts`, `src/types/scholarCitation.ts`).
  - Các pha implementation tiếp theo sẽ chạm vào `src/` để nối adapter nên cần kiểm soát theo từng phase với bài test tương thích ngược rõ ràng.

