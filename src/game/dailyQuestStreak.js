const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDayNumber(dateString) {
  const date = new Date(`${String(dateString).slice(0, 10)}T00:00:00Z`);
  return Math.floor(date.getTime() / MS_PER_DAY);
}

export function getDailyQuestStreakBonus(streak) {
  if (streak > 0 && streak % 14 === 0) {
    return { item_id: 'ultra_ball', quantity: 1 };
  }

  if (streak > 0 && streak % 7 === 0) {
    return { item_id: 'great_ball', quantity: 2 };
  }

  if (streak > 0 && streak % 3 === 0) {
    return { item_id: 'pokeball', quantity: 3 };
  }

  return null;
}

export function calculateDailyQuestStreak({
  quests,
  currentStreak = 0,
  lastClaimDate = null,
  claimDate = new Date().toISOString().slice(0, 10),
}) {
  const allClaimed = Array.isArray(quests)
    && quests.length > 0
    && quests.every((quest) => Boolean(quest.claimed_at));

  if (!allClaimed) {
    return {
      streak: currentStreak,
      changed: false,
      bonus: null,
    };
  }

  if (lastClaimDate && toDayNumber(lastClaimDate) === toDayNumber(claimDate)) {
    return {
      streak: currentStreak,
      changed: false,
      bonus: getDailyQuestStreakBonus(currentStreak),
    };
  }

  const continued = lastClaimDate
    && toDayNumber(claimDate) - toDayNumber(lastClaimDate) === 1;
  const streak = continued ? currentStreak + 1 : 1;

  return {
    streak,
    changed: true,
    bonus: getDailyQuestStreakBonus(streak),
  };
}
