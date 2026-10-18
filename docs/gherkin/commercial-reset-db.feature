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

  Scenario: Seed clean commercial template
    Given the database is empty after reset
    When the seed script runs
    Then 0 default specialized categories are seeded
    And 0 default specialized topics are seeded
    And the application database is in a clean, ready-to-customize state for the new user

  Scenario: Post-execution verification
    Given the reset and clean seed are complete
    When I query the database
    Then categories count is 0
    And topics count is 0
    And the user is empowered to create their own first domain via the UI
