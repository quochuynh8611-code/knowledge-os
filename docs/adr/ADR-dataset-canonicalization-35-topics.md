# ADR: Dataset Canonicalization — 35 Topics SSOT

- **Mã ADR:** ADR-010
- **Trạng thái:** ACCEPTED
- **Ngày tạo:** 2026-08-23
- **Phê duyệt bởi:** Human-in-the-loop checkpoint
- **Phạm vi:** `src/data/initialData.ts` · `tests/unit/dataset-canonicalization.test.ts` · `docs/gherkin/dataset-canonicalization.feature`

---

## 1. Bối Cảnh (Context)

Dashboard Nghiên Cứu Phật Học & Huyền Học (Knowledge OS) cần một bộ dữ liệu hạt nhân (seed dataset) làm nền tảng cho:

- Seeding database PostgreSQL idempotent (Phase 2B).
- Dữ liệu mặc định khi người dùng chưa kết nối server.
- Dữ liệu tham chiếu cho backup/restore và checksum validation (Phase 2C).

Yêu cầu nghiệp vụ đã xác định: mở rộng `INITIAL_TOPICS` từ 10 (legacy) lên **35 topics canonical**, bao quát đầy đủ 8 category của hai lĩnh vực Phật Học và Huyền Học.

---

## 2. Trạng Thái Thực Tế Tại Thời Điểm ADR (Observed SSOT)

> **LƯU Ý QUAN TRỌNG**: Dataset đã được implement hoàn chỉnh trong repo hiện tại. ADR này ghi nhận và đóng dấu các quyết định đã thực thi.

### Cardinalities Hiện Tại (CONFIRMED)

| Collection           | Số phần tử | Trạng thái   |
|----------------------|-----------|--------------|
| `INITIAL_CATEGORIES` | **8**     | ✅ Confirmed  |
| `INITIAL_TOPICS`     | **35**    | ✅ Confirmed  |
| `INITIAL_NOTES`      | **5**     | ✅ Confirmed  |
| `INITIAL_RESOURCES`  | **4**     | ✅ Confirmed  |
| `INITIAL_TAGS`       | **12**    | ✅ Confirmed  |

### 8 Category IDs Hiện Hữu (Ground Truth)

| ID                        | Name                                     | Type       |
|---------------------------|------------------------------------------|------------|
| `cat-tam-tang`            | Tam Tang (Tipitaka)                      | phat-hoc   |
| `cat-abhidharma`          | Abhidharma (Vi Dieu Phap)                | phat-hoc   |
| `cat-thien-dinh`          | Thien Dinh (Bhavana)                     | phat-hoc   |
| `cat-triet-hoc-phat-giao` | Triet Hoc Phat Giao                      | phat-hoc   |
| `cat-tam-thuc`            | Tam Thuc (Ky Mon - Thai At - Luc Nham)   | huyen-hoc  |
| `cat-dich-hoc`            | Dich Hoc (Kinh Dich)                     | huyen-hoc  |
| `cat-phong-thuy`          | Phong Thuy Hoc                           | huyen-hoc  |
| `cat-tu-vi-tu-tru`        | Tu Vi & Menh Ly                          | huyen-hoc  |

### 35 Topic IDs Canonical (tóm tắt)

Topics 1-10 (LEGACY): topic-abhidharma-tong-quan, topic-phap-tu, topic-vi-tri-patthana,
topic-thien-vipassana, topic-bat-nha, topic-ky-mon-don-giap, topic-thai-at-than-kinh,
topic-kinh-dich, topic-phong-thuy-ly-khi, topic-tu-vi-dau-so

Topics 11-25 (Phat Hoc expansion): topic-tang-kinh-nikaya, topic-tang-luat-vinaya,
topic-tam-va-tam-so, topic-sac-phap-rupa, topic-lo-trinh-tam-citta-vithi,
topic-bo-phan-tich-vibhanga, topic-bo-chat-ngu-dhatukatha, topic-bo-nhan-che-dinh-puggala,
topic-bo-ngu-tong-kathavatthu, topic-bo-song-doi-yamaka, topic-thien-chi-samatha,
topic-tu-niem-xu-satipatthana, topic-7-giai-doan-thanh-tinh, topic-trung-quan-long-tho,
topic-du-gia-duy-thuc

Topics 26-35 (Huyen Hoc expansion): topic-dai-luc-nham, topic-ky-mon-am-duong-don,
topic-tien-hau-thien-bat-quai, topic-64-que-dich-toan-thu, topic-mai-hoa-dich-so,
topic-bat-tu-tu-tru, topic-tu-vi-14-chinh-tinh, topic-tu-vi-12-cung-chuc,
topic-phong-thuy-loan-dau, topic-phong-thuy-huyen-khong-van-9

---

## 3. Quyet Dinh (Decision)

### 3.1 SSOT Declaration

`src/data/initialData.ts` la **Single Source of Truth** duy nhat cho toan bo he thong.

### 3.2 Immutability Contract

Cac truong KHONG DUOC THAY DOI sau khi da seed vao production:
- `topic.id` — foreign key trong notes, resources, studyProgress, links
- `topic.slug` — URL routing
- `category.id` — foreign key trong topics
- `tag.id` va `tag.name` — topic.tags array lookups

### 3.3 Blocker Cat-Menh-Ly: DA GIAI QUYET

> **RESOLVED** — Khong con blocker trong implementation thuc te.

Spec draft ban dau su dung `categoryId: "cat-menh-ly"` cho topics Men Ly/Tu Vi.
SSOT thuc te su dung `cat-tu-vi-tu-tru` cho 4 topics: topic-tu-vi-dau-so,
topic-bat-tu-tu-tru, topic-tu-vi-14-chinh-tinh, topic-tu-vi-12-cung-chuc.
Khong co topic nao dung `cat-menh-ly` trong SSOT.

**Ket luan**: Spec draft da dung ten sai; SSOT da dung; khong can rename hay them category moi.

---

## 4. Invariants Ky Thuat

### Cardinality Invariants
- INITIAL_CATEGORIES.length === 8
- INITIAL_TOPICS.length === 35
- INITIAL_NOTES.length === 5
- INITIAL_RESOURCES.length === 4
- INITIAL_TAGS.length === 12

### Referential Integrity Invariants
- topic.categoryId phai ton tai trong INITIAL_CATEGORIES
- topic.type phai khop voi category.type tuong ung
- link.targetId phai ton tai trong INITIAL_TOPICS
- link.sourceId phai bang topic.id
- Khong self-link (link.targetId != link.sourceId)
- Khong duplicate targetId trong cung mot topic.links
- note.topicId phai ton tai trong INITIAL_TOPICS
- resource.topicId phai ton tai trong INITIAL_TOPICS
- topic.tags[*] phai thuoc tap INITIAL_TAGS.name

### StudyProgress Default Invariants
```
topicId: <owning topic.id>
status: "not_started"
progress: 0
interval: 0
easeFactor: 2.5
repetitions: 0
totalNotes: 0
timeSpent: 0
```

### Uniqueness Invariants
- Tat ca topic.id la duy nhat
- Tat ca topic.slug la duy nhat

### Schema Invariants
- Moi topic phai pass TopicSchema.safeParse() tu src/lib/validation.ts

---

## 5. Rui Ro & Blast Radius

| Rui ro                                          | Muc do   | Bien phap giam thieu                    |
|-------------------------------------------------|----------|-----------------------------------------|
| Thay doi topic.id lam mat foreign keys          | HIGH     | Test 7 khoa cung 5 IDs legacy           |
| Them category moi ma khong them topics          | MEDIUM   | Test cardinality + valid categoryId     |
| Tag moi khong duoc dang ky trong INITIAL_TAGS   | MEDIUM   | Test 5 fail neu dung tag ngoai 12       |
| Link tro toi topic chua ton tai                 | HIGH     | Test 4 fail neu targetId khong ton tai  |
| studyProgress sai easeFactor                    | LOW      | Test 6 bat loi                          |

---

## 6. Non-Goals

- ADR nay KHONG quy dinh giao dien UI cho tung topic.
- ADR nay KHONG quyet dinh cach backup/restore xu ly du lieu (xem ADR-009).
- ADR nay KHONG yeu cau database migration tu dong khi dataset thay doi.

---

## 7. Open Questions

| # | Cau hoi                                                     | Trang thai              |
|---|-------------------------------------------------------------|-------------------------|
| 1 | Co nen tang len 50 topics trong giai doan tiep theo khong?  | Chua quyet dinh         |
| 2 | `cat-menh-ly` co nen them nhu subcategory rieng khong?      | Chua co yeu cau ro rang |

---

## 8. Approval Gate

- [x] SSOT da duoc doc va xac minh (commit hien tai)
- [x] Cardinalities da duoc xac nhan bang runtime check
- [x] Tat ca invariants da duoc khoa boi tests/unit/dataset-canonicalization.test.ts (8 tests, 100% pass)
- [x] Blocker cat-menh-ly da duoc giai quyet (khong ton tai trong SSOT)
- [x] Gherkin feature da duoc cap nhat phien ban hoan chinh
- [ ] **Cho phe duyet** neu co yeu cau thay doi cardinality hoac them category moi
