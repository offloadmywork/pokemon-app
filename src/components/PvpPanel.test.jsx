import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PvpPanel from './PvpPanel';

const livingTeam = [
  { pokemon_id: 'p1', name: 'Pikachu', power_level: 50, currentHP: 30 },
  { pokemon_id: 'p2', name: 'Charmander', power_level: 25, currentHP: 0 },
];

const createMockApi = (overrides = {}) => ({
  getTeam: vi.fn().mockResolvedValue(livingTeam),
  getWallet: vi.fn().mockResolvedValue({ user_id: 'user-1', coins: 75, shards: 0 }),
  getPvpMatchHistory: vi.fn().mockResolvedValue({ matches: [] }),
  joinPvpQueue: vi.fn().mockResolvedValue({ queued: true, matched: false }),
  leavePvpQueue: vi.fn().mockResolvedValue({ left: true }),
  submitPvpMatchResult: vi.fn(),
  ...overrides,
});

describe('PvpPanel', () => {
  it('loads the player team and starts PvP matchmaking', async () => {
    const api = createMockApi();

    render(<PvpPanel apiClient={api} />);

    expect(await screen.findByText('Team Power: 50')).toBeInTheDocument();
    expect(screen.getByText('Wallet: 75 coins')).toBeInTheDocument();
    expect(api.getWallet).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Find Match'));

    expect(api.joinPvpQueue).toHaveBeenCalledWith(livingTeam);
    expect(await screen.findByText('Searching for a fair opponent...')).toBeInTheDocument();
    expect(screen.getByText('Waiting for a fair opponent')).toBeInTheDocument();
    expect(screen.getByText('Stay on this screen while matchmaking checks for a balanced team.')).toBeInTheDocument();
    expect(screen.getByText('Leave Queue')).toBeInTheDocument();
  });

  it('shows recent PvP match history when available', async () => {
    const api = createMockApi({
      getPvpMatchHistory: vi.fn().mockResolvedValue({
        matches: [
          {
            id: 'match-1',
            opponent_user_id: 'opponent-1',
            outcome: 'win',
            completed_at: '2026-07-05T04:30:00Z',
          },
          {
            id: 'match-2',
            opponent_user_id: 'opponent-2',
            outcome: 'loss',
            completed_at: '2026-07-05T04:00:00Z',
          },
          {
            id: 'match-3',
            opponent_user_id: 'opponent-3',
            outcome: 'draw',
            completed_at: '2026-07-05T03:30:00Z',
          },
        ],
      }),
    });

    render(<PvpPanel apiClient={api} />);

    expect(await screen.findByText('Recent PvP')).toBeInTheDocument();
    expect(screen.getByText('Record: 1W / 1L / 1D')).toBeInTheDocument();
    expect(screen.getByLabelText('PvP outcome: win')).toHaveTextContent('WIN');
    expect(screen.getByLabelText('PvP outcome: loss')).toHaveTextContent('LOSS');
    expect(screen.getByLabelText('PvP outcome: draw')).toHaveTextContent('DRAW');
    expect(screen.getByText('vs opponent-1')).toBeInTheDocument();
    expect(screen.getByText('Jul 5, 04:30 UTC')).toBeInTheDocument();
    expect(screen.getByText('Jul 5, 04:00 UTC')).toBeInTheDocument();
    expect(api.getPvpMatchHistory).toHaveBeenCalledWith(3);
  });

  it('encourages first-time PvP players when match history is empty', async () => {
    const api = createMockApi();

    render(<PvpPanel apiClient={api} />);

    expect(await screen.findByText('No PvP battles yet')).toBeInTheDocument();
    expect(screen.getByText('Find a match to start your arena record.')).toBeInTheDocument();
  });

  it('can route players from PvP Arena to PvP rankings', async () => {
    const api = createMockApi();
    const onNavigate = vi.fn();

    render(<PvpPanel apiClient={api} onNavigate={onNavigate} />);

    fireEvent.click(await screen.findByText('View PvP Rankings'));

    expect(onNavigate).toHaveBeenCalledWith('leaderboards');
  });

  it('uses a friendly fallback when PvP history is missing an opponent label', async () => {
    const api = createMockApi({
      getPvpMatchHistory: vi.fn().mockResolvedValue({
        matches: [
          {
            id: 'match-1',
            outcome: 'win',
            completed_at: '2026-07-05T04:30:00Z',
          },
        ],
      }),
    });

    render(<PvpPanel apiClient={api} />);

    expect(await screen.findByText('Recent PvP')).toBeInTheDocument();
    expect(screen.getByText('vs Unknown Trainer')).toBeInTheDocument();
    expect(screen.queryByText('vs')).not.toBeInTheDocument();
  });

  it('surfaces a matched opponent from the PvP ViewModel state', async () => {
    const api = createMockApi({
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: { user_id: 'opponent-1', team_power: 52 },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByText('Matched with Trainer opponent-1')).toBeInTheDocument();
    expect(screen.getByText('Opponent Power: 52')).toBeInTheDocument();
  });

  it('previews the opponent team when a PvP battle is matched', async () => {
    const api = createMockApi({
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 77,
          team: [
            { pokemon_id: 'o1', name: 'Squirtle', power_level: 52, currentHP: 80 },
            { pokemon_id: 'o2', name: 'Bulbasaur', power_level: 25, currentHP: 25 },
          ],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByText('Opponent team preview')).toBeInTheDocument();
    expect(screen.getByText('Squirtle 80 / 100 HP')).toBeInTheDocument();
    expect(screen.getByText('Bulbasaur 25 / 100 HP')).toBeInTheDocument();
  });

  it('warns when an opponent team preview Pokemon is low on HP', async () => {
    const api = createMockApi({
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 77,
          team: [
            { pokemon_id: 'o1', name: 'Squirtle', power_level: 52, currentHP: 80 },
            { pokemon_id: 'o2', name: 'Bulbasaur', power_level: 25, currentHP: 25 },
          ],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByText('Opponent team preview')).toBeInTheDocument();
    expect(screen.getByLabelText('Bulbasaur low HP opponent preview')).toHaveTextContent('LOW HP');
  });

  it('marks fainted Pokemon in the opponent team preview', async () => {
    const api = createMockApi({
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 77,
          team: [
            { pokemon_id: 'o1', name: 'Squirtle', power_level: 52, currentHP: 80 },
            { pokemon_id: 'o2', name: 'Bulbasaur', power_level: 25, currentHP: 0 },
          ],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByText('Opponent team preview')).toBeInTheDocument();
    expect(screen.getByText('Bulbasaur 0 / 100 HP')).toBeInTheDocument();
    expect(screen.getByLabelText('Bulbasaur fainted opponent preview')).toHaveTextContent('FAINTED');
  });

  it('previews the player team when a PvP battle is matched', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', type: 'Electric', power_level: 50, currentHP: 30 },
        { pokemon_id: 'p2', name: 'Charmander', type: 'Fire', power_level: 25, currentHP: 60 },
      ]),
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 77,
          team: [{ pokemon_id: 'o1', name: 'Squirtle', power_level: 52, currentHP: 80 }],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByText('Your team preview')).toBeInTheDocument();
    expect(screen.getByText('Pikachu 30 / 100 HP')).toBeInTheDocument();
    expect(screen.getByText('Charmander 60 / 100 HP')).toBeInTheDocument();
    expect(screen.getByText('Synergy: 2 type roles covered')).toBeInTheDocument();
    expect(screen.getByText('Coverage: Electric, Fire')).toBeInTheDocument();
  });

  it('marks active Pokemon in matched team previews', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', power_level: 50, currentHP: 30 },
        { pokemon_id: 'p2', name: 'Charmander', power_level: 25, currentHP: 60 },
      ]),
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 77,
          team: [
            { pokemon_id: 'o1', name: 'Squirtle', power_level: 52, currentHP: 20 },
            { pokemon_id: 'o2', name: 'Bulbasaur', power_level: 25, currentHP: 80 },
          ],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByLabelText('Pikachu active player preview')).toHaveTextContent('ACTIVE');
    expect(screen.getByLabelText('Squirtle active opponent preview')).toHaveTextContent('ACTIVE');

    fireEvent.click(screen.getByText('Attack'));

    expect(await screen.findByLabelText('Bulbasaur active opponent preview')).toHaveTextContent('ACTIVE');
    expect(screen.queryByLabelText('Squirtle active opponent preview')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Switch to Charmander (60 / 100 HP)'));

    expect(await screen.findByLabelText('Charmander active player preview')).toHaveTextContent('ACTIVE');
    expect(screen.queryByLabelText('Pikachu active player preview')).not.toBeInTheDocument();
  });

  it('shows opening guidance before the first PvP attack', async () => {
    const opponentTeam = [
      { pokemon_id: 'o1', name: 'Squirtle', power_level: 52, currentHP: 80 },
    ];
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', power_level: 50, currentHP: 30 },
        { pokemon_id: 'p2', name: 'Bulbasaur', power_level: 25, currentHP: 60 },
      ]),
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: { user_id: 'opponent-1', team_power: 52, team: opponentTeam },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByText('Opening matchup')).toBeInTheDocument();
    expect(screen.getByText('Pikachu HP: 30 / 100')).toBeInTheDocument();
    expect(screen.getByText('Squirtle HP: 80 / 100')).toBeInTheDocument();
    expect(screen.getByText("Pikachu is leading into Squirtle. Attack when you're ready or switch to a better teammate.")).toBeInTheDocument();

    fireEvent.click(screen.getByText('Attack'));

    expect(await screen.findByText('Squirtle hit Pikachu for 52 damage.')).toBeInTheDocument();
    expect(screen.getByText('Turn 2')).toBeInTheDocument();
    expect(screen.getByText('Bulbasaur HP: 60 / 100')).toBeInTheDocument();
    expect(screen.getByText('Squirtle HP: 30 / 100')).toBeInTheDocument();
    expect(screen.queryByText('Opening matchup')).not.toBeInTheDocument();
  });

  it('suggests a type-advantaged bench switch in the opening matchup', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Squirtle', type: 'Water', power_level: 30, currentHP: 100 },
        { pokemon_id: 'p2', name: 'Charmander', type: 'Fire', power_level: 25, currentHP: 100 },
      ]),
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 30,
          team: [{ pokemon_id: 'o1', name: 'Bulbasaur', type: 'Grass', power_level: 30, currentHP: 100 }],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByText('Opening matchup')).toBeInTheDocument();
    expect(screen.getByText('Suggested switch: Charmander has type advantage.')).toBeInTheDocument();
  });

  it('shows the current PvP battle turn number', async () => {
    const api = createMockApi({
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 35,
          team: [{ pokemon_id: 'o1', name: 'Squirtle', power_level: 20, currentHP: 80 }],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByText('Turn 1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Attack'));

    expect(await screen.findByText('Turn 2')).toBeInTheDocument();
  });

  it('shows PvP energy and enables special attacks after basic attacks', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', power_level: 10, currentHP: 100 },
      ]),
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 10,
          team: [{ pokemon_id: 'o1', name: 'Squirtle', power_level: 1, currentHP: 100 }],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByText('Energy: 0 / 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Special/i })).toBeDisabled();

    fireEvent.click(screen.getByText('Attack'));
    expect(await screen.findByText('Energy: 1 / 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Special/i })).toBeDisabled();

    fireEvent.click(screen.getByText('Attack'));
    expect(await screen.findByText('Energy: 2 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Special/i }));

    expect(await screen.findByText('Pikachu used Special Strike on Squirtle for 20 damage.')).toBeInTheDocument();
    expect(screen.getByText('Energy: 0 / 2')).toBeInTheDocument();
  });

  it('labels basic and special PvP moves in the matched battle guide', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', power_level: 10, currentHP: 100 },
      ]),
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 10,
          team: [{ pokemon_id: 'o1', name: 'Squirtle', power_level: 10, currentHP: 100 }],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByText('Move guide')).toBeInTheDocument();
    expect(screen.getByText('Basic: Attack builds 1 energy')).toBeInTheDocument();
    expect(screen.getByText('Basic: Guard builds 1 energy and reduces retaliation')).toBeInTheDocument();
    expect(screen.getByText('Special: Spend 2 energy on Special Strike')).toBeInTheDocument();
  });

  it('lets players guard to build energy and reduce retaliation', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', power_level: 10, currentHP: 100 },
      ]),
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 20,
          team: [{ pokemon_id: 'o1', name: 'Squirtle', power_level: 20, currentHP: 100 }],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));
    fireEvent.click(await screen.findByText('Guard'));

    expect(await screen.findByText('Pikachu guarded and built energy.')).toBeInTheDocument();
    expect(screen.getByText('Squirtle hit Pikachu for 10 guarded damage.')).toBeInTheDocument();
    expect(screen.getByText('Energy: 1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Pikachu HP: 90 / 100')).toBeInTheDocument();
  });

  it('shows PvP type effectiveness feedback in the turn log', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', type: 'Electric', power_level: 20, currentHP: 100 },
      ]),
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 10,
          team: [{ pokemon_id: 'o1', name: 'Squirtle', type: 'Water', power_level: 10, currentHP: 100 }],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));
    fireEvent.click(await screen.findByText('Attack'));

    expect(await screen.findByText("Pikachu hit Squirtle for 30 damage. It's super effective!")).toBeInTheDocument();
    expect(screen.getByText("Squirtle hit Pikachu for 6 damage. It's not very effective.")).toBeInTheDocument();
    expect(screen.getByText('Squirtle HP: 70 / 100')).toBeInTheDocument();
    expect(screen.getByText('Pikachu HP: 94 / 100')).toBeInTheDocument();
  });

  it('marks low HP active Pokemon during a PvP battle', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', power_level: 50, currentHP: 20 },
      ]),
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 52,
          team: [{ pokemon_id: 'o1', name: 'Squirtle', power_level: 52, currentHP: 25 }],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByLabelText('Pikachu low HP')).toHaveTextContent('LOW HP');
    expect(screen.getByLabelText('Squirtle low HP')).toHaveTextContent('LOW HP');
  });

  it('submits a PvP win after resolving the matched battle', async () => {
    const opponentTeam = [
      { pokemon_id: 'o1', name: 'Squirtle', power_level: 52, currentHP: 20 },
    ];
    const api = createMockApi({
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: { user_id: 'opponent-1', team_power: 52, team: opponentTeam },
      }),
      submitPvpMatchResult: vi.fn().mockResolvedValue({ match: { id: 'match-1', outcome: 'win' } }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));
    expect(await screen.findByText('Battle: Pikachu vs Squirtle')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Attack'));

    expect(await screen.findByText('Pikachu hit Squirtle for 50 damage.')).toBeInTheDocument();
    expect(await screen.findByText('Battle complete: win')).toBeInTheDocument();
    expect(screen.getByText('Result ready to record')).toBeInTheDocument();
    expect(screen.getByText('Submit this win to update your PvP record.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Submit Result'));

    expect(api.submitPvpMatchResult).toHaveBeenCalledWith(expect.objectContaining({
      opponent_user_id: 'opponent-1',
      player_team: expect.arrayContaining([
        expect.objectContaining({ pokemon_id: 'p1', currentHP: 30 }),
      ]),
      opponent_team: expect.arrayContaining([
        expect.objectContaining({ pokemon_id: 'o1', currentHP: 0 }),
      ]),
    }));
    expect(await screen.findByText('Result recorded: win')).toBeInTheDocument();
  });

  it('shows PvP rewards after recording a completed match', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', power_level: 50, currentHP: 80 },
      ]),
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 52,
          team: [{ pokemon_id: 'o1', name: 'Squirtle', power_level: 20, currentHP: 20 }],
        },
      }),
      submitPvpMatchResult: vi.fn().mockResolvedValue({
        match: { id: 'match-1', outcome: 'win' },
        rewards: { xp: 50, coins: 20 },
        wallet: { coins: 50, shards: 0 },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));
    fireEvent.click(await screen.findByText('Attack'));
    fireEvent.click(await screen.findByText('Submit Result'));

    expect(await screen.findByText('Result recorded: win')).toBeInTheDocument();
    expect(screen.getByText('Rewards: +50 XP, +20 coins')).toBeInTheDocument();
    expect(screen.getByText('Wallet: 50 coins')).toBeInTheDocument();
  });

  it('resets transient battle state after recording a PvP result', async () => {
    const opponentTeam = [
      { pokemon_id: 'o1', name: 'Squirtle', power_level: 52, currentHP: 20 },
    ];
    const api = createMockApi({
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: { user_id: 'opponent-1', team_power: 52, team: opponentTeam },
      }),
      submitPvpMatchResult: vi.fn().mockResolvedValue({ match: { id: 'match-1', outcome: 'win' } }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));
    expect(await screen.findByText('Battle: Pikachu vs Squirtle')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Attack'));
    expect(await screen.findByText('Battle complete: win')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Submit Result'));

    expect(await screen.findByText('Result recorded: win')).toBeInTheDocument();
    expect(screen.getByText('Ready for a rematch')).toBeInTheDocument();
    expect(screen.getByText('Queue again when your team is set.')).toBeInTheDocument();
    expect(screen.getByText('Last match recorded')).toBeInTheDocument();
    expect(screen.getByText('Find Match')).toBeInTheDocument();
    expect(screen.queryByText('Opponent Power: 52')).not.toBeInTheDocument();
    expect(screen.queryByText('Battle: Pikachu vs Squirtle')).not.toBeInTheDocument();
    expect(screen.queryByText('Submit Result')).not.toBeInTheDocument();
  });

  it('lets players forfeit an in-progress PvP battle and submit the loss', async () => {
    const api = createMockApi({
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 52,
          team: [{ pokemon_id: 'o1', name: 'Squirtle', power_level: 20, currentHP: 80 }],
        },
      }),
      submitPvpMatchResult: vi.fn().mockResolvedValue({ match: { id: 'match-1', outcome: 'loss' } }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));
    expect(await screen.findByText('Battle: Pikachu vs Squirtle')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Forfeit'));

    expect(await screen.findByText('Pikachu forfeited the battle.')).toBeInTheDocument();
    expect(await screen.findByText('Battle complete: loss')).toBeInTheDocument();
    expect(screen.getByText('Submit this loss to update your PvP record.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Submit Result'));

    expect(api.submitPvpMatchResult).toHaveBeenCalledWith(expect.objectContaining({
      opponent_user_id: 'opponent-1',
      player_team: expect.arrayContaining([
        expect.objectContaining({ pokemon_id: 'p1', currentHP: 0 }),
      ]),
      opponent_team: expect.arrayContaining([
        expect.objectContaining({ pokemon_id: 'o1', currentHP: 80 }),
      ]),
    }));
    expect(await screen.findByText('Result recorded: loss')).toBeInTheDocument();
  });

  it('shows the next opponent after the active opponent faints', async () => {
    const opponentTeam = [
      { pokemon_id: 'o1', name: 'Squirtle', power_level: 20, currentHP: 20 },
      { pokemon_id: 'o2', name: 'Bulbasaur', power_level: 15, currentHP: 80 },
    ];
    const api = createMockApi({
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: { user_id: 'opponent-1', team_power: 35, team: opponentTeam },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));
    expect(await screen.findByText('Battle: Pikachu vs Squirtle')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Attack'));

    expect(await screen.findByText('Squirtle fainted.')).toBeInTheDocument();
    expect(await screen.findByText('Bulbasaur entered the battle.')).toBeInTheDocument();
    expect(await screen.findByText('Battle: Pikachu vs Bulbasaur')).toBeInTheDocument();
    expect(screen.getByText('Attack')).toBeInTheDocument();
  });

  it('lets players switch to a living bench Pokemon during a PvP battle', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', power_level: 50, currentHP: 30 },
        { pokemon_id: 'p2', name: 'Charmander', power_level: 25, currentHP: 60 },
      ]),
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 52,
          team: [{ pokemon_id: 'o1', name: 'Squirtle', power_level: 20, currentHP: 80 }],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));
    expect(await screen.findByText('Battle: Pikachu vs Squirtle')).toBeInTheDocument();

    expect(await screen.findByText('Switch to Charmander (60 / 100 HP)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Switch to Charmander (60 / 100 HP)'));

    expect(await screen.findByText('Battle: Charmander vs Squirtle')).toBeInTheDocument();
    expect(await screen.findByText('Pikachu switched out.')).toBeInTheDocument();
    expect(await screen.findByText('Charmander entered the battle.')).toBeInTheDocument();
  });

  it('warns when a switchable bench Pokemon is low on HP', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', power_level: 50, currentHP: 80 },
        { pokemon_id: 'p2', name: 'Charmander', power_level: 25, currentHP: 20 },
      ]),
      joinPvpQueue: vi.fn().mockResolvedValue({
        queued: false,
        matched: true,
        opponent: {
          user_id: 'opponent-1',
          team_power: 52,
          team: [{ pokemon_id: 'o1', name: 'Squirtle', power_level: 20, currentHP: 80 }],
        },
      }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByText('Switch to Charmander (20 / 100 HP)')).toBeInTheDocument();
    expect(screen.getByLabelText('Charmander low HP switch choice')).toHaveTextContent('LOW HP');
  });

  it('leaves the PvP queue and returns to ready state', async () => {
    const api = createMockApi();

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));
    fireEvent.click(await screen.findByText('Leave Queue'));

    expect(api.leavePvpQueue).toHaveBeenCalled();
    expect(await screen.findByText('Ready to queue')).toBeInTheDocument();
  });

  it('shows a clear retry affordance when PvP matchmaking fails', async () => {
    const api = createMockApi({
      joinPvpQueue: vi.fn()
        .mockRejectedValueOnce(new Error('Matchmaking service unavailable'))
        .mockResolvedValueOnce({ queued: true, matched: false }),
    });

    render(<PvpPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Find Match'));

    expect(await screen.findByText('Matchmaking failed')).toBeInTheDocument();
    expect(screen.getByText('Matchmaking service unavailable')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Try Again'));

    expect(api.joinPvpQueue).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Searching for a fair opponent...')).toBeInTheDocument();
  });

  it('disables matchmaking without a living team member', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Pikachu', power_level: 50, currentHP: 0 },
      ]),
    });

    render(<PvpPanel apiClient={api} />);

    expect(await screen.findByText('Team Power: 0')).toBeInTheDocument();
    expect(screen.getByText('Find Match')).toBeDisabled();
    expect(screen.getByText('Heal or add a living teammate before queueing.')).toBeInTheDocument();
  });
});
