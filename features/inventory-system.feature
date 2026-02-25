Feature: Items/Inventory System
  As a Pokemon trainer
  I want to manage items and use them during gameplay
  So that I can heal my Pokemon and improve catch rates

  Background:
    Given the Pokemon app is running
    And I am a registered user

  # ═══════════════════════════════════════════
  # ITEM TYPES
  # ═══════════════════════════════════════════

  Scenario: Potion heals 50 HP
    Given I have a Potion in my inventory
    And I have a Pokemon with 30/100 HP
    When I use the Potion on that Pokemon
    Then the Pokemon's HP should be 80/100
    And the Potion should be removed from my inventory

  Scenario: Super Potion heals 100 HP
    Given I have a Super Potion in my inventory
    And I have a Pokemon with 20/100 HP
    When I use the Super Potion on that Pokemon
    Then the Pokemon's HP should be 100/100
    And the Super Potion should be removed from my inventory

  Scenario: Potion does not exceed max HP
    Given I have a Potion in my inventory
    And I have a Pokemon with 80/100 HP
    When I use the Potion on that Pokemon
    Then the Pokemon's HP should be 100/100
    And no HP should be wasted beyond max

  Scenario: Revive brings fainted Pokemon to 50% HP
    Given I have a Revive in my inventory
    And I have a fainted Pokemon with 0/100 HP
    When I use the Revive on that Pokemon
    Then the Pokemon's HP should be 50/100
    And the Revive should be removed from my inventory

  Scenario: Revive cannot be used on non-fainted Pokemon
    Given I have a Revive in my inventory
    And I have a Pokemon with 50/100 HP
    When I try to use the Revive on that Pokemon
    Then I should see an error "Can only use on fainted Pokemon"
    And the Revive should remain in my inventory

  Scenario: Pokeball affects catch rate
    Given I have a Pokeball in my inventory
    And I am in a battle with a wild Pokemon
    When I use the Pokeball to catch
    Then the catch rate should use the Pokeball's catch multiplier
    And the Pokeball should be removed from my inventory

  Scenario: Great Ball improves catch rate
    Given I have a Great Ball in my inventory
    And I am in a battle with a wild Pokemon
    When I use the Great Ball to catch
    Then the catch rate should be 1.5x the base rate
    And the Great Ball should be removed from my inventory

  Scenario: Ultra Ball greatly improves catch rate
    Given I have an Ultra Ball in my inventory
    And I am in a battle with a wild Pokemon
    When I use the Ultra Ball to catch
    Then the catch rate should be 2x the base rate
    And the Ultra Ball should be removed from my inventory

  # ═══════════════════════════════════════════
  # INVENTORY MANAGEMENT
  # ═══════════════════════════════════════════

  Scenario: View inventory shows all items with counts
    Given I have 3 Potions and 2 Super Potions in my inventory
    When I view my inventory
    Then I should see "Potion x3"
    And I should see "Super Potion x2"

  Scenario: Load inventory from API
    Given I have items stored in the database
    When I load my inventory
    Then the items should be fetched from the API
    And my inventory should display the correct counts

  Scenario: Items persist across devices
    Given I use the app on Device A
    And I use 2 Potions
    When I open the app on Device B
    Then my inventory should show the updated item counts
    And cross-device sync should work via API

  Scenario: Cannot use item with zero quantity
    Given I have 0 Potions in my inventory
    When I try to use a Potion
    Then I should see an error "No Potions available"
    And the action should be blocked

  # ═══════════════════════════════════════════
  # BATTLE INTEGRATION
  # ═══════════════════════════════════════════

  Scenario: Use healing item during battle
    Given I am in a battle
    And my active Pokemon has 30/100 HP
    And I have a Potion in my inventory
    When I use the Potion during my turn
    Then my Pokemon's HP should increase by 50
    And the battle should continue with my turn ended

  Scenario: Item button disabled when no items
    Given I am in a battle
    And I have no usable items in my inventory
    When I view the battle actions
    Then the Items button should be disabled or hidden

  Scenario: Use Revive on fainted team member during battle
    Given I am in a battle
    And one of my team members is fainted
    And I have a Revive in my inventory
    When I use the Revive on the fainted Pokemon
    Then that Pokemon should have 50% HP
    And I can switch to that Pokemon in future turns

  # ═══════════════════════════════════════════
  # COLLECTION PAGE INTEGRATION
  # ═══════════════════════════════════════════

  Scenario: Heal Pokemon from Collection page
    Given I am on the Collection page
    And I have a Pokemon with 50/100 HP on my team
    And I have a Potion in my inventory
    When I select "Use Item" on that Pokemon
    And I choose to use a Potion
    Then the Pokemon's HP should increase by 50
    And I should see the updated HP in the UI

  Scenario: View inventory on Collection page
    Given I am on the Collection page
    When I open the inventory panel
    Then I should see all my items with counts
    And I should see item descriptions

  # ═══════════════════════════════════════════
  # ITEM DEFINITIONS
  # ═══════════════════════════════════════════

  Scenario Outline: Item properties are correctly defined
    Given the item system is initialized
    Then the item "<item_name>" should have:
      | property     | value              |
      | heal_amount  | <heal_amount>      |
      | catch_multiplier | <catch_mult>   |
      | can_revive  | <can_revive>       |
      | description | "<description>"    |

    Examples:
      | item_name    | heal_amount | catch_mult | can_revive | description                    |
      | Potion       | 50          | 1.0        | false      | Restores 50 HP                 |
      | Super Potion | 100         | 1.0        | false      | Restores 100 HP                |
      | Revive       | 0           | 1.0        | true       | Revives fainted Pokemon to 50% |
      | Pokeball     | 0           | 1.0        | false      | Standard catch rate            |
      | Great Ball   | 0           | 1.5        | false      | 1.5x catch rate                |
      | Ultra Ball   | 0           | 2.0        | false      | 2x catch rate                  |

  # Implementation Notes:
  # - Backend: Add user_items table to schema.sql
  # - API: GET/POST/DELETE /api/items endpoints
  # - ViewModel: InventoryViewModel.js (like CollectionViewModel)
  # - UI Integration: BattleScreen.jsx, Collection.jsx
  # - Tests: InventoryViewModel.test.js
