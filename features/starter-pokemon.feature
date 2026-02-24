Feature: Starter Pokemon for New Players
  As a new player
  I want to receive starter Pokemon automatically
  So that I can start playing immediately

  Background:
    Given the Pokemon app is running
    And I have no Pokemon in my collection

  Scenario: New player auto-claims starter Pokemon
    Given I am a new player with no Pokemon
    When I visit the collection page
    Then the system should automatically claim 3 starter Pokemon for me
    And I should see 3 Pokemon in my collection
    And all 3 starters should be added to my team automatically
    And I should be able to start battling immediately

  Scenario: Existing player sees their collection
    Given I am a returning player with Pokemon
    When I visit the collection page
    Then I should see my existing Pokemon collection
    And the system should NOT auto-claim starters

  Scenario: Auto-claim fails gracefully
    Given I am a new player with no Pokemon
    And the starter claim API is unavailable
    When I visit the collection page
    Then I should see an empty collection
    And I should see a "Claim Your Starter Pokémon" button
    And I can manually claim starters when ready

  Scenario: Starters include variety of types
    Given I am a new player
    When I claim my starter Pokemon
    Then I should receive exactly 3 starters
    And they should be named "Flametail Jr", "Ripplefin", and "Leaflet"
    And they should have types Fire, Water, and Grass respectively
    And each should have a power level of 25

  # Implementation Notes:
  # - Auto-claim happens in Collection.jsx useEffect on mount
  # - Only triggers if caughtList.length === 0 and !hasAttemptedAutoClaim
  # - Starters are automatically added to team with 100 HP each
  # - API endpoint: POST /api/starters/claim
  # - Tests: src/pages/Collection.test.jsx lines 105-136
