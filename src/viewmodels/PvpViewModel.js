// PvpViewModel - Business logic for PvP queue and match result state
// Testable without browser - pure state management

export class PvpViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.status = 'idle';
    this.queueResult = null;
    this.opponent = null;
    this.lastMatch = null;
    this.matchHistory = [];
    this.wallet = null;
    this.isLoading = false;
    this.error = null;
  }

  get matchSummary() {
    const summary = this.matchHistory.reduce((totals, match) => {
      if (match.outcome === 'win') totals.wins += 1;
      if (match.outcome === 'loss') totals.losses += 1;
      if (match.outcome === 'draw') totals.draws += 1;
      return totals;
    }, {
      wins: 0,
      losses: 0,
      draws: 0,
    });

    const total = summary.wins + summary.losses + summary.draws;
    return {
      ...summary,
      total,
      label: `${summary.wins}W / ${summary.losses}L / ${summary.draws}D`,
    };
  }

  async joinQueue(team = []) {
    this.isLoading = true;
    this.error = null;

    try {
      const result = await this.api.joinPvpQueue(team);
      this.queueResult = result;
      this.opponent = result?.opponent || null;
      this.status = result?.matched ? 'matched' : result?.queued ? 'queued' : 'idle';
      return result;
    } catch (err) {
      this.error = err.message;
      this.status = 'idle';
      console.error('Failed to join PvP queue:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async leaveQueue() {
    this.isLoading = true;
    this.error = null;

    try {
      const result = await this.api.leavePvpQueue();
      this._resetQueueState();
      return result;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to leave PvP queue:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async submitMatchResult(matchResult) {
    this.isLoading = true;
    this.error = null;

    try {
      const result = await this.api.submitPvpMatchResult(matchResult);
      const savedMatch = normalizeMatchResultResponse(result);
      this.lastMatch = savedMatch;
      this.wallet = savedMatch?.wallet || this.wallet;
      this.queueResult = null;
      this.opponent = null;
      this.status = 'complete';
      return savedMatch;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to submit PvP match result:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async loadMatchHistory(limit = 5) {
    this.isLoading = true;
    this.error = null;

    try {
      const result = await this.api.getPvpMatchHistory(limit);
      const matches = Array.isArray(result) ? result : result?.matches || [];
      this.matchHistory = matches;
      return matches;
    } catch (err) {
      this.error = err.message;
      this.matchHistory = [];
      console.error('Failed to load PvP match history:', err);
      return [];
    } finally {
      this.isLoading = false;
    }
  }

  async loadWallet() {
    this.isLoading = true;
    this.error = null;

    try {
      const wallet = await this.api.getWallet();
      this.wallet = wallet || null;
      return this.wallet;
    } catch (err) {
      this.error = err.message;
      this.wallet = null;
      console.error('Failed to load PvP wallet:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  _resetQueueState() {
    this.status = 'idle';
    this.queueResult = null;
    this.opponent = null;
  }
}

export function createPvpViewModel(apiClient) {
  return new PvpViewModel(apiClient);
}

function normalizeMatchResultResponse(result) {
  if (result?.match) {
    return {
      ...result.match,
      ...(result.rewards ? { rewards: result.rewards } : {}),
      ...(result.wallet ? { wallet: result.wallet } : {}),
    };
  }

  return result;
}
