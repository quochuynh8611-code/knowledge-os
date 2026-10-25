# ADR-109: Phase 5 — Local Knowledge Copilot, Vector Search, Hybrid RRF & Grounded RAG Engine

## 1. Trạng Thái (Status)
- **Trạng thái:** ✅ ACCEPTED & READY FOR IMPLEMENTATION
- **Ngày quyết định:** 2026-10-25
- **Tác giả:** Staff Software Engineer & Technical Architect
- **Phạm vi:** Core Vector Search Engine (`src/lib/vectorSearchEngine.ts`), 128-D Local Trigram/Synonym Hashing Embeddings, Hybrid Reciprocal Rank Fusion (RRF), Grounded RAG Retrieval Pipeline, Zero Database Schema Migrations.

---

## 2. Bối Cảnh (Context)
Hệ thống Knowledge OS hiện đã sở hữu bộ tìm kiếm từ khóa học thuật Okapi BM25 (`src/lib/researchSearchEngine.ts`) với khả năng chuẩn hóa dấu tiếng Việt và ký tự chuyển tự Pāli/Sanskrit IAST. Tuy nhiên, khi hệ thống phát triển thành **Academic Research Workstation**, việc chỉ tìm kiếm theo từ khóa chính xác bộc lộ 3 giới hạn nghiêm trọng:
1. **Rào cản Từ Vựng (Vocabulary Mismatch / Synonym Gap):** Nhà nghiên cứu tìm kiếm `"trí nhớ và đường cong quên"` sẽ bỏ lỡ các tài liệu viết bằng tiếng Anh như `"memory retention and forgetting curve in spaced repetition"`, hay tìm `"nhận thức luận"` bỏ lỡ `"epistemology and cognitive architecture"`.
2. **Thiếu Khả năng Tìm kiếm Ngữ nghĩa Đa Thực thể (Cross-Entity Semantic Search):** Người dùng muốn truy vấn bao quát cả 5 thực thể cốt lõi (`Topic`, `Note`, `Resource`, `Flashcard`, `ResearchExcerpt`), nhưng BM25 trước đây chỉ lập chỉ mục cho `Note`, `Flashcard`, `Resource`.
3. **Thiếu Cơ chế Cung cấp Bằng chứng Grounding cho AI Copilot (Hallucination Defense):** Khi người dùng đặt câu hỏi nghiên cứu cho AI (trong `AIResearchStudio`), mô hình ngôn ngữ lớn cần được cung cấp ngữ cảnh có trích dẫn nguồn chuẩn xác (`[^SRC-1]`, `[^SRC-2]`) được trích xuất tự động từ chính kho tri thức cục bộ của người dùng (Grounded RAG) thay vì phụ thuộc hoàn toàn vào kiến thức nội tại của LLM.

---

## 3. Quyết Định Kiến Trúc (Architectural Decisions)

### 3.1. Dual-Tier Local Semantic Embedding Engine (100% Offline-First)
- **Thiết kế:** Tạo hàm `computeLocalEmbedding(text: string, dimensions = 128): Float32Array`.
- **Cơ chế hoạt động:**
  1. **Text Normalization:** Chuyển chữ thường, chuẩn hóa dấu tiếng Việt / IAST qua `normalizeScholarText`.
  2. **Bilingual Academic Synonym Table:** Xây dựng bảng từ điển tương đương ngữ nghĩa học thuật song ngữ Việt – Anh (ví dụ: `trí nhớ/memory/retention`, `quên/forgetting/decay`, `lặp lại ngắt quãng/spaced repetition/srs/fsrs`, `nhận thức/cognition/epistemology`, `lượng tử/quantum`, `di truyền/genetics/dna`, `đạo đức/ethics`, `thuật toán/algorithm`, `tri thức/knowledge`, `nghiên cứu/research/scholarship`, `phương pháp/methodology`). Khi gặp từ khóa trong bảng, kích hoạt thêm các vector chiều tương ứng để kéo hai khái niệm song ngữ lại gần nhau trong không gian vector.
  3. **Character Trigram Feature Hashing:** Phân rã văn bản thành các chuỗi 3 ký tự liên tiếp (trigrams) và ánh xạ qua hàm băm Murmur-style với sign bit:
     $$h_i = \text{hash}(\text{trigram}) \pmod D, \quad s_i = \text{sign}(\text{hash}(\text{trigram}))$$
     Giúp bắt trọn hình thái từ, từ ghép, và chịu lỗi chính tả mà không cần mô hình neural nặng hàng trăm megabyte.
  4. **L2 Normalization:** Chuẩn hóa vector kết quả $\vec{v} = \frac{\vec{u}}{\|\vec{u}\|_2}$, cho phép tính Cosine Similarity trực tiếp bằng tích vô hướng (Dot Product):
     $$\text{cosineSimilarity}(\vec{a}, \vec{b}) = \sum_{i=1}^{D} a_i \cdot b_i$$
- **Cung cấp `EmbeddingProvider` Interface:** Hỗ trợ cắm thêm Remote Embedding Provider (ví dụ: Google Gemini `text-embedding-004`) khi người dùng có kết nối mạng, kèm bộ đệm LRU Cache tránh tính toán lại.

### 3.2. Hybrid Reciprocal Rank Fusion (RRF)
- Khi tìm kiếm tri thức, điểm BM25 và Cosine Similarity nằm trên hai thang đo hoàn toàn khác nhau (BM25: $0 \to \infty$; Cosine Similarity: $-1 \to 1$).
- Áp dụng thuật toán chuẩn công nghiệp **Reciprocal Rank Fusion (RRF)** để dung hòa thứ hạng của cả hai engine mà không cần tinh chỉnh trọng số nhạy cảm:
  $$\text{RRF\_Score}(d) = \frac{w_{\text{bm25}}}{k + \text{rank}_{\text{bm25}}(d)} + \frac{w_{\text{vec}}}{k + \text{rank}_{\text{vec}}(d)}$$
  với hằng số làm mượt $k = 60$, trọng số mặc định $w_{\text{bm25}} = 1.0, w_{\text{vec}} = 1.0$.
- Cung cấp 3 chế độ tìm kiếm (`SearchMode = 'keyword' | 'semantic' | 'hybrid'`):
  - `'keyword'`: Xếp hạng thuần BM25.
  - `'semantic'`: Xếp hạng thuần Vector Cosine Similarity.
  - `'hybrid'`: Hợp nhất RRF cho độ chính xác cao nhất (vừa khớp từ khóa vừa khớp ngữ nghĩa).

### 3.3. Grounded RAG Retrieval Pipeline (`retrieveGroundedContextForQuery`)
- Trích xuất Top-$K$ (mặc định $K = 8$) đoạn trích tri thức phù hợp nhất trên cả 5 thực thể (`topic`, `note`, `resource`, `flashcard`, `excerpt`).
- Tự động gán mã định danh dẫn chứng học thuật `[^SRC-1]`, `[^SRC-2]`, ...
- Trả về cấu trúc `GroundedRagContextBundle`:
  - `chunks: GroundedContextChunk[]` (metadata, sourceId, title, snippet, score, citationMarker).
  - `formattedPromptContext: string`: Khối văn bản XML/Markdown sẵn sàng tiêm thẳng vào Prompt của AI Copilot:
    ```markdown
    <grounded_knowledge_context>
    [^SRC-1] (Loại: Ghi chú | Tiêu đề: "Định luật bảo toàn năng lượng")
    Nội dung trích đoạn...

    [^SRC-2] (Loại: Trích đoạn PDF | Trang: 2 | Nguồn: "Vật lý lượng tử")
    Nội dung trích đoạn...
    </grounded_knowledge_context>
    ```

---

## 4. Hệ Quả & Ranh Giới (Consequences & Invariants)
- **Zero Database Migrations:** 100% logic chạy in-memory trong TypeScript runtime, bảo toàn 100% Prisma schema và cơ sở dữ liệu SQLite/PostgreSQL.
- **Zero Heavy Bundles:** Thuật toán nhúng cục bộ sử dụng toán học thuần túy (Feature Hashing + Synonym Dictionary), không tải thư viện ONNX/TensorFlow.js hàng trăm MB, giữ bundle ứng dụng siêu nhẹ.
- **Fail-Closed & Offline Resilience:** Khi offline hoặc không có API key, Copilot và Search Engine vẫn hoạt động 100% trơn tru nhờ engine vector cục bộ.
