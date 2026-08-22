import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoopRaidViewModel, createCoopRaidViewModel } from './CoopRaidViewModel';

const createMockApi = () => ({
  createCoopRaid: vi.fn(),
  joinCoopRaid: vi.fn(),
  attackCoopRaid: vi.fn(),
});

const createTeam = () => [
  { pokemon_id: 'p1', power_level: 45, currentHP: 80 },
  { pokemon_id: 'p2', power_level: 20, currentHP: 0 },
  { pokemon_id: 'p3', power_level: 35, currentHP: 25 },
];

const createWaitingRoom = () => ({
  raid: {
    id: 'raid-1',
    host_user_id: 'host-1',
    boss_name: 'Verdant Titan',
    level: 2,
    current_hp: 240,
    max_hp: 240,
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
    { raid_id: 'raid-1', user_id: 'guest-1', team_power: 60 },
  ],
  ready: true,
});

const createAttackResult = () => ({
  raid: {
    ...createReadyRoom().raid,
    current_hp: 120,
    status: 'in_progress',
  },
  attempt: {
    status: 'in_progress',
    outcome: null,
    damage_dealt: 60,
  },
  rewards: [],
});

describe('CoopRaidViewModel', () => {
  let api;
  let vm;

  beforeEach(() => {
    api = createMockApi();
    vm = createCoopRaidViewModel(api);
  });

  it('starts idle with no active raid room', () => {
    expect(vm.status).toBe('idle');
    expect(vm.room).toBe(null);
    expect(vm.raid).toBe(null);
    expect(vm.participants).toEqual([]);
    expect(vm.ready).toBe(false);
    expect(vm.isLoading).toBe(false);
    expect(vm.error).toBe(null);
  });

  it('creates a co-op raid room as host and waits for another trainer', async () => {
    const room = createWaitingRoom();
    api.createCoopRaid.mockResolvedValue(room);

    const result = await vm.createRaid(createTeam(), 2);

    expect(api.createCoopRaid).toHaveBeenCalledWith(createTeam(), 2);
    expect(result).toEqual(room);
    expect(vm.room).toEqual(room);
    expect(vm.raid).toEqual(room.raid);
    expect(vm.participants).toEqual(room.participants);
    expect(vm.ready).toBe(false);
    expect(vm.status).toBe('waiting');
    expect(vm.isLoading).toBe(false);
  });

  it('exposes shareable room feedback for inviting another trainer', async () => {
    const room = createWaitingRoom();
    api.createCoopRaid.mockResolvedValue(room);

    await vm.createRaid(createTeam(), 2);

    expect(vm.inviteSummary).toEqual({
      roomCode: 'raid-1',
      label: 'Invite code: raid-1',
      helper: 'Share this code so another trainer can join your raid.',
    });
  });

  it('joins a co-op raid room and marks the raid ready when two trainers are present', async () => {
    const room = createReadyRoom();
    api.joinCoopRaid.mockResolvedValue(room);

    const result = await vm.joinRaid('raid-1', createTeam());

    expect(api.joinCoopRaid).toHaveBeenCalledWith('raid-1', createTeam());
    expect(result).toEqual(room);
    expect(vm.room).toEqual(room);
    expect(vm.ready).toBe(true);
    expect(vm.status).toBe('ready');
    expect(vm.participantSummary).toEqual({
      count: 2,
      totalPower: 140,
      label: '2 trainers ready · 140 raid power',
    });
  });

  it('attacks a ready raid and updates boss HP from the attack response', async () => {
    vm.room = createReadyRoom();
    vm.status = 'ready';
    const attackResult = createAttackResult();
    api.attackCoopRaid.mockResolvedValue(attackResult);

    const result = await vm.attackRaid(60);

    expect(api.attackCoopRaid).toHaveBeenCalledWith('raid-1', 60);
    expect(result).toEqual(attackResult);
    expect(vm.raid).toEqual(attackResult.raid);
    expect(vm.status).toBe('in_progress');
    expect(vm.lastAttempt).toEqual(attackResult.attempt);
    expect(vm.rewards).toEqual([]);
    expect(vm.error).toBe(null);
  });

  it('marks a raid complete and stores rewards after a victory attack', async () => {
    vm.room = createReadyRoom();
    vm.status = 'ready';
    const victoryResult = {
      raid: {
        ...createReadyRoom().raid,
        current_hp: 0,
        status: 'complete',
      },
      attempt: {
        status: 'complete',
        outcome: 'win',
        damage_dealt: 200,
      },
      rewards: [
        { user_id: 'host-1', xp: 80, coins: 30 },
        { user_id: 'guest-1', xp: 80, coins: 30 },
      ],
    };
    api.attackCoopRaid.mockResolvedValue(victoryResult);

    const result = await vm.attackRaid(200);

    expect(result).toEqual(victoryResult);
    expect(vm.raid.current_hp).toBe(0);
    expect(vm.status).toBe('complete');
    expect(vm.lastAttempt.outcome).toBe('win');
    expect(vm.rewards).toEqual(victoryResult.rewards);
  });

  it('stores persisted progress and wallet balances from raid victory rewards', async () => {
    vm.room = createReadyRoom();
    vm.status = 'ready';
    const victoryResult = {
      raid: {
        ...createReadyRoom().raid,
        current_hp: 0,
        status: 'complete',
      },
      attempt: {
        status: 'complete',
        outcome: 'win',
        damage_dealt: 200,
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
    };
    api.attackCoopRaid.mockResolvedValue(victoryResult);

    await vm.attackRaid(200);

    expect(vm.progress).toEqual(victoryResult.progress);
    expect(vm.wallets).toEqual(victoryResult.wallets);
    expect(vm.rewardSummary).toEqual({
      trainerCount: 2,
      rewardLabel: '80 XP · 30 coins each',
      progressLabel: 'host-1 reached Level 2 with 170 XP',
      walletLabel: 'host-1 now has 50 coins',
    });
  });

  it('does not attack without an active raid room', async () => {
    const result = await vm.attackRaid(60);

    expect(result).toBe(null);
    expect(api.attackCoopRaid).not.toHaveBeenCalled();
    expect(vm.error).toBe('Join or host a ready raid before attacking.');
  });

  it('normalizes empty participant lists for room summaries', () => {
    vm.room = { raid: { id: 'raid-1' }, participants: null, ready: false };

    expect(vm.participants).toEqual([]);
    expect(vm.participantSummary).toEqual({
      count: 0,
      totalPower: 0,
      label: '0 trainers ready · 0 raid power',
    });
  });

  it('sets an error when creating a raid fails', async () => {
    api.createCoopRaid.mockRejectedValue(new Error('No living Pokemon'));

    const result = await vm.createRaid(createTeam(), 1);

    expect(result).toBe(null);
    expect(vm.status).toBe('idle');
    expect(vm.room).toBe(null);
    expect(vm.error).toBe('No living Pokemon');
    expect(vm.isLoading).toBe(false);
  });

  it('keeps the previous room while surfacing a join error', async () => {
    vm.room = createWaitingRoom();
    vm.status = 'waiting';
    api.joinCoopRaid.mockRejectedValue(new Error('Raid not found'));

    const result = await vm.joinRaid('missing-raid', createTeam());

    expect(result).toBe(null);
    expect(vm.room).toEqual(createWaitingRoom());
    expect(vm.status).toBe('waiting');
    expect(vm.error).toBe('Raid not found');
    expect(vm.isLoading).toBe(false);
  });

  it('keeps the previous room while surfacing an attack error', async () => {
    vm.room = createReadyRoom();
    vm.status = 'ready';
    api.attackCoopRaid.mockRejectedValue(new Error('Raid is not ready'));

    const result = await vm.attackRaid(60);

    expect(result).toBe(null);
    expect(vm.room).toEqual(createReadyRoom());
    expect(vm.status).toBe('ready');
    expect(vm.error).toBe('Raid is not ready');
    expect(vm.isLoading).toBe(false);
  });

  it('constructs a ViewModel directly', () => {
    expect(new CoopRaidViewModel(api)).toBeInstanceOf(CoopRaidViewModel);
  });
});
