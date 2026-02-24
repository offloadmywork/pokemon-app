# BDD Features for Pokemon App

This directory contains Behavior-Driven Development (BDD) feature files written in Gherkin syntax. These files document the expected behavior of the Pokemon app from a user's perspective.

## Structure

- **Feature files** (`.feature`): User stories and scenarios in Gherkin format
- **Test files**: Implementation lives in `src/**/*.test.{js,jsx}`

## Current Features

### ✅ Starter Pokemon (`starter-pokemon.feature`)
- Auto-claim for new players
- Team initialization with starters
- Graceful failure handling
- Test coverage: `src/pages/Collection.test.jsx`

## BDD Development Workflow

1. **Write the feature** - Define expected behavior in Gherkin
2. **Write failing tests** - Create test cases that match the scenarios
3. **Implement the feature** - Write code to make tests pass
4. **Refactor** - Clean up while keeping tests green

## Testing Approach

We use **Vitest** for testing, with tests written in a BDD style:

```javascript
describe('Feature: User Story', () => {
  describe('Scenario: Specific case', () => {
    it('should behave as expected', () => {
      // Given - Setup
      // When - Action
      // Then - Assertion
    });
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/pages/Collection.test.jsx
```

## Coverage Status

| Feature | Scenarios | Tests Passing | Implementation |
|---------|-----------|---------------|----------------|
| Starter Pokemon | 4 | ✅ 7/7 | ✅ Complete |

## Next Features to Add

- [ ] **Collection Management** - Pagination, filtering, search
- [ ] **Team Building** - Add/remove Pokemon, team limits, validation
- [ ] **Battles** - Wild encounters, battle flow, victory/defeat
- [ ] **Pokemon Evolution** - Level up, evolve, stat changes
- [ ] **Trading** - Player-to-player trades, trade validation

## Contributing

When adding new features:
1. Create a `.feature` file describing the user story
2. Add corresponding tests in the appropriate test file
3. Implement the feature to make tests pass
4. Update this README with the new feature status
