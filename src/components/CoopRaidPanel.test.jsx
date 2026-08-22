import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CoopRaidPanel from './CoopRaidPanel';

const livingTeam = [
  { pokemon_id: 'p1', name: 'Venusaur', power_level: 80, currentHP: 90 },
  { pokemon_id: 'p2', name: 'Raichu', power_level: 45, currentHP: 0 },
];

const createWaitingRoom = () => ({
  raid: {
    id: 'raid-1',
    boss_name: 'Verdant Titan',
    level: 1,
    current_hp: 180,
    max_hp: 180,
    status: 'waiting',
  },
  participants: [
    { raid_id: 'raid-1', user_id: 'host-1', team_power: 80 },
  ],
  ready: false,
});

const createReadyRoom = () => ({
  ...createWaitingRoom(),
  participants: [
    { raid_id: 'raid-1', user_id: 'host-1', team_power: 80 },
    { raid_id: 'raid-1', user_id: 'guest-1', team_power: 70 },
  ],
  ready: true,
});

const createMockApi = (overrides = {}) => ({
  getTeam: vi.fn().mockResolvedValue(livingTeam),
  createCoopRaid: vi.fn().mockResolvedValue(createWaitingRoom()),
  joinCoopRaid: vi.fn().mockResolvedValue(createReadyRoom()),
  attackCoopRaid: vi.fn().mockResolvedValue({
    raid: {
      ...createReadyRoom().raid,
      current_hp: 100,
      status: 'in_progress',
    },
    attempt: {
      status: 'in_progress',
      outcome: null,
      damage_dealt: 80,
    },
    rewards: [],
  }),
  ...overrides,
});

describe('CoopRaidPanel', () => {
  it('loads the player team and creates a co-op raid room', async () => {
    const api = createMockApi();

    render(<CoopRaidPanel apiClient={api} />);

    expect(await screen.findByText('Raid Power: 80')).toBeInTheDocument();
    expect(screen.getByText('Ready to host or join')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Host Raid'));

    expect(api.createCoopRaid).toHaveBeenCalledWith(livingTeam, 1);
    expect(await screen.findByText('Waiting for one more trainer')).toBeInTheDocument();
    expect(screen.getByText('Room: raid-1')).toBeInTheDocument();
    expect(screen.getByText('Verdant Titan Lv. 1')).toBeInTheDocument();
    expect(screen.getByText('1 trainers ready · 80 raid power')).toBeInTheDocument();
  });

  it('copies the hosted raid invite code with visible feedback', async () => {
    const api = createMockApi();
    const copyRoomCode = vi.fn().mockResolvedValue();

    render(<CoopRaidPanel apiClient={api} copyRoomCode={copyRoomCode} />);

    fireEvent.click(await screen.findByText('Host Raid'));

    expect(await screen.findByText('Invite code: raid-1')).toBeInTheDocument();
    expect(screen.getByText('Share this code so another trainer can join your raid.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Copy Invite'));

    expect(copyRoomCode).toHaveBeenCalledWith('raid-1');
    expect(await screen.findByText('Invite code copied.')).toBeInTheDocument();
  });

  it('joins a raid room by code and shows ready state', async () => {
    const api = createMockApi();

    render(<CoopRaidPanel apiClient={api} />);

    fireEvent.change(await screen.findByLabelText('Raid room code'), {
      target: { value: 'raid-1' },
    });
    fireEvent.click(screen.getByText('Join Raid'));

    expect(api.joinCoopRaid).toHaveBeenCalledWith('raid-1', livingTeam);
    expect(await screen.findByText('Raid party ready')).toBeInTheDocument();
    expect(screen.getByText('2 trainers ready · 150 raid power')).toBeInTheDocument();
    expect(screen.getByText('Boss HP: 180 / 180')).toBeInTheDocument();
  });

  it('attacks a ready raid and shows updated boss HP feedback', async () => {
    const api = createMockApi();

    render(<CoopRaidPanel apiClient={api} />);

    fireEvent.change(await screen.findByLabelText('Raid room code'), {
      target: { value: 'raid-1' },
    });
    fireEvent.click(screen.getByText('Join Raid'));

    expect(await screen.findByText('Raid party ready')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Attack Boss'));

    expect(api.attackCoopRaid).toHaveBeenCalledWith('raid-1', 80);
    expect(await screen.findByText('Boss HP: 100 / 180')).toBeInTheDocument();
    expect(screen.getByText('Last hit dealt 80 damage.')).toBeInTheDocument();
  });

  it('shows victory rewards after a raid-winning attack', async () => {
    const api = createMockApi({
      attackCoopRaid: vi.fn().mockResolvedValue({
        raid: {
          ...createReadyRoom().raid,
          current_hp: 0,
          status: 'complete',
        },
        attempt: {
          status: 'complete',
          outcome: 'win',
          damage_dealt: 180,
        },
        rewards: [
          { user_id: 'host-1', xp: 80, coins: 30 },
          { user_id: 'guest-1', xp: 80, coins: 30 },
        ],
        progress: [
          { user_id: 'host-1', xp: 170, level: 2 },
          { user_id: 'guest-1', xp: 120, level: 2 },
        ],
        wallets: [
          { user_id: 'host-1', coins: 50 },
          { user_id: 'guest-1', coins: 30 },
        ],
      }),
    });

    render(<CoopRaidPanel apiClient={api} />);

    fireEvent.change(await screen.findByLabelText('Raid room code'), {
      target: { value: 'raid-1' },
    });
    fireEvent.click(screen.getByText('Join Raid'));

    expect(await screen.findByText('Raid party ready')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Attack Boss'));

    expect(await screen.findByText('Raid cleared! Rewards shared with 2 trainers.')).toBeInTheDocument();
    expect(screen.getByText('80 XP · 30 coins each')).toBeInTheDocument();
    expect(screen.getByText('host-1 reached Level 2 with 170 XP')).toBeInTheDocument();
    expect(screen.getByText('host-1 now has 50 coins')).toBeInTheDocument();
  });

  it('disables raid actions when the team has no living Pokemon', async () => {
    const api = createMockApi({
      getTeam: vi.fn().mockResolvedValue([
        { pokemon_id: 'p1', name: 'Venusaur', power_level: 80, currentHP: 0 },
      ]),
    });

    render(<CoopRaidPanel apiClient={api} />);

    expect(await screen.findByText('Raid Power: 0')).toBeInTheDocument();
    expect(screen.getByText('Heal or add a living teammate before raiding.')).toBeInTheDocument();
    expect(screen.getByText('Host Raid')).toBeDisabled();
    expect(screen.getByText('Join Raid')).toBeDisabled();
  });

  it('surfaces a raid creation error with a retry affordance', async () => {
    const api = createMockApi({
      createCoopRaid: vi.fn().mockRejectedValue(new Error('Raid service unavailable')),
    });

    render(<CoopRaidPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Host Raid'));

    expect(await screen.findByText('Co-op raid action failed')).toBeInTheDocument();
    expect(screen.getByText('Raid service unavailable')).toBeInTheDocument();
    expect(screen.getByText('Host Raid')).toBeEnabled();
  });
});
