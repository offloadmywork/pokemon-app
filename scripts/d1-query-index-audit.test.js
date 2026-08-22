import { describe, expect, it } from 'vitest';
import { auditD1QueryIndexes, extractSchemaIndexes } from './d1-query-index-audit.js';

describe('D1 query index audit', () => {
  it('extracts index tables and ordered columns from schema SQL', () => {
    const indexes = extractSchemaIndexes(`
      CREATE INDEX IF NOT EXISTS idx_example ON example_table(user_id, created_at DESC);
    `);

    expect(indexes.idx_example).toEqual({
      name: 'idx_example',
      table: 'example_table',
      columns: ['user_id', 'created_at'],
    });
  });

  it('reports missing required indexes for hot gameplay and social queries', () => {
    const audit = auditD1QueryIndexes({
      schema: `
        CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, quest_date);
      `,
    });

    expect(audit.status).toBe('missing-indexes');
    expect(audit.checks).toContainEqual(expect.objectContaining({
      name: 'idx_trade_offers_pending_from_user',
      present: false,
    }));
  });

  it('keeps the checked-in schema covered for hot D1 read paths', () => {
    const audit = auditD1QueryIndexes({ schemaFile: 'schema.sql' });

    expect(audit.status).toBe('complete');
    expect(audit.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'idx_trade_offers_pending_from_user',
        table: 'trade_offers',
        columns: ['status', 'from_user_id', 'created_at'],
        present: true,
      }),
      expect.objectContaining({
        name: 'idx_trade_offers_pending_to_user',
        table: 'trade_offers',
        columns: ['status', 'to_user_id', 'created_at'],
        present: true,
      }),
    ]));
  });
});
