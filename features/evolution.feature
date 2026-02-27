Feature: Pokemon Evolution
  As a trainer
  I want to evolve my Pokemon
  So that my team grows stronger

  Background:
    Given a trainer account exists
    And evolution rules are configured

  Scenario: View available evolutions
    When I request my evolution options
    Then I see each caught Pokemon with its evolution target
    And I can see if I meet the trainer level requirement

  Scenario: Evolve an eligible Pokemon
    Given my trainer level meets the requirement
    When I evolve a caught Pokemon
    Then the caught Pokemon updates to the evolved form
    And my team data reflects the evolved stats

  Scenario: Block evolution when underleveled
    Given my trainer level is below the requirement
    When I attempt to evolve a Pokemon
    Then I receive an error explaining the required level
