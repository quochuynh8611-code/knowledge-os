# Đặc Tả Kỹ Thuật Phase 10: Graph Intelligence — Centrality Analytics, Orphan Detector & Semantic Bridge Recommender

> **Tài liệu tham chiếu:** [`docs/adr/ADR-114-phase-10-graph-intelligence-and-semantic-bridge-recommender.md`](../adr/ADR-114-phase-10-graph-intelligence-and-semantic-bridge-recommender.md)<br>
> **Tác giả:** Staff Software Engineer / Technical Architect<br>
> **Trạng thái:** 🟢 READY FOR IMPLEMENTATION

---

## 1. Mục Tiêu & Phạm Vi (Goals & Scope)
Cung cấp công cụ phân tích đồ thị tri thức thông minh (Graph Intelligence Engine) cho Knowledge OS:
1. Tính toán bậc liên kết (In, Out, Total, Weighted Degree) và thuật toán lặp PageRank (25 vòng lặp, damping factor 0.85) để tìm ra các "Knowledge Hubs".
2. Phát hiện chủ đề mồ côi (`completely-isolated` vs `unlinked-island`), phân cụm thành phần liên thông (`Connected Components`) và đo lường mật độ mạng (`networkDensity`).
3. Sử dụng vector embedding 128 chiều cục bộ (Phase 5) để phát hiện và gợi ý các cầu nối ngữ nghĩa (`Semantic Bridge Recommendations`) giữa các chủ đề chưa liên kết, đặc biệt là cầu nối liên ngành (`isCrossDomain`).

---

## 2. Mô Hình Dữ Liệu TypeScript (Data Models)

```typescript
import type { Topic, Note, Resource, LinkType } from "../types";
import type { GraphNodeType, KnowledgeGraphData } from "./knowledgeGraph";

export interface GraphCentralityEntry {
  nodeId: string;
  title: string;
  type: GraphNodeType;
  domain: string;
  inDegree: number;
  outDegree: number;
  totalDegree: number;
  weightedDegree: number;
  pageRankScore: number;
}

export interface OrphanTopicReport {
  topicId: string;
  title: string;
  domain: string;
  status: 'completely-isolated' | 'unlinked-island';
  noteCount: number;
  resourceCount: number;
}

export interface GraphClusterSummary {
  clusterId: string;
  nodeIds: string[];
  topicCount: number;
  totalNodes: number;
  dominantDomain: string;
}

export interface TopologyHealthReport {
  totalNodes: number;
  totalEdges: number;
  networkDensity: number;
  clusterCount: number;
  clusters: GraphClusterSummary[];
  orphanTopics: OrphanTopicReport[];
}

export interface SemanticBridgeRecommendation {
  id: string;
  sourceTopicId: string;
  sourceTitle: string;
  targetTopicId: string;
  targetTitle: string;
  similarityScore: number;
  suggestedLinkType: LinkType;
  suggestedStrength: number;
  sharedTerms: string[];
  isCrossDomain: boolean;
  reason: string;
}

export interface GraphIntelligenceReport {
  centralityRanking: GraphCentralityEntry[];
  topHubs: GraphCentralityEntry[];
  topology: TopologyHealthReport;
  bridgeRecommendations: SemanticBridgeRecommendation[];
}
```

---

## 3. Thuật Toán Cốt Lõi (Core Algorithms)

### 3.1. Thuật toán `computeGraphCentrality`
1. Khởi tạo mảng node $V$ từ `graph.nodes`. Nếu $|V| = 0$, trả về `[]`.
2. Tính toán degree:
   - `inDegree`: `graph.reverseAdjacency.get(id)?.length || 0`.
   - `outDegree`: `graph.adjacency.get(id)?.length || 0`.
   - `totalDegree`: `inDegree + outDegree`.
   - `weightedDegree`: Tổng `strength` của mọi cạnh có nguồn hoặc đích là `id`.
3. PageRank lặp (Iterative PageRank):
   - $N = |V|$. Khởi tạo $PR(u) = 1 / N$.
   - Lặp $T = 25$ lần với $d = 0.85$:
     - Tính tổng dangling: $\sum_{u, out(u)=0} PR(u)$.
     - $PR_{new}(v) = \frac{1 - d}{N} + d \times \left( \frac{\text{danglingSum}}{N} + \sum_{u \in In(v)} \frac{PR(u)}{out(u)} \right)$.
   - Chuẩn hóa: Nhân $100$ và làm tròn 2 chữ số thập phân (hoặc scale về phần trăm).
4. Sắp xếp giảm dần theo `pageRankScore`, tie-breaker bằng `weightedDegree`, rồi theo `nodeId`.

### 3.2. Thuật toán `detectOrphanNodesAndClusters`
1. **Phát hiện chủ đề mồ côi:**
   - Thu thập tất cả cạnh ngữ nghĩa giữa chủ đề với chủ đề (`type !== 'has_note' && type !== 'has_resource'`).
   - Chủ đề nào không có bất kỳ cạnh ngữ nghĩa nào được đưa vào `orphanTopics`.
   - Nếu `noteCount === 0 && resourceCount === 0` $\rightarrow$ `'completely-isolated'`, ngược lại $\rightarrow$ `'unlinked-island'`.
2. **Phân cụm liên thông (Undirected Components):**
   - Xây dựng đồ thị vô hướng từ các cạnh giữa các chủ đề (hoặc toàn bộ các nút).
   - Duyệt BFS qua các nút chưa thăm để tạo từng thành phần liên thông `GraphClusterSummary`.
   - Tìm lĩnh vực chiếm ưu thế (`dominantDomain`) trong từng cụm.
3. **Mật độ mạng (`networkDensity`):**
   - $D = \frac{2 \times |E|}{|V|(|V| - 1)}$ nếu $|V| > 1$, ngược lại bằng `0`.

### 3.3. Thuật toán `recommendSemanticBridges`
1. Lập tập hợp các liên kết hiện hữu: cả 2 chiều `(source, target)` và `(target, source)`.
2. Với mỗi chủ đề $A$, tạo văn bản ngữ nghĩa và nhúng vector 128 chiều bằng `computeLocalEmbedding(richText, 128)`.
3. Với mọi cặp $(A, B)$ chưa liên kết:
   - Tính `similarity = cosineSimilarity(vecA, vecB)`.
   - Tìm các thuật ngữ chung (`sharedTerms`) giữa 2 chủ đề (độ dài $\ge 3$ ký tự).
   - Nếu `similarity >= minSimilarity` (mặc định $0.28$) hoặc có $\ge 1$ thuật ngữ học thuật chung:
     - Tạo `SemanticBridgeRecommendation`.
     - Phân loại `suggestedLinkType` ('contradicts' nếu có từ ngữ phản bác, 'prerequisite' nếu có từ khóa cơ sở, hoặc 'related').
     - Gán `suggestedStrength`: $\ge 0.75 \rightarrow 5$, $\ge 0.55 \rightarrow 4$, $\ge 0.40 \rightarrow 3$, còn lại $2$.
     - Đánh dấu `isCrossDomain = (topicA.categoryId !== topicB.categoryId) || (topicA.type !== topicB.type)`.
4. Sắp xếp giảm dần theo `similarityScore` và giới hạn tối đa `maxRecommendations`.
