Feature: Team Management
  As a player
  I want to build and manage my Pokemon team
  So that I can battle with my favorite Pokemon

  Background:
    Given I have caught multiple Pokemon
    And I am viewing my collection

  Scenario: Add Pokemon to team
    Given my team has fewer than 3 Pokemon
    When I add a Pokemon to my team
    Then the Pokemon should appear in my team
    And it should have full HP (100/100)
    And the team should be persisted to the server

  Scenario: Team size limit enforced
    Given my team already has 3 Pokemon
    When I try to add another Pokemon
    Then I should see an error message "Team is full! (max 3)"
    And my team should remain at 3 Pokemon
    And the new Pokemon should not be added

  Scenario: Cannot add duplicate Pokemon
    Given I have a Pokemon named "Pikachu" on my team
    When I try to add the same Pikachu again
    Then I should see an error message about duplicates
    And my team should not have duplicate entries

  Scenario: Remove Pokemon from team
    Given I have a Pokemon on my team
    When I remove that Pokemon from my team
    Then the Pokemon should no longer appear in my team
    And the team should be persisted to the server
    And I should have space for another team member

  Scenario: Check if Pokemon is on team
    Given I have a Pokemon named "Charmander" on my team
    When I view another Pokemon in my collection
    Then I should see if that Pokemon is already on my team
    And the UI should indicate which Pokemon are active team members

  Scenario: Heal team members
    Given I have a team with Pokemon that have taken damage
    When I heal my team
    Then all team members should be restored to full HP
    And the healed team should be persisted to the server

  Scenario: Release Pokemon removes from team
    Given I have a Pokemon named "Bulbasaur" on my team
    When I release that Pokemon from my collection
    Then Bulbasaur should be removed from my team
    And Bulbasaur should be removed from my collection
    And I should have an empty team slot

  Scenario: Team persists across sessions
    Given I have built a team of 3 Pokemon
    When I close and reopen the app
    Then I should see the same team members
    And their HP should be preserved
    And I can immediately start battling

  # Implementation Notes:
  # - Team management logic: src/viewmodels/CollectionViewModel.js
  # - Team state module: src/game/team.js
  # - API integration: pokemonAPI.setTeam(), pokemonAPI.getTeam(), pokemonAPI.healTeam()
  # - Max team size: 3 Pokemon (MAX_TEAM_SIZE constant)
  # - Each team member has: pokemon_id, name, type, power_level, currentHP, maxHP
  # - Tests: src/viewmodels/CollectionViewModel.test.js (Team Management section)
