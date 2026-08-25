Feature: Export and Backup Modal Storage Crash Resilience
  As a scholar using the application
  I want the Export and Backup modal to open reliably even when localStorage is blocked or throws errors
  So that the application never crashes into a white screen

  Scenario: Modal opens gracefully when localStorage.getItem throws SecurityError
    Given the browser blocks or restricts access to localStorage causing getItem to throw
    When the user opens the Export and Backup modal
    Then the modal renders successfully without white-screen crash
    And no uncaught exception escapes the render lifecycle
    And the library root path field gracefully falls back to an empty string

  Scenario: Editing library root path functions in-memory when localStorage.setItem throws
    Given the modal is open and localStorage.setItem throws QuotaExceededError or SecurityError
    When the user inputs a new canonical library root path
    Then the component state updates in-memory
    And the input field displays the new path
    And the application does not crash

  Scenario: Modal loads persisted library root path when localStorage operates normally
    Given localStorage contains a previously saved library root path "/Users/scholar/Library"
    When the user opens the Export and Backup modal
    Then the library root path input is populated with "/Users/scholar/Library"
