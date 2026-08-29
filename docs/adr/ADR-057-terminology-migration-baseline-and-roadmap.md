# ADR-057: Terminology Migration Baseline Lock and Evolutionary Roadmap

**Status**: PROPOSED  
**Date**: 2026-08-29  
**Author**: Staff Software Engineer / Technical Architect  
**Deciders**: Engineering Lead, Technical Architect  
**Context**: Phase P9.3 — Terminology Migration Baseline Lock

---

## 1. Context & Problem Statement

Qua 4 giai đoạn tiến hóa của chuỗi P9, hệ thống thuật ngữ đã được nâng cấp từ mô hình hẹp `LexiconEntry` thành mô hình tổng quát `TerminologyEntry` kèm adapter `TerminologyDictionary`. Để chuẩn bị cho các bước phát triển kế tiếp một cách an toàn và có kiểm soát, cần chính thức khóa baseline kiến trúc, chuẩn hóa bảng ánh xạ giai đoạn và xác định rõ ranh giới các tính năng đã làm / chưa làm.

---

## 2. Decision

1. **Khóa Baseline Giai Đoạn P9 (P9.0 $\rightarrow$ P9.3)**:
   - **P9.0**: Universal Terminology Contract (`src/types/terminology.ts`).
   - **P9.1**: Terminology Citation Normalizer Bridge (`normalizeTerminologyEntry`, `ScholarCitationViewModel.domain`).
   - **P9.2**: Type Alignment Cleanup (`CitationEntityType`, `generateCitationKey`).
   - **P9.3**: Read-Only Lexicon Dictionary Adapter (`src/lib/terminology/lexiconDictionary.ts`).

2. **Chính Sách Ánh Xạ Một Chiều (Unidirectional Read-Only Policy)**:
   - Chỉ cho phép chuyển đổi một chiều từ `LexiconEntry` sang `TerminologyEntry`.
   - Tuyệt đối không xây dựng reverse adapter (`TerminologyEntry -> LexiconEntry`) ở thời điểm hiện tại để ngăn chặn nguy cơ ngụy tạo dữ liệu thiếu hụt.

3. **Chính Sách Bảo Toàn Tương Thích Ngược**:
   - Tất cả các consumers hiện hữu của Scholar Suite (giao diện, registry, selectors, formatters) tiếp tục hoạt động 100% không bị ảnh hưởng.

4. **Kế Hoạch Khảo Sát & Thử Nghiệm Tiếp Theo (Roadmap)**:
   - Đề xuất tiếp tục mở rộng pure adapters cho System Nodes (P10.0) và tối ưu hóa Search Indexing (P10.1) trước khi can thiệp vào UI (P11.0).

---

## 3. Blast Radius Assessment

- **Mức độ: Blast radius thấp**:
  - Toàn bộ thay đổi nằm trong tài liệu kiến trúc (`docs/specs/`, `docs/adr/`, `docs/gherkin/`), mã nguồn contract và pure adapters.
  - Không có bất kỳ thay đổi nào làm ảnh hưởng đến mã nguồn production đang chạy trên UI.
