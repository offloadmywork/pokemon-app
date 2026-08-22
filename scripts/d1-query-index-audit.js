import fs from 'fs';
import { pathToFileURL } from 'url';

const REQUIRED_INDEXES = [
  {
    name: 'idx_daily_quests_user_date',
    table: 'daily_quests',
    columns: ['user_id', 'quest_date'],
    reason: 'load and regenerate today\'s daily quests for a trainer',
  },
  {
    name: 'idx_pvp_queue_team_power',
    table: 'pvp_queue',
    columns: ['team_power'],
    reason: 'find fair PvP opponents inside the team-power window',
  },
  {
    name: 'idx_pvp_matches_player',
    table: 'pvp_matches',
    columns: ['player_user_id', 'completed_at'],
    reason: 'load recent PvP history when the trainer initiated the match',
  },
  {
    name: 'idx_pvp_matches_opponent',
    table: 'pvp_matches',
    columns: ['opponent_user_id', 'completed_at'],
    reason: 'load recent PvP history when the trainer was the opponent',
  },
  {
    name: 'idx_coop_raid_rooms_status',
    table: 'coop_raid_rooms',
    columns: ['status', 'created_at'],
    reason: 'scan open raid rooms by newest status bucket',
  },
  {
    name: 'idx_coop_raid_participants_user',
    table: 'coop_raid_participants',
    columns: ['user_id', 'joined_at'],
    reason: 'load a trainer\'s recent co-op raid participation',
  },
  {
    name: 'idx_trade_offers_pending_from_user',
    table: 'trade_offers',
    columns: ['status', 'from_user_id', 'created_at'],
    reason: 'list outgoing pending trades without scanning all pending offers',
  },
  {
    name: 'idx_trade_offers_pending_to_user',
    table: 'trade_offers',
    columns: ['status', 'to_user_id', 'created_at'],
    reason: 'list incoming pending trades without scanning all pending offers',
  },
];

export function extractSchemaIndexes(schema) {
  const indexes = {};
  const indexPattern = /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+(\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)/gi;
  let match;

  while ((match = indexPattern.exec(String(schema || ''))) !== null) {
    indexes[match[1]] = {
      name: match[1],
      table: match[2],
      columns: match[3]
        .split(',')
        .map((column) => column.trim().split(/\s+/)[0])
        .filter(Boolean),
    };
  }

  return indexes;
}

export function auditD1QueryIndexes({ schema, schemaFile = 'schema.sql' } = {}) {
  const schemaContent = schema ?? fs.readFileSync(schemaFile, 'utf8');
  const indexes = extractSchemaIndexes(schemaContent);
  const checks = REQUIRED_INDEXES.map((required) => {
    const actual = indexes[required.name];
    const present = Boolean(actual)
      && actual.table === required.table
      && required.columns.every((column, index) => actual.columns[index] === column);

    return {
      ...required,
      present,
      actualColumns: actual?.columns || [],
    };
  });

  return {
    status: checks.every((check) => check.present) ? 'complete' : 'missing-indexes',
    checks,
  };
}

function printAudit(audit) {
  console.log(`D1 query index audit: ${audit.status}`);
  for (const check of audit.checks) {
    console.log(`${check.present ? '✓' : 'x'} ${check.name} on ${check.table} (${check.reason})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  printAudit(auditD1QueryIndexes({ schemaFile: process.argv[2] || 'schema.sql' }));
}
