Feature: Server Port Configuration & Validation
  As a developer or system operator
  I want to configure the server listening port via the PORT environment variable
  So that I can run the application on custom ports when port 3000 is occupied without port collision

  Background:
    Given default server host is "0.0.0.0"
    And default fallback port is 3000

  Scenario: Default port when PORT environment variable is not provided
    When process.env.PORT is undefined or empty
    Then the resolved port must be 3000
    And the server binds to "0.0.0.0:3000"

  Scenario: Default port when PORT environment variable is only whitespace
    When process.env.PORT is "   "
    Then the resolved port must be 3000

  Scenario: Custom valid port configuration via PORT environment variable
    When process.env.PORT is set to "3001"
    Then the resolved port must be 3001
    And the server binds to "0.0.0.0:3001"

  Scenario: Custom valid port configuration with trimmed whitespace
    When process.env.PORT is set to " 3001 "
    Then the resolved port must be 3001

  Scenario Outline: Valid boundary port numbers
    When process.env.PORT is set to "<valid_port>"
    Then the resolved port must be <expected_port>

    Examples:
      | valid_port | expected_port |
      | 1          | 1             |
      | 80         | 80            |
      | 3000       | 3000          |
      | 8080       | 8080          |
      | 65535      | 65535         |

  Scenario Outline: Invalid PORT environment variable values are rejected with explicit error
    When process.env.PORT is set to "<invalid_port>"
    Then resolving port must throw an Error matching "Invalid PORT"
    And the server must not start with an ambiguous fallback

    Examples:
      | invalid_port |
      | 0            |
      | -1           |
      | 65536        |
      | 70000        |
      | abc          |
      | 3000abc      |
      | 3000.5       |
      | NaN          |

  Scenario: Server routes and health check preservation on custom port
    When the server is running with health router on a custom valid port "3001"
    Then GET request to "/api/health" on port 3001 returns HTTP 200 with status "ok"
    And host binding remains "0.0.0.0"
