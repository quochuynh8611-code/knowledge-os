Feature: Phase R3d-B Persistent EPUB Highlight Layer
  As an academic researcher reading EPUB resources
  I want previously saved excerpts to be restored as visual inline highlights
  And I want clicking a highlight to activate the excerpt in ReaderSidebar
  So that my research reading flow is seamless, resilient, and non-destructive.

  Background:
    Given an EPUB document "clean-architecture.epub" with documentId "doc-epub-001"
    And the EpubReaderAdapter has mounted and received the epubjs rendition instance

  Scenario: Restore valid EPUB persistent highlights on document open
    Given the document has saved excerpts:
      | id          | selectedText                     | cfi                                            | highlightColor |
      | exc-epub-1  | Dependency Inversion Principle   | epubcfi(/6/4[chap01]!/4/2/10,/1:0,/1:30)       | #fef08a        |
      | exc-epub-2  | Single Responsibility Principle  | epubcfi(/6/6[chap02]!/4/2/20,/1:0,/1:32)       | #bbf7d0        |
    When the reader adapter initializes with these excerpts
    Then rendition.annotations.highlight is invoked for "epubcfi(/6/4[chap01]!/4/2/10,/1:0,/1:30)" with color "#fef08a"
    And rendition.annotations.highlight is invoked for "epubcfi(/6/6[chap02]!/4/2/20,/1:0,/1:32)" with color "#bbf7d0"

  Scenario: Clicking an EPUB highlight activates the excerpt in ReaderSidebar
    Given a highlight for excerpt "exc-epub-1" is rendered on the screen
    When the user clicks the highlight mark
    Then onSelectExcerpt is called with excerpt "exc-epub-1"
    And the ReaderSidebar marks "exc-epub-1" as active

  Scenario: Recolor an existing EPUB highlight when excerpt color is updated
    Given an excerpt "exc-epub-1" with cfi "epubcfi(/6/4[chap01]!/4/2/10,/1:0,/1:30)" has color "#fef08a"
    When the excerpts prop is updated with color "#fbcfe8" for "exc-epub-1"
    Then the previous highlight for "epubcfi(/6/4[chap01]!/4/2/10,/1:0,/1:30)" is removed or updated
    And a new highlight is created with color "#fbcfe8"

  Scenario: Remove EPUB highlight when excerpt is deleted
    Given an active highlight for "exc-epub-1" with cfi "epubcfi(/6/4[chap01]!/4/2/10,/1:0,/1:30)"
    When the excerpts prop updates and "exc-epub-1" is no longer present
    Then rendition.annotations.remove is invoked for "epubcfi(/6/4[chap01]!/4/2/10,/1:0,/1:30)" with type "highlight"

  Scenario: Fail-closed on stale or corrupted CFI without crashing reader
    Given an excerpt "exc-stale" with malformed CFI "epubcfi(/999/invalid!)"
    When the adapter attempts to register the highlight
    And rendition.annotations.highlight throws an error or fails to find a DOM range
    Then the error is caught safely without unhandled runtime exception
    And the reader continues operating normally
    And the excerpt remains accessible in the ReaderSidebar

  Scenario: Legacy excerpts without CFI do not attempt inline highlight
    Given a legacy excerpt "exc-legacy" with only headingId "intro" and no cfi
    When the adapter processes the excerpts list
    Then rendition.annotations.highlight is not called for "exc-legacy"
    And the excerpt remains visible and selectable in the ReaderSidebar

  Scenario: Clean up all annotations and listeners on component unmount
    Given active highlights rendered in the adapter
    When the EpubReaderAdapter component unmounts
    Then all registered annotations are detached or removed safely
    And no detached DOM nodes or memory leaks persist
