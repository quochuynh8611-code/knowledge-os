# ADR-114: Phase 10 — Graph Intelligence: Centrality Analytics, Orphan Detector & Semantic Bridge Recommender

## 1. Trạng Thái (Status)
- **Trạng thái:** 🟢 PROPOSED & IN PROGRESS (Phase 10A: Core Graph Analytics & Semantic Bridge Engine; Phase 10B: GraphInsightsPanel & Interactive Quick-Connect in KnowledgeGraph)
- **Ngày quyết định:** 2026-10-26
- **Tác giả:** Staff Engineer & System Architect
- **Phạm vi:** Nâng cấp đồ thị tri thức (`KnowledgeGraph`) thành trung tâm phân tích cấu trúc mạng học thuật (Network Topology & Intelligence). Tính toán PageRank & Weighted Degree Centrality, phát hiện nút cô lập / đảo tri thức (`Orphan Topics`), phân cụm thành phần liên thông (`Connected Components`), và sử dụng công cụ nhúng ngữ nghĩa cục bộ 128-D (Phase 5 Vector Search Engine) để tự động phát hiện và gợi ý cầu nối liên ngành (`Semantic Bridge Recommendations`) giữa các chủ đề chưa có liên kết.

---

## 2. Bối Cảnh (Context)
Trong hệ thống quản trị tri thức học thuật Knowledge OS:
1. **Thiếu số liệu đo lường vị thế tri thức (Knowledge Topology Blindspot):** Người nghiên cứu xây dựng đồ thị với hàng chục chủ đề và hàng trăm ghi chú/tài nguyên, nhưng không thể định lượng được chủ đề nào là "trọng tâm tri thức" (Knowledge Hub) và chủ đề nào đang bị cô lập khỏi mạng lưới.
2. **Nguy cơ phân mảnh tri thức (Orphan Islands):** Khi thêm nhiều chủ đề mới hoặc nhập tài liệu từ Zotero/BibTeX, nhiều chủ đề bị "bỏ rơi" không có liên kết ngữ nghĩa với các chủ đề khác (`0 links`). Một số hoàn toàn trống rỗng (`completely-isolated`), một số chứa nhiều ghi chú quý giá nhưng không được kết nối vào mạng lưới tư duy (`unlinked-island`).
3. **Bỏ lỡ các mối liên hệ liên ngành tiềm năng (Cross-Domain Semantic Bridges):** Hai chủ đề thuộc hai lĩnh vực khác nhau (ví dụ: *Spaced Repetition* trong Tâm lý học và *Memory Consolidation* trong Khoa học thần kinh, hoặc *Quantum Entanglement* và *Bell Inequalities*) có độ tương đồng ngữ nghĩa rất cao nhưng học giả chưa kịp liên kết thủ công.
4. **Ràng buộc Zero-Database Migration & Zero-Default (`ADR-076` & `ADR-077`):** Toàn bộ phân tích đồ thị và suy luận cầu nối ngữ nghĩa phải thực thi hoàn toàn ở runtime bằng pure TypeScript functions, kết hợp với bộ vector embedding cục bộ hermetic từ Phase 5 (`computeLocalEmbedding` & `cosineSimilarity`), không dựa vào bất kỳ external API hay default data nào.

---

## 3. Các Quyết Định Kiến Trúc (Architectural Decisions)

### Quyết định 1: Thuật Toán PageRank & Độ Trung Tâm Có Trọng Số (Weighted Degree Centrality)
Hàm `computeGraphCentrality(graph, options)` tính toán các chỉ số mạng cho mọi node trong đồ thị:
- **Degree Centrality:**
  - `inDegree`: Số liên kết trỏ tới node ($|In(v)|$).
  - `outDegree`: Số liên kết từ node trỏ đi ($|Out(v)|$).
  - `totalDegree`: Tổng bậc liên kết ($inDegree + outDegree$).
  - `weightedDegree`: Tổng trọng số `strength` (1..5) của tất cả các cạnh kết nối với node.
- **Iterative PageRank ($d = 0.85$, $iterations = 25$):**
  - Xử lý các nút không có cạnh ra (dangling nodes) bằng cách phân phối lại đều cho toàn mạng.
  - Chuẩn hóa điểm số PageRank về thang đo phần trăm `[0, 100]`.
  - Sắp xếp kết quả giảm dần theo `pageRankScore`, với tie-breaker là `weightedDegree` giảm dần, tiếp theo là `nodeId`.

### Quyết định 2: Bộ Phát Hiện Nút Cô Lập & Phân Cụm Thành Phần Liên Thông (Orphan Detector & Topology)
Hàm `detectOrphanNodesAndClusters(graph, data)`:
- **Phát hiện chủ đề mồ côi (Orphan Topics):**
  - Quét các chủ đề có `0` liên kết ngữ nghĩa với chủ đề khác (`topic-to-topic semantic edges`).
  - Phân loại 2 mức độ nghiêm trọng:
    - `'completely-isolated'`: Chủ đề có 0 liên kết, 0 ghi chú, 0 tài nguyên.
    - `'unlinked-island'`: Chủ đề có ghi chú hoặc tài nguyên gắn liền, nhưng chưa được liên kết với bất kỳ chủ đề nào khác.
- **Phân cụm liên thông (Undirected Connected Components):**
  - Duyệt đồ thị vô hướng (BFS/DFS) để gom nhóm các chủ đề thành các cụm đảo độc lập `GraphClusterSummary[]`.
  - Xác định kích thước từng cụm, số lượng chủ đề và lĩnh vực thống trị (`dominantDomain`).
- **Mật độ mạng (Network Density):**
  - Tính theo công thức chuẩn lý thuyết đồ thị: $D = \frac{2|E|}{|V|(|V|-1)}$ đối với mạng có $|V| > 1$, hoặc `0` khi $|V| \le 1$.

### Quyết định 3: Gợi Ý Cầu Nối Ngữ Nghĩa Bằng Vector Cục Bộ (Vector-Driven Semantic Bridge Recommender)
Hàm `recommendSemanticBridges(topics, options)`:
- Lấy toàn bộ các cặp chủ đề $(A, B)$ **chưa có liên kết trực tiếp** trong `topic.links` (loại trừ các cặp đã có liên kết theo bất kỳ chiều nào).
- Xây dựng văn bản ngữ nghĩa phong phú cho từng chủ đề (kết hợp tiêu đề, mô tả, nội dung, tags, và snippet từ các ghi chú liên quan).
- Tạo vector nhúng 128 chiều bằng hàm thuần túy `computeLocalEmbedding(text, 128)` từ Phase 5.
- Tính khoảng cách ngữ nghĩa bằng hàm `cosineSimilarity(vecA, vecB)`.
- Nếu `similarity >= minSimilarity` (mặc định `0.28`) hoặc có chung các từ khóa/thuật ngữ học thuật đặc thù:
  - Sinh một `SemanticBridgeRecommendation`:
    - `similarityScore`: Làm tròn 3 chữ số thập phân.
    - `suggestedStrength`: Ánh xạ tương quan sang `1..5` ($\ge 0.75 \rightarrow 5$, $\ge 0.55 \rightarrow 4$, $\ge 0.40 \rightarrow 3$, còn lại $2$).
    - `suggestedLinkType`: Tự động nhận diện từ khóa chỉ báo để phân loại (`'contradicts'`, `'prerequisite'`, hoặc mặc định `'related'`).
    - `sharedTerms`: Danh sách các thuật ngữ học thuật dùng chung giữa 2 chủ đề.
    - `isCrossDomain`: Đánh dấu `true` khi $A$ và $B$ khác lĩnh vực (`categoryId` hoặc `type`), làm nổi bật các phát hiện liên ngành quý giá.
    - `reason`: Câu giải thích trực quan bằng tiếng Việt cho người dùng.

### Quyết định 4: Báo Cáo Tổng Hợp Thông Minh (Graph Intelligence Report)
Hàm `analyzeKnowledgeGraphIntelligence(data, options)`:
- Tổng hợp toàn bộ 3 phân hệ trên thành một báo cáo cấu trúc `GraphIntelligenceReport`:
  - `centralityRanking`: Danh sách xếp hạng đầy đủ tất cả các nút.
  - `topHubs`: Top các chủ đề trung tâm của đồ thị (Hub nodes).
  - `topology`: Báo cáo sức khỏe cấu trúc mạng (mật độ mạng, số cụm, danh sách chủ đề cô lập).
  - `bridgeRecommendations`: Danh sách gợi ý liên kết thông minh sắp xếp theo điểm tương đồng giảm dần.
- Đảm bảo an toàn tuyệt đối với đồ thị rỗng (`0` nút) hoặc đồ thị đơn lẻ (`1` nút), không bao giờ sinh lỗi `NaN` hoặc chia cho 0.

---

## 4. Hậu Quả & Đảm Bảo (Consequences & Invariants)
- **Zero-Default Universal Baseline (`ADR-076`):** Không chèn dữ liệu mẫu hay chủ đề mặc định; khi hệ thống có 0 chủ đề, engine trả về báo cáo rỗng an toàn.
- **Hermetic Test Guard (`ADR-077`):** Toàn bộ thuật toán là pure logic, hoàn toàn độc lập, không phát sinh HTTP request ra server.
- **Tương thích ngược hoàn toàn:** Tái sử dụng cấu trúc `KnowledgeGraphData` từ `knowledgeGraph.ts` và cơ chế nhúng từ `vectorSearchEngine.ts`.
