export const KPI_TARGETS = {
  d1Retention: 0.35,
  d7Retention: 0.15,
  sessionLengthMinutes: { min: 4, max: 7 },
  level5Reach: 0.6,
  zone1Completion: 0.3,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildKpiSnapshot({
  users = [],
  progressRows = [],
  bossClearRows = [],
  sessionRows = [],
  now = new Date(),
} = {}) {
  const normalizedUsers = Array.isArray(users) ? users : [];

  return {
    d1Retention: calculateRetentionMetric(normalizedUsers, 1, KPI_TARGETS.d1Retention, now),
    d7Retention: calculateRetentionMetric(normalizedUsers, 7, KPI_TARGETS.d7Retention, now),
    sessionLength: calculateSessionLengthMetric(sessionRows, KPI_TARGETS.sessionLengthMinutes),
    level5Reach: calculateLevelReachMetric(normalizedUsers, progressRows, 5, KPI_TARGETS.level5Reach),
    zone1Completion: calculateZoneCompletionMetric(normalizedUsers, bossClearRows, 'zone-1', KPI_TARGETS.zone1Completion),
  };
}

export function calculateRetentionMetric(users = [], day = 1, target = 0, now = new Date()) {
  const referenceTime = toTime(now);
  const thresholdMs = Math.max(0, Number(day) || 0) * DAY_MS;
  const eligibleUsers = users.filter((user) => {
    const createdAt = toTime(user?.created_at);
    return Number.isFinite(createdAt) && referenceTime - createdAt >= thresholdMs;
  });

  const retained = eligibleUsers.filter((user) => {
    const createdAt = toTime(user?.created_at);
    const lastActiveAt = toTime(user?.last_active_at);
    return Number.isFinite(lastActiveAt) && lastActiveAt - createdAt >= thresholdMs;
  }).length;

  const rate = calculateRate(retained, eligibleUsers.length);

  return {
    eligible: eligibleUsers.length,
    retained,
    rate,
    target,
    met: rate >= target,
  };
}

export function calculateSessionLengthMetric(sessionRows = [], targetRange = KPI_TARGETS.sessionLengthMinutes) {
  const durations = (Array.isArray(sessionRows) ? sessionRows : [])
    .map((session) => {
      const startedAt = toTime(session?.started_at);
      const endedAt = toTime(session?.ended_at);
      if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) {
        return null;
      }
      return (endedAt - startedAt) / 60000;
    })
    .filter((duration) => duration !== null);

  const averageMinutes = roundMetric(
    durations.reduce((sum, duration) => sum + duration, 0) / Math.max(1, durations.length),
  );

  return {
    averageMinutes,
    sampleSize: durations.length,
    targetRange,
    met: durations.length > 0
      && averageMinutes >= targetRange.min
      && averageMinutes <= targetRange.max,
  };
}

export function calculateLevelReachMetric(users = [], progressRows = [], targetLevel = 5, target = 0) {
  const totalUsers = Array.isArray(users) ? users.length : 0;
  const reachedUserIds = new Set(
    (Array.isArray(progressRows) ? progressRows : [])
      .filter((row) => Number(row?.level) >= targetLevel)
      .map((row) => row.user_id)
      .filter(Boolean),
  );
  const reached = reachedUserIds.size;
  const rate = calculateRate(reached, totalUsers);

  return {
    eligible: totalUsers,
    reached,
    rate,
    target,
    met: rate >= target,
  };
}

export function calculateZoneCompletionMetric(users = [], bossClearRows = [], zoneId = 'zone-1', target = 0) {
  const totalUsers = Array.isArray(users) ? users.length : 0;
  const completedUserIds = new Set(
    (Array.isArray(bossClearRows) ? bossClearRows : [])
      .filter((row) => row?.zone_id === zoneId)
      .map((row) => row.user_id)
      .filter(Boolean),
  );
  const completed = completedUserIds.size;
  const rate = calculateRate(completed, totalUsers);

  return {
    eligible: totalUsers,
    completed,
    rate,
    target,
    met: rate >= target,
  };
}

function calculateRate(count, total) {
  if (!total) return 0;
  return roundMetric(count / total);
}

function roundMetric(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function toTime(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : NaN;
}
