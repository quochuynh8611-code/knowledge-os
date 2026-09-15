Feature: Commercial Reset Database
  As a product owner
  I want to reset all personal categories and seed commercial template
  So that the app is ready for commercial deployment

  Scenario: Backup before reset
    Given the database contains 22 categories, 41 topics, 12 notes
    When I run the backup script
    Then a JSON snapshot is created in backups/commercial-reset-{timestamp}/
    And a SQL dump is created in backups/commercial-reset-{timestamp}/
    And a manifest.json with SHA-256 checksums is created

  Scenario: Hard-delete all categories
    Given the backup is complete
    When I run the reset script with --confirm="XOA TOAN BO DATA CA NHAN"
    Then all 22 categories are deleted
    And all 41 topics are cascade deleted
    And all 12 notes are cascade deleted
    And all related records (resources, tags, progress, snapshots) are cascade deleted

  Scenario: Seed commercial template
    Given the database is empty after reset
    When the seed script runs
    Then 1 category "Đông Y" is created with slug "dong-y"
    And 1-2 flashcards are created for the category
    And 1 onboarding note is created

  Scenario: Post-execution verification
    Given the reset and seed are complete
    When I query the database
    Then categories count is 1
    And the category name is "Đông Y"
    And the category slug is "dong-y"
    And flashcards count is 1-2
    And notes count is 1 (onboarding note)
