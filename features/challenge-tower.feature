Feature: Challenge Tower
  As a Pokemon trainer
  I want a multi-floor challenge tower with escalating battles
  So that I can test my team and earn meaningful progression rewards

  Background:
    Given the Pokemon app is running
    And I am a registered user

  # ═══════════════════════════════════════════
  # UNLOCKS + ENTRY
  # ═══════════════════════════════════════════

  Scenario: Challenge Tower unlocks at higher progression
    Given my trainer level is below the tower requirement
    When I open the Challenge Tower
    Then I should see the tower locked with the unlock requirement

  Scenario: Entering the tower requires a minimum team power
    Given the Challenge Tower is unlocked
    And my team power is below the floor requirement
    When I try to start a tower run
    Then I should see a message "Team power too low"
    And I should not enter the tower

  Scenario: Starting a tower run initializes floor 1
    Given the Challenge Tower is unlocked
    And my team power meets the floor requirement
    When I start a tower run
    Then I should enter floor 1
    And I should see the floor rewards preview

  # ═══════════════════════════════════════════
  # PROGRESSION + BATTLES
  # ═══════════════════════════════════════════

  Scenario: Winning a floor advances to the next floor
    Given I am on floor 3 of the Challenge Tower
    When I win the floor battle
    Then I should advance to floor 4
    And my progress should be saved

  Scenario: Losing a floor ends the tower run
    Given I am on floor 5 of the Challenge Tower
    When I lose the floor battle
    Then my tower run should end
    And I should see a summary of floors cleared

  Scenario: Boss floors are harder and grant bonus rewards
    Given I am on a boss floor
    When I win the floor battle
    Then I should receive bonus rewards
    And the UI should highlight the boss clear

  # ═══════════════════════════════════════════
  # REWARDS + CHECKPOINTS
  # ═══════════════════════════════════════════

  Scenario: Clearing a checkpoint grants a guaranteed reward
    Given I am on a checkpoint floor
    When I win the floor battle
    Then I should receive the checkpoint reward
    And the reward should be added to my inventory

  Scenario: First-time clears grant a one-time bonus
    Given I have never cleared floor 10 before
    When I clear floor 10
    Then I should receive a first-clear bonus reward
    And the bonus should not be available on repeat clears

  # ═══════════════════════════════════════════
  # RESET + REPLAY
  # ═══════════════════════════════════════════

  Scenario: Tower progress resets on a weekly cycle
    Given I cleared up to floor 12 this week
    And the weekly reset has occurred
    When I open the Challenge Tower
    Then my progress should be reset to floor 1
    And I should see the new weekly reward track

  # ═══════════════════════════════════════════
  # UI/UX
  # ═══════════════════════════════════════════

  Scenario: Tower screen shows current floor, rewards, and difficulty
    Given I am viewing the Challenge Tower
    Then I should see my current floor
    And I should see the upcoming rewards
    And I should see the difficulty indicator
