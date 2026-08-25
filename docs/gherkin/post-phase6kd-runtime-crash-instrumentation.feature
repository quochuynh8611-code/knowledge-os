Feature: Phase 6k.d — Runtime Crash Instrumentation for Full-App White Screen
  As a developer diagnosing a full-app white screen in the real browser
  I want runtime crash instrumentation (Error Boundary + global listeners)
  So that I can capture the actual error type, message, and component stack

  Background:
    Given the application has no existing Error Boundary at the root level
    Given global window.onerror and window.onunhandledrejection are not yet registered
    Given the full-app white screen reproduces in runtime but not in Vitest jsdom

  # ---------------------------------------------------------------------------
  # A. Error Boundary: render fallback when child throws
  # ---------------------------------------------------------------------------
  Scenario: AppErrorBoundary renders fallback UI when a child component throws during render
    Given an AppErrorBoundary wraps a child component that throws on render
    When the child component throws an Error with message "Test crash"
    Then the AppErrorBoundary should catch the error via componentDidCatch
    And the fallback UI should be rendered instead of the crashed child
    And the fallback UI should contain visible text indicating an error occurred
    And the fallback UI should contain a "Tải lại trang" reload button

  Scenario: AppErrorBoundary logs [RUNTIME-CRASH] prefix to console.error
    Given an AppErrorBoundary wraps a child that throws
    When the child throws during render
    Then console.error should be called with a message starting with "[RUNTIME-CRASH]"
    And the log should include error.message
    And the log should include info.componentStack

  # ---------------------------------------------------------------------------
  # B. Error Boundary: transparent on normal render
  # ---------------------------------------------------------------------------
  Scenario: AppErrorBoundary is transparent when children render normally
    Given an AppErrorBoundary wraps a healthy child component
    When the child renders without throwing
    Then the child's content should be visible in the DOM
    And no fallback UI should be present
    And console.error should not be called with [RUNTIME-CRASH]

  # ---------------------------------------------------------------------------
  # C. Global listeners registered
  # ---------------------------------------------------------------------------
  Scenario: Global error listener is registered on window after app initialization
    Given the application's main.tsx entry point has been executed
    When a synthetic error event is dispatched on window
    Then a handler for 'error' events should be registered on window

  Scenario: Global unhandledrejection listener is registered on window
    Given the application's main.tsx entry point has been executed
    When a synthetic unhandledrejection event is dispatched on window
    Then a handler for 'unhandledrejection' events should be registered on window

  # ---------------------------------------------------------------------------
  # D. App-level integration: crash shows fallback, not white screen
  # ---------------------------------------------------------------------------
  Scenario: Full App shows crash fallback instead of white screen when a component throws
    Given the full App (AppErrorBoundary + DataProvider + AppContent) is mounted
    When a child component inside AppContent throws an uncaught error
    Then the page should not be blank
    And the fallback UI element should be visible in the DOM
    And the Reload button should be interactive

  # ---------------------------------------------------------------------------
  # E. Componentstack capture for source attribution
  # ---------------------------------------------------------------------------
  Scenario: Error Boundary captures componentStack for source attribution
    Given an AppErrorBoundary wraps a deeply nested component that throws
    When that component throws during render
    Then componentDidCatch should receive React.ErrorInfo with a non-empty componentStack
    And the componentStack should be logged via console.error

  # ---------------------------------------------------------------------------
  # F. Rollback: instrumentation can be removed without breaking app
  # ---------------------------------------------------------------------------
  Scenario: App renders normally after AppErrorBoundary is removed (rollback simulation)
    Given AppErrorBoundary is removed from App.tsx wrapper
    And global listeners are removed from main.tsx
    When the App is mounted directly (DataProvider wrapping AppContent)
    Then the app should render without crashing (pre-instrumentation behavior preserved)
