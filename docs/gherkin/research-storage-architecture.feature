Feature: Research Storage Architecture v1 — Additive Multi-Topic & Normalized Relations
  As a researcher
  I want to link notes to multiple topics, deduplicate sources, and capture study progress history
  So that my knowledge base reflects multi-dimensional relationships without breaking existing data

  Background:
    Given the existing system has Notes with a single topicId
    And Topic.tags is stored as String[] for backward compatibility
    And the localStorage key "phat_hoc_huyen_hoc_clean_v3" is preserved
    And the BackupSnapshotSchema remains at semver 2.x

  # ─────────────────────────────────────────────
  # Feature 1: Multi-Topic Note
  # ─────────────────────────────────────────────

  Scenario: resolveTopicIds returns topicIds when present
    Given a Note with topicId = "topic-A" and topicIds = ["topic-A", "topic-B"]
    When I call resolveTopicIds(note)
    Then the result is ["topic-A", "topic-B"]

  Scenario: resolveTopicIds falls back to [topicId] when topicIds is absent
    Given a Note with topicId = "topic-X" and no topicIds field
    When I call resolveTopicIds(note)
    Then the result is ["topic-X"]

  Scenario: resolveTopicIds falls back to [topicId] when topicIds is empty array
    Given a Note with topicId = "topic-X" and topicIds = []
    When I call resolveTopicIds(note)
    Then the result is ["topic-X"]

  Scenario: resolveTopicIds deduplicates when topicId is already in topicIds
    Given a Note with topicId = "topic-A" and topicIds = ["topic-A", "topic-A", "topic-B"]
    When I call resolveTopicIds(note)
    Then the result is ["topic-A", "topic-B"] with no duplicates

  Scenario: saveNote via adapter writes topicId = topicIds[0] for backward compat
    Given a Note with topicIds = ["topic-B", "topic-C"]
    When I call adapter.saveNote(note)
    Then the persisted note has topicId = "topic-B"
    And the base repository receives the note with the correct topicId

  # ─────────────────────────────────────────────
  # Feature 2: Source Registry
  # ─────────────────────────────────────────────

  Scenario: buildSourceRegistry deduplicates resources by title + url
    Given two Resources with identical title "Kinh Đại Niệm Xứ" and url "https://example.com/kinh"
    When I call buildSourceRegistry(resources)
    Then the registry has exactly 1 canonical entry
    And both resource ids are listed under that entry's resourceIds

  Scenario: buildSourceRegistry uses filePath as key when url is absent
    Given a Resource with filePath = "/docs/kinh-phap-cu.pdf" and no url
    When I call buildSourceRegistry([resource])
    Then the registry has 1 entry with canonicalKey derived from filePath
    And the entry has no url

  Scenario: buildSourceRegistry handles empty input
    Given an empty resources array
    When I call buildSourceRegistry([])
    Then the registry is empty with size 0

  # ─────────────────────────────────────────────
  # Feature 3: Normalized Topic Tags
  # ─────────────────────────────────────────────

  Scenario: normalizeTopicTags removes empty strings
    Given tags = ["Phật Học", "", "Dịch Học", "  "]
    When I call normalizeTopicTags(tags)
    Then the result is ["Phật Học", "Dịch Học"]

  Scenario: normalizeTopicTags deduplicates case-sensitively
    Given tags = ["Phật Học", "Phật Học", "phat-hoc"]
    When I call normalizeTopicTags(tags)
    Then the result is ["Phật Học", "phat-hoc"]

  Scenario: normalizeTopicTags trims whitespace
    Given tags = ["  Thiền Định  ", "Thiền Định"]
    When I call normalizeTopicTags(tags)
    Then the result is ["Thiền Định"]

  # ─────────────────────────────────────────────
  # Feature 4: Progress Snapshot
  # ─────────────────────────────────────────────

  Scenario: captureProgressSnapshot creates an immutable snapshot object
    Given a StudyProgress with progress = 75, status = "in_progress", easeFactor = 2.5
    When I call captureProgressSnapshot("topic-1", studyProgress)
    Then the snapshot has topicId = "topic-1"
    And snapshot.capturedAt is a valid ISO string
    And snapshot.progressData deep-equals the input StudyProgress
    And the original StudyProgress is not mutated

  Scenario: captureProgressSnapshot includes triggerReason when provided
    Given a StudyProgress object
    When I call captureProgressSnapshot("topic-1", studyProgress, "session_complete")
    Then snapshot.triggerReason = "session_complete"

  Scenario: multiple snapshots for the same topic are independent objects
    Given the same topicId called twice with different progress values
    When I call captureProgressSnapshot twice
    Then each returns a distinct snapshot with different id and capturedAt
    And both snapshots preserve their respective progressData independently
