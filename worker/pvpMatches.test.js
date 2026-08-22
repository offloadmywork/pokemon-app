import { describe, expect, it, vi } from 'vitest';
import { listPvpMatchHistory, recordPvpMatchResult } from './pvpMatches';

function createDbMock({ rows = [] } = {}) {
  const calls = [];
  const db = {
    prepare: vi.fn((sql) => ({
      bind: vi.fn((...params) => ({
        run: vi.fn(async () => {
          calls.push({ type: 'run', sql, params });
          return { success: true };
        }),
        all: vi.fn(async () => {
          calls.push({ type: 'all', sql, params });
          if (sql.includes('FROM pvp_matches')) {
            return { results: rows };
          }
          return { results: [] };
        }),
      })),
    })),
  };

  return { db, calls };
}

describe('PvP match persistence', () => {
  it('records a completed PvP match result', async () => {
    const matchRow = {
      id: 'match-1',
      player_user_id: 'user-1',
      opponent_user_id: 'opponent-1',
      outcome: 'win',
      winner_user_id: 'user-1',
      player_remaining_pokemon: 2,
      opponent_remaining_pokemon: 0,
      completed_at: '2026-07-05T04:00:00Z',
    };
    const { db, calls } = createDbMock({ rows: [matchRow] });

    const result = await recordPvpMatchResult(
      db,
      {
        player_user_id: 'user-1',
        opponent_user_id: 'opponent-1',
        outcome: 'win',
        winner_user_id: 'user-1',
        player_remaining_pokemon: 2,
        opponent_remaining_pokemon: 0,
      },
      () => 'match-1'
    );

    expect(result).toEqual(matchRow);
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'run',
        sql: expect.stringContaining('INSERT INTO pvp_matches'),
        params: ['match-1', 'user-1', 'opponent-1', 'win', 'user-1', 2, 0],
      }),
      expect.objectContaining({
        type: 'all',
        sql: expect.stringContaining('FROM pvp_matches'),
        params: ['match-1'],
      }),
    ]));
  });

  it('records a draw without a winner', async () => {
    const { db, calls } = createDbMock({
      rows: [{
        id: 'match-draw',
        player_user_id: 'user-1',
        opponent_user_id: 'opponent-1',
        outcome: 'draw',
        winner_user_id: null,
        player_remaining_pokemon: 0,
        opponent_remaining_pokemon: 0,
      }],
    });

    const result = await recordPvpMatchResult(
      db,
      {
        player_user_id: 'user-1',
        opponent_user_id: 'opponent-1',
        outcome: 'draw',
        player_remaining_pokemon: 0,
        opponent_remaining_pokemon: 0,
      },
      () => 'match-draw'
    );

    expect(result).toEqual(expect.objectContaining({
      outcome: 'draw',
      winner_user_id: null,
    }));
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'run',
      params: ['match-draw', 'user-1', 'opponent-1', 'draw', null, 0, 0],
    }));
  });

  it('lists recent matches involving the player', async () => {
    const rows = [
      {
        id: 'match-2',
        player_user_id: 'opponent-1',
        opponent_user_id: 'user-1',
        outcome: 'loss',
        winner_user_id: 'opponent-1',
        completed_at: '2026-07-05T05:00:00Z',
      },
      {
        id: 'match-1',
        player_user_id: 'user-1',
        opponent_user_id: 'opponent-1',
        outcome: 'win',
        winner_user_id: 'user-1',
        completed_at: '2026-07-05T04:00:00Z',
      },
    ];
    const { db, calls } = createDbMock({ rows });

    const result = await listPvpMatchHistory(db, 'user-1', 2);

    expect(result).toEqual(rows);
    expect(calls).toContainEqual(expect.objectContaining({
      type: 'all',
      sql: expect.stringContaining('ORDER BY completed_at DESC'),
      params: ['user-1', 'user-1', 2],
    }));
  });
});
