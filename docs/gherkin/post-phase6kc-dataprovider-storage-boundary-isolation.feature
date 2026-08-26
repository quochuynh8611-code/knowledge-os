Feature: Phase 6k.c — DataProvider / App Storage Boundary Isolation
  As a user in a storage-restricted browser environment (private mode, extensions, ITP)
  I want the entire application to render fully including the Navbar
  So that I am never presented with a blank white screen

  Background:
    Given the application is loaded in a browser where localStorage may be restricted
    And the DataProvider wraps the entire application tree
    And no error boundary exists at the top level beyond React's default behavior

  # ---------------------------------------------------------------------------
  # A. SecurityError on localStorage.getItem during App initialization
  # ---------------------------------------------------------------------------
  Scenario: App renders fully when localStorage.getItem throws SecurityError
    Given "window.localStorage.getItem" throws a SecurityError on every call
    When the full App component is mounted including DataProvider and AppContent
    Then the DataProvider should render its children without throwing
    And the Navbar element should be present and visible in the DOM
    And the application should display the dashboard content
    And no white-screen (empty body) should occur

  # ---------------------------------------------------------------------------
  # B. QuotaExceededError on localStorage.setItem during persistence effect
  # ---------------------------------------------------------------------------
  Scenario: App renders and persists gracefully when localStorage.setItem throws QuotaExceededError
    Given "window.localStorage.setItem" throws a QuotaExceededError on every call
    When the full App component is mounted
    Then the DataProvider auto-sync useEffect should not crash the component tree
    And the Navbar element should still be present in the DOM after the persistence effect runs
    And a console.error should be logged (not a thrown exception)

  # ---------------------------------------------------------------------------
  # C. Malformed JSON in persisted localStorage data
  # ---------------------------------------------------------------------------
  Scenario: DataProvider falls back to seed data when stored JSON is malformed
    Given "window.localStorage.getItem" returns the string "NOT_VALID_JSON{{{" for any key
    When DataProvider mounts and its useState lazy initializers run
    Then JSON.parse should throw a SyntaxError
    And the try/catch in each useState initializer should catch it
    And the DataProvider should fall back to INITIAL seed data for all state slices
    And the App should render without throwing

  # ---------------------------------------------------------------------------
  # D. Navbar presence after full App mount in storage-restricted environment
  # ---------------------------------------------------------------------------
  Scenario: Navbar is visible after mounting the full App tree with storage restriction
    Given "window.localStorage.getItem" throws a SecurityError
    When the App (DataProvider + AppContent + Navbar) is fully mounted
    Then the Navbar top-level element should be present in the DOM
    And at least one navigation link or button should be visible in the Navbar
    And the active tab should default to "dashboard"

  # ---------------------------------------------------------------------------
  # E. Module-level dataRepository instantiation safety
  # ---------------------------------------------------------------------------
  Scenario: DataContext module imports without error when storage is restricted
    Given the test environment mocks localStorage.getItem to throw SecurityError
    When the DataContext module is imported (triggering module-level dataRepository construction)
    Then the module should not throw during import
    And the DataProvider function should be callable

  # ---------------------------------------------------------------------------
  # F. Result of test: if all pass, crash is NOT in DataProvider
  # ---------------------------------------------------------------------------
  Scenario: Crash not reproducible in jsdom — escalate to runtime instrumentation
    Given all scenarios A through E pass GREEN in Vitest jsdom
    When the full-app white screen is still reproduced in the real browser runtime
    Then the conclusion is that the crash originates outside the DataProvider layer
    And the next investigation step is a global error boundary at the App root level
    And window.onerror and window.onunhandledrejection instrumentation should be added
    And the browser DevTools console should be inspected for the actual error type and stack
