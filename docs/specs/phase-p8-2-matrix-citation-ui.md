# Phase P8.2 Mini-Spec: Matrix Citation UI & Batch Export Surfaces

**Status**: PROPOSED (Awaiting Human Sign-off)  
**Author**: Staff Software Engineer / Technical Architect  
**Domain**: Scholar Suite / Citation UI Subsystem  
**Baseline**: Phase P8.1 Complete (Commit `3c8420f`)

---

## 1. Executive Summary

Phase P8.1 đã thiết lập adapter `normalizeMatrixRelation()` và mở rộng `generateScholarCitations()` cho `MatrixRelation`.
Phase P8.2 đưa công cụ trích dẫn học thuật này lên các bề mặt giao diện Ma trận (`AbhidharmaMatrix` và `DivinationMatrix`) một cách trực quan, tiếp cận dễ dàng (accessible) và an toàn (không có side effect điều hướng).

---

## 2. Detailed Functional Specifications

### A. AbhidharmaMatrix Integration
1. **Node Citation (Trích dẫn Thực Thể Tâm)**:
   - Trong thẻ chi tiết `selectedCitta`, hiển thị nút "Trích Dẫn Tâm" (kèm icon `Quote`).
   - Nhấp nút mở `ScholarCitationModal` với `node={selectedCittaNode}`.
2. **Relation List & Relational Citation (Quan hệ liên đới)**:
   - Tự động lọc các quan hệ trong `MATRIX_RELATION_REGISTRY` liên kết với Tâm hiện tại (`rowNodeId === selectedCitta.id || colNodeId === selectedCitta.id`).
   - Mỗi thẻ quan hệ hiển thị:
     - Tên đối tượng liên kết (Node Cột / Node Hàng)
     - Huy hiệu `relationType` (`associates`, `conditions`, `corresponds`)
     - Huy hiệu `evidenceLevel` (`canonical`, `commentary`, `scholarly_conjecture`)
     - Bằng chứng văn bản tóm lược (`canonicalEvidence`)
     - Nút "Trích dẫn" mở `ScholarCitationModal` với `relation={rel}`.
3. **Batch Export Surface (Xuất danh mục quan hệ)**:
   - Nếu Tâm có $\ge 1$ quan hệ, hiển thị nút "Xuất .bib" và "Xuất .json" để tải trọn bộ trích dẫn của các quan hệ đang hiển thị.
   - Các quan hệ bị khóa (`isBlocked`) sẽ tự động được lọc bỏ khỏi tệp xuất, tránh ô nhiễm dữ liệu học thuật.

### B. DivinationMatrix Integration
1. **Node Citation (Trích dẫn Quẻ Chu Dịch)**:
   - Trong thẻ chi tiết `selectedHexagram`, hiển thị nút "Trích Dẫn Quẻ" mở `ScholarCitationModal` với `node={selectedHexNode}`.
2. **Cross-Domain Synthesis Relation Citation (Quan hệ đối chiếu)**:
   - Nếu Quẻ đang chọn có `MatrixRelation` đối chiếu học thuật (ví dụ Quẻ Thuần Càn $\rightarrow$ Tâm Tham 1), hiển thị mục "Khảo Cứu Đối Chiếu Đa Ngành" với nút "Trích Dẫn Đối Chiếu" (`relation={rel}`).

---

## 3. Accessibility & UX Integrity Rules

1. **No Unexpected Navigation**: Tuyệt đối không tự động chuyển tab hoặc gọi `openTopicDetail()` khi nhấp nút trích dẫn.
2. **Keyboard Access**: Nút bấm trích dẫn phải kích hoạt được bằng phím `Enter` hoặc `Space`.
3. **Modal Dismissal**: Hỗ trợ phím `Escape` và nút đóng `X` để quay về ngữ cảnh ma trận.
4. **Accessible Labels**: Sử dụng `aria-label` chi tiết mô tả rõ mục tiêu trích dẫn.
5. **Anti-Hallucination Visuals**: Quan hệ thiếu nguồn hiển thị cảnh báo `internal_note_only` và vô hiệu hóa nút sao chép.
