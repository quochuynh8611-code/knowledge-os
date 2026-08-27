Feature: Professionalization Architecture Contracts — State, Data Boundary & Server Modularity
  As a knowledge researcher and system architect
  I want clean boundaries between state management, persistence repositories, and modular API routers
  So that the application scales reliably, performs smoothly, and avoids data desynchronization

  Background:
    Given the storage key is "phat_hoc_huyen_hoc_clean_v3"
    And the application maintains dual-tier persistence (API with LocalStorage fallback)
    And the BackupSnapshotSchema preserves bit-for-bit checksum calculation

  # ─────────────────────────────────────────────
  # Contract 1: Timer Isolation & Non-Interference
  # ─────────────────────────────────────────────

  Scenario: Study timer tick does not mutate or trigger re-render on knowledge data
    Given the user is on the "topics" tab
    When the study timer ticks every 1 second in Stopwatch or Pomodoro mode
    Then the timer seconds increment correctly
    And the topics, notes, and categories state references remain referentially stable
    And components subscribed only to domain data do not re-render

  # ─────────────────────────────────────────────
  # Contract 2: Single Source of Truth for Persistence
  # ─────────────────────────────────────────────

  Scenario: Repository manages all LocalStorage writes consistently
    Given the DataContext receives a new Topic from user action
    When the topic is saved via the repository layer
    Then the root storage key "phat_hoc_huyen_hoc_clean_v3" is updated atomically
    And all corresponding entity sub-keys are updated synchronously by the repository
    And DataContext does not execute redundant raw localStorage calls

  Scenario: Offline fallback operates seamlessly when API server is disconnected
    Given the API server returns network error or 503
    When loadInitialData is called on ApiDataRepository
    Then it transparently falls back to LocalStorageDataRepository
    And the application in-memory state hydrates without data loss

  # ─────────────────────────────────────────────
  # Contract 3: Tag Normalization Dual-Write Parity
  # ─────────────────────────────────────────────

  Scenario: Topic update synchronizes both denormalized tags and TopicTag relations
    Given a Topic with tags ["Phật Học", "Vi Diệu Pháp"]
    When the topic is saved via the server topic route
    Then the Topic table stores ["Phật Học", "Vi Diệu Pháp"] in the tags array column
    And the TopicTag join table contains corresponding relation records with Tag entities
    And query by Tag returns the updated Topic consistently

  # ─────────────────────────────────────────────
  # Contract 4: Backup & Restore Transaction Boundary
  # ─────────────────────────────────────────────

  Scenario: Replace-restore executes atomically across all modular domain tables
    Given a valid BackupSnapshot JSON version 2.0.0
    When executeReplaceRestore is triggered on the server
    Then all existing records are deleted in reverse foreign-key order
    And new records are inserted in dependency order (Category -> Tag -> Topic -> Progress -> Links -> Notes -> Resources)
    And any failure in the transaction rolls back the database to the pre-restore state completely
