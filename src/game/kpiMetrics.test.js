import { describe, expect, it } from 'vitest';
import { KPI_TARGETS, buildKpiSnapshot } from './kpiMetrics';

describe('KPI metric rules', () => {
  it('calculates D1 and D7 retention against the GDD targets', () => {
    const snapshot = buildKpiSnapshot({
      now: '2026-07-08T00:00:00Z',
      users: [
        { id: 'retained-d1', created_at: '2026-07-05T00:00:00Z', last_active_at: '2026-07-06T01:00:00Z' },
        { id: 'missed-d1', created_at: '2026-07-05T00:00:00Z', last_active_at: '2026-07-05T03:00:00Z' },
        { id: 'new-user', created_at: '2026-07-07T12:00:00Z', last_active_at: '2026-07-07T12:15:00Z' },
        { id: 'retained-d7', created_at: '2026-06-28T00:00:00Z', last_active_at: '2026-07-05T00:00:00Z' },
      ],
    });

    expect(snapshot.d1Retention).toMatchObject({
      eligible: 3,
      retained: 2,
      rate: 0.67,
      target: KPI_TARGETS.d1Retention,
      met: true,
    });
    expect(snapshot.d7Retention).toMatchObject({
      eligible: 1,
      retained: 1,
      rate: 1,
      target: KPI_TARGETS.d7Retention,
      met: true,
    });
  });

  it('summarizes session length, Level 5 reach, and Zone 1 completion goals', () => {
    const snapshot = buildKpiSnapshot({
      users: [
        { id: 'u1', created_at: '2026-07-01T00:00:00Z', last_active_at: '2026-07-01T00:10:00Z' },
        { id: 'u2', created_at: '2026-07-01T00:00:00Z', last_active_at: '2026-07-01T00:06:00Z' },
        { id: 'u3', created_at: '2026-07-01T00:00:00Z', last_active_at: '2026-07-01T00:03:00Z' },
        { id: 'u4', created_at: '2026-07-01T00:00:00Z', last_active_at: '2026-07-01T00:01:00Z' },
      ],
      progressRows: [
        { user_id: 'u1', level: 5 },
        { user_id: 'u2', level: 8 },
        { user_id: 'u3', level: 4 },
      ],
      bossClearRows: [
        { user_id: 'u1', zone_id: 'zone-1' },
        { user_id: 'u1', zone_id: 'zone-1' },
        { user_id: 'u3', zone_id: 'zone-2' },
      ],
      sessionRows: [
        { started_at: '2026-07-07T10:00:00Z', ended_at: '2026-07-07T10:04:30Z' },
        { started_at: '2026-07-07T11:00:00Z', ended_at: '2026-07-07T11:06:30Z' },
      ],
    });

    expect(snapshot.sessionLength).toMatchObject({
      averageMinutes: 5.5,
      sampleSize: 2,
      targetRange: KPI_TARGETS.sessionLengthMinutes,
      met: true,
    });
    expect(snapshot.level5Reach).toMatchObject({
      reached: 2,
      eligible: 4,
      rate: 0.5,
      target: KPI_TARGETS.level5Reach,
      met: false,
    });
    expect(snapshot.zone1Completion).toMatchObject({
      completed: 1,
      eligible: 4,
      rate: 0.25,
      target: KPI_TARGETS.zone1Completion,
      met: false,
    });
  });
});
