Feature: Daily Quests
  As a Pokemon trainer
  I want daily quests with streaks and rewards
  So that I have short-session goals and steady progression

  Background:
    Given the Pokemon app is running
    And I am a registered user

  # ═══════════════════════════════════════════
  # QUEST GENERATION + RESET
  # ═══════════════════════════════════════════

  Scenario: Daily quests are generated on first login of the day
    Given I have not logged in today
    When I open the app
    Then I should see a list of daily quests
    And each quest should have a description, progress, and reward
    And the quests should be tied to today's date

  Scenario: Daily quests reset at the start of a new day
    Given I completed some daily quests yesterday
    And a new day has started
    When I open the app
    Then I should see a fresh set of daily quests
    And yesterday's quest progress should be cleared

  # ═══════════════════════════════════════════
  # QUEST PROGRESS
  # ═══════════════════════════════════════════

  Scenario: Quest progress updates after battle wins
    Given I have a quest "Win 3 battles"
    And the quest progress is 1/3
    When I win a battle
    Then the quest progress should be 2/3
    And the UI should reflect the updated progress

  Scenario: Quest progress updates after catching Pokemon
    Given I have a quest "Catch 2 Pokemon"
    And the quest progress is 0/2
    When I catch a Pokemon
    Then the quest progress should be 1/2

  Scenario: Quest progress updates after using items
    Given I have a quest "Use 2 Potions"
    And the quest progress is 1/2
    When I use a Potion
    Then the quest progress should be 2/2
    And the quest should be marked complete

  # ═══════════════════════════════════════════
  # REWARDS + CLAIMING
  # ═══════════════════════════════════════════

  Scenario: Claiming a completed quest grants rewards
    Given I have a completed daily quest
    When I claim the quest reward
    Then I should receive the listed reward
    And the quest should be marked as claimed

  Scenario: Cannot claim an incomplete quest
    Given I have an incomplete daily quest
    When I try to claim the quest reward
    Then I should see an error "Quest not complete"
    And no rewards should be granted

  Scenario: Claim button is disabled after reward is claimed
    Given I have already claimed a quest reward
    When I view the daily quests list
    Then the claim button should be disabled
    And the quest should show a "Claimed" state

  # ═══════════════════════════════════════════
  # STREAKS
  # ═══════════════════════════════════════════

  Scenario: Completing all quests increments the daily streak
    Given I have completed all daily quests for today
    When the day ends
    Then my streak should increase by 1

  Scenario: Missing a day resets the streak
    Given my current streak is 4 days
    And I miss completing all quests today
    When I open the app tomorrow
    Then my streak should reset to 0

  Scenario: Streak milestone grants a bonus reward
    Given my current streak is 6 days
    And I complete all quests today
    When I claim my daily streak reward
    Then I should receive a bonus reward
    And my streak should be 7 days

  # ═══════════════════════════════════════════
  # UI/UX
  # ═══════════════════════════════════════════

  Scenario: Daily quests list shows progress and rewards
    Given I have daily quests available
    When I open the Daily Quests panel
    Then I should see each quest's progress (e.g., 1/3)
    And I should see each quest's reward

  Scenario: Completed quests are visually distinct
    Given I have completed a daily quest
    When I view the Daily Quests panel
    Then the completed quest should be highlighted
    And it should show a "Complete" badge
