# language: en
Feature: Phase P5.1 — Command Palette Caller Wiring and Deterministic Ordering
  As a knowledge researcher using the Knowledge OS application
  I want to open NotebookLM Studio and Antigravity Handoff directly from the Command Palette
  And I want search result categories to appear in a predictable, consistent order
  So that I can operate seamlessly across tools with clean visual ergonomics

  # ─────────────────────────────────────────────────────────────
  # Scenario 1: Launching NotebookLM Studio from Command Palette in App
  # ─────────────────────────────────────────────────────────────
  Scenario: User executes NotebookLM Studio action from Command Palette
    Given the application is loaded with Command Palette open
    When the user searches for "notebooklm" and executes "Mở NotebookLM Studio"
    Then the Command Palette closes
    And the NotebookLM Studio Modal is rendered and visible on screen

  # ─────────────────────────────────────────────────────────────
  # Scenario 2: Launching Antigravity Handoff from Command Palette in App
  # ─────────────────────────────────────────────────────────────
  Scenario: User executes Antigravity Handoff action from Command Palette
    Given the application is loaded with Command Palette open
    When the user searches for "antigravity" and executes "Chuẩn Bị Antigravity Handoff"
    Then the Command Palette closes
    And the Antigravity Handoff Modal is rendered and visible on screen

  # ─────────────────────────────────────────────────────────────
  # Scenario 3: Triggering modals from Navbar buttons remains functional
  # ─────────────────────────────────────────────────────────────
  Scenario: Clicking Navbar buttons opens corresponding modals
    Given the user is viewing the Top Navigation bar
    When the user clicks the "NotebookLM" button in Navbar
    Then the NotebookLM Studio Modal is opened
    When the user closes the modal and clicks the "Handoff" button in Navbar
    Then the Antigravity Handoff Modal is opened

  # ─────────────────────────────────────────────────────────────
  # Scenario 4: Search results display categories in deterministic order
  # ─────────────────────────────────────────────────────────────
  Scenario: Categories in Command Palette always follow fixed priority order
    Given the Command Palette contains results across multiple categories
    When the search query matches items in "Điều hướng", "Hành động nhanh", and "Chủ đề"
    Then the categories are displayed in the exact order:
      | category       |
      | Hành động nhanh|
      | Điều hướng     |
      | Chủ đề         |
