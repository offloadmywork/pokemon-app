// EvolutionViewModel - Business logic for Evolution options
// Testable without browser - pure state management

export class EvolutionViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.options = [];
    this.isLoading = true;
    this.error = null;
  }

  async loadOptions() {
    this.isLoading = true;
    this.error = null;

    try {
      const options = await this.api.getEvolutionOptions();
      this.options = options;
      return options;
    } catch (err) {
      this.options = [];
      this.error = err.message;
      console.error('Failed to load evolution options:', err);
      return [];
    } finally {
      this.isLoading = false;
    }
  }

  async evolve(caughtId) {
    try {
      const result = await this.api.evolvePokemon(caughtId);
      // Remove evolved entry from options list
      this.options = this.options.filter((option) => option.caught_id !== caughtId);
      return result;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to evolve pokemon:', err);
      return null;
    }
  }
}

export function createEvolutionViewModel(apiClient) {
  return new EvolutionViewModel(apiClient);
}
