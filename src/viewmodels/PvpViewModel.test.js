import { describe, expect, it, beforeEach, vi } from 'vitest';
import { PvpViewModel, createPvpViewModel } from './PvpViewModel';

const createMockApi = () => ({
  joinPvpQueue: vi.fn(),
  leavePvpQueue: vi.fn(),
  submitPvpMatchResult: vi.fn(),
  getPvpMatchHistory: vi.fn(),
  getWallet: vi.fn(),
});

const createTeam = () => [
  { pokemon_id: 'p1', power_level: 50, currentHP: 30 },
  { pokemon_id: 'p2', power_level: 25, currentHP: 0 },
];

describe('PvpViewModel', () => {
  let api;
  let vm;

  beforeEach(() => {
    api = createMockApi();
    vm = createPvpViewModel(api);
  });

  it('starts idle with no active match', () => {
    expect(vm.status).toBe('idle');
    expect(vm.queueResult).toBe(null);
    expect(vm.opponent).toBe(null);
    expect(vm.lastMatch).toBe(null);
    expect(vm.matchHistory).toEqual([]);
    expect(vm.wallet).toBe(null);
    expect(vm.isLoading).toBe(false);
    expect(vm.error).toBe(null);
  });

  it('loads the current PvP wallet balance', async () => {
    api.getWallet.mockResolvedValue({ user_id: 'user-1', coins: 75, shards: 0 });

    const result = await vm.loadWallet();

    expect(api.getWallet).toHaveBeenCalled();
    expect(result).toEqual({ user_id: 'user-1', coins: 75, shards: 0 });
    expect(vm.wallet).toEqual(result);
    expect(vm.isLoading).toBe(false);
  });

  it('enters the queue when no fair opponent is available yet', async () => {
    api.joinPvpQueue.mockResolvedValue({
      queued: true,
      matched: false,
      team_power: 50,
    });

    const result = await vm.joinQueue(createTeam());

    expect(api.joinPvpQueue).toHaveBeenCalledWith(createTeam());
    expect(result.queued).toBe(true);
    expect(vm.status).toBe('queued');
    expect(vm.queueResult).toEqual(result);
    expect(vm.opponent).toBe(null);
    expect(vm.isLoading).toBe(false);
  });

  it('stores the opponent when matchmaking returns a match', async () => {
    const opponent = { user_id: 'opponent-1', team_power: 55 };
    api.joinPvpQueue.mockResolvedValue({
      queued: false,
      matched: true,
      opponent,
    });

    await vm.joinQueue(createTeam());

    expect(vm.status).toBe('matched');
    expect(vm.opponent).toEqual(opponent);
    expect(vm.queueResult.matched).toBe(true);
  });

  it('leaves the queue and returns to idle', async () => {
    vm.status = 'queued';
    vm.queueResult = { queued: true };
    api.leavePvpQueue.mockResolvedValue({ left: true });

    const result = await vm.leaveQueue();

    expect(api.leavePvpQueue).toHaveBeenCalled();
    expect(result).toEqual({ left: true });
    expect(vm.status).toBe('idle');
    expect(vm.queueResult).toBe(null);
    expect(vm.opponent).toBe(null);
  });

  it('submits a completed PvP match result and stores the response', async () => {
    const matchResult = {
      opponent_user_id: 'opponent-1',
      player_team: [{ pokemon_id: 'p1', currentHP: 20 }],
      opponent_team: [{ pokemon_id: 'o1', currentHP: 0 }],
    };
    const savedMatch = {
      id: 7,
      outcome: 'win',
      winner_user_id: 'player-1',
      loser_user_id: 'opponent-1',
    };
    api.submitPvpMatchResult.mockResolvedValue(savedMatch);

    const result = await vm.submitMatchResult(matchResult);

    expect(api.submitPvpMatchResult).toHaveBeenCalledWith(matchResult);
    expect(result).toEqual(savedMatch);
    expect(vm.lastMatch).toEqual(savedMatch);
    expect(vm.status).toBe('complete');
  });

  it('normalizes worker-shaped PvP match result responses', async () => {
    const matchResult = {
      opponent_user_id: 'opponent-1',
      player_team: [{ pokemon_id: 'p1', currentHP: 20 }],
      opponent_team: [{ pokemon_id: 'o1', currentHP: 0 }],
    };
    const savedMatch = {
      id: 'match-1',
      outcome: 'win',
      winner_user_id: 'player-1',
    };
    api.submitPvpMatchResult.mockResolvedValue({ match: savedMatch });

    const result = await vm.submitMatchResult(matchResult);

    expect(result).toEqual(savedMatch);
    expect(vm.lastMatch).toEqual(savedMatch);
    expect(vm.status).toBe('complete');
  });

  it('preserves PvP rewards from worker-shaped match responses', async () => {
    const savedMatch = {
      id: 'match-1',
      outcome: 'win',
      winner_user_id: 'player-1',
    };
    api.submitPvpMatchResult.mockResolvedValue({
      match: savedMatch,
      rewards: { xp: 50, coins: 20 },
    });

    const result = await vm.submitMatchResult({
      opponent_user_id: 'opponent-1',
      player_team: [{ pokemon_id: 'p1', currentHP: 20 }],
      opponent_team: [{ pokemon_id: 'o1', currentHP: 0 }],
    });

    expect(result).toEqual({
      ...savedMatch,
      rewards: { xp: 50, coins: 20 },
    });
    expect(vm.lastMatch).toEqual(result);
  });

  it('preserves the updated wallet from worker-shaped match responses', async () => {
    const savedMatch = {
      id: 'match-1',
      outcome: 'win',
      winner_user_id: 'player-1',
    };
    api.submitPvpMatchResult.mockResolvedValue({
      match: savedMatch,
      rewards: { xp: 50, coins: 20 },
      wallet: { coins: 50, shards: 0 },
    });

    const result = await vm.submitMatchResult({
      opponent_user_id: 'opponent-1',
      player_team: [{ pokemon_id: 'p1', currentHP: 20 }],
      opponent_team: [{ pokemon_id: 'o1', currentHP: 0 }],
    });

    expect(result).toEqual({
      ...savedMatch,
      rewards: { xp: 50, coins: 20 },
      wallet: { coins: 50, shards: 0 },
    });
    expect(vm.lastMatch).toEqual(result);
  });

  it('clears active queue and opponent context after recording a match', async () => {
    vm.status = 'matched';
    vm.queueResult = { matched: true };
    vm.opponent = { user_id: 'opponent-1', team_power: 52 };
    api.submitPvpMatchResult.mockResolvedValue({ id: 'match-1', outcome: 'win' });

    await vm.submitMatchResult({
      opponent_user_id: 'opponent-1',
      player_team: [{ pokemon_id: 'p1', currentHP: 20 }],
      opponent_team: [{ pokemon_id: 'o1', currentHP: 0 }],
    });

    expect(vm.status).toBe('complete');
    expect(vm.queueResult).toBe(null);
    expect(vm.opponent).toBe(null);
  });

  it('sets an error when joining the queue fails', async () => {
    api.joinPvpQueue.mockRejectedValue(new Error('No living Pokemon'));

    const result = await vm.joinQueue(createTeam());

    expect(result).toBe(null);
    expect(vm.status).toBe('idle');
    expect(vm.error).toBe('No living Pokemon');
    expect(vm.isLoading).toBe(false);
  });

  it('sets an error when submitting match results fails', async () => {
    api.submitPvpMatchResult.mockRejectedValue(new Error('Battle still in progress'));

    const result = await vm.submitMatchResult({
      opponent_user_id: 'opponent-1',
      player_team: [{ pokemon_id: 'p1', currentHP: 1 }],
      opponent_team: [{ pokemon_id: 'o1', currentHP: 1 }],
    });

    expect(result).toBe(null);
    expect(vm.lastMatch).toBe(null);
    expect(vm.error).toBe('Battle still in progress');
  });

  it('loads recent PvP match history', async () => {
    const matches = [
      { id: 'match-1', outcome: 'win', opponent_user_id: 'opponent-1' },
      { id: 'match-2', outcome: 'loss', opponent_user_id: 'opponent-2' },
    ];
    api.getPvpMatchHistory.mockResolvedValue({ matches });

    const result = await vm.loadMatchHistory(2);

    expect(api.getPvpMatchHistory).toHaveBeenCalledWith(2);
    expect(result).toEqual(matches);
    expect(vm.matchHistory).toEqual(matches);
  });

  it('summarizes PvP match history into win loss draw counts', () => {
    vm.matchHistory = [
      { id: 'match-1', outcome: 'win' },
      { id: 'match-2', outcome: 'loss' },
      { id: 'match-3', outcome: 'draw' },
      { id: 'match-4', outcome: 'win' },
    ];

    expect(vm.matchSummary).toEqual({
      wins: 2,
      losses: 1,
      draws: 1,
      total: 4,
      label: '2W / 1L / 1D',
    });
  });

  it('keeps an empty history and error when match history fails', async () => {
    api.getPvpMatchHistory.mockRejectedValue(new Error('History unavailable'));

    const result = await vm.loadMatchHistory();

    expect(result).toEqual([]);
    expect(vm.matchHistory).toEqual([]);
    expect(vm.error).toBe('History unavailable');
  });

  it('constructs a ViewModel directly', () => {
    expect(new PvpViewModel(api)).toBeInstanceOf(PvpViewModel);
  });
});
