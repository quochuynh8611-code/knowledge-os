# Specification: Phase 5 — Local Knowledge Copilot, Vector Search & Grounded RAG Engine

## Feature: Local Semantic Vector Search, Hybrid Reciprocal Rank Fusion & Grounded Context Retrieval

  As an academic researcher or student using Knowledge OS
  I want to search across my workspace using semantic similarity and hybrid ranking
  And retrieve grounded context with citation markers for AI Copilot
  So that I can overcome vocabulary differences and generate research answers strictly based on verified evidence.

  Background:
    Given a research workspace with topics, notes, resources, flashcards, and excerpts
    And the vector search engine operates 100% locally with L2-normalized 128-dimensional embeddings
    And no database schema changes are required

  # ─── Scenario 1: Local Semantic Embedding & Cosine Similarity ──────────────
  Scenario: Computing local semantic embedding vector and cosine similarity
    Given an academic text "Cơ chế củng cố trí nhớ dài hạn và đường cong quên"
    When the text is embedded using computeLocalEmbedding with 128 dimensions
    Then the resulting vector should have length 128
    And the Euclidean L2 norm of the vector should be approximately 1.0
    And the cosine similarity of the vector with itself should equal 1.0
    And when comparing with "Memory retention and forgetting curve in spaced repetition"
    Then the similarity score should be significantly higher than an unrelated text "Phản ứng nhiệt nhôm trong luyện kim"

  # ─── Scenario 2: Keyword, Semantic, and Hybrid RRF Search Modes ────────────
  Scenario: Searching knowledge entities using Keyword, Semantic, and Hybrid RRF modes
    Given a knowledge base containing:
      | Entity Type | Title                             | Content                                                       |
      | note        | Spaced Repetition Principles      | Reviewing intervals based on memory stability and decay.      |
      | resource    | Tài liệu Thuật toán FSRS          | Mô hình ba thành phần DSR tối ưu hóa khoảng cách ôn tập.      |
      | flashcard   | Ebbinghaus Curve                  | Đường cong quên lãng mô tả tốc độ suy giảm thông tin.        |
    When searching for "ôn tập lặp lại ngắt quãng" in "keyword" mode
    Then only documents containing exact or stemmed keywords are returned
    When searching for "spaced memory consolidation" in "semantic" mode
    Then documents with similar academic semantics are discovered even without exact keyword matches
    When searching in "hybrid" mode
    Then the documents are ranked using Reciprocal Rank Fusion combining BM25 and Vector scores
    And each result item contains bm25Score, semanticScore, and rrfScore

  # ─── Scenario 3: Grounded Context Retrieval for AI Copilot (RAG) ───────────
  Scenario: Retrieving grounded context bundle for a research question
    Given the researcher asks "Làm thế nào để duy trì khả năng nhớ lâu?"
    When retrieveGroundedContextForQuery is executed with topK 5
    Then a GroundedRagContextBundle is returned
    And the bundle contains a list of chunks ranked by relevance
    And each chunk contains sourceId, sourceType, title, snippet, and citationMarker
    And citation markers are formatted sequentially as [^SRC-1], [^SRC-2], [^SRC-3]
    And the formattedPromptContext string is generated containing all grounded chunks
    And chunks with relevance below the minimum threshold are excluded
