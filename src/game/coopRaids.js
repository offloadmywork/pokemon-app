const MIN_COOP_RAID_TRAINERS = 2;
const DEFAULT_RAID_BOSS = {
  id: 'verdant-titan',
  name: 'Verdant Titan',
};

const isLivingTeamMember = (member) => (member.currentHP ?? 0) > 0;

export function calculateCoopRaidTeamPower(team = []) {
  return team
    .filter(isLivingTeamMember)
    .reduce((total, member) => total + (member.power_level || 0), 0);
}

export function calculateCoopRaidPartyPower(participants = []) {
  return participants.reduce(
    (total, participant) => total + calculateCoopRaidTeamPower(participant.team),
    0,
  );
}

export function canStartCoopRaid(participants = []) {
  const eligibleParticipants = getEligibleRaidParticipants(participants);
  const partyPower = calculateCoopRaidPartyPower(participants);

  if (eligibleParticipants.length < MIN_COOP_RAID_TRAINERS) {
    return {
      eligible: false,
      eligibleTrainerCount: eligibleParticipants.length,
      partyPower,
      reason: 'Invite at least two trainers with living Pokemon to start a co-op raid.',
    };
  }

  return {
    eligible: true,
    eligibleTrainerCount: eligibleParticipants.length,
    partyPower,
    reason: null,
  };
}

export function buildCoopRaidBoss({ level = 1, id = DEFAULT_RAID_BOSS.id, name = DEFAULT_RAID_BOSS.name } = {}) {
  const safeLevel = Math.max(1, Math.floor(level));

  return {
    id,
    name,
    level: safeLevel,
    maxHP: 120 + (safeLevel * 60),
    currentHP: 120 + (safeLevel * 60),
    power: 50 + (safeLevel * 20),
    reward_xp: 60 + (safeLevel * 20),
    reward_coins: 20 + (safeLevel * 10),
  };
}

export function resolveCoopRaidAttempt({ participants = [], boss, damageDealt = 0 } = {}) {
  const raidBoss = boss || buildCoopRaidBoss();
  const nextBoss = {
    ...raidBoss,
    currentHP: Math.max(0, (raidBoss.currentHP ?? raidBoss.maxHP ?? 0) - Math.max(0, damageDealt)),
  };
  const partyPower = calculateCoopRaidPartyPower(participants);
  const isComplete = nextBoss.currentHP <= 0;

  return {
    status: isComplete ? 'complete' : 'in_progress',
    outcome: isComplete ? 'win' : null,
    boss: nextBoss,
    partyPower,
    rewards: isComplete ? buildRaidRewards(participants, raidBoss) : [],
  };
}

function getEligibleRaidParticipants(participants = []) {
  return participants.filter((participant) => calculateCoopRaidTeamPower(participant.team) > 0);
}

function buildRaidRewards(participants, boss) {
  return getEligibleRaidParticipants(participants).map((participant) => ({
    user_id: participant.user_id,
    xp: boss.reward_xp ?? 0,
    coins: boss.reward_coins ?? 0,
  }));
}
