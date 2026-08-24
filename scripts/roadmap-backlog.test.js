import fs from 'fs';
import { describe, expect, it } from 'vitest';

describe('post-Phase-3 roadmap backlog', () => {
  it('defines prioritized post-Phase-3 slices before new feature work starts', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');
    const section = roadmap.match(/## Post-Phase-3 Backlog([\s\S]*?)(?:\n## |\s*$)/)?.[1] || '';

    expect(roadmap).toContain('**Focus:** Weekly Missions slice');
    expect(section).toContain('### Priority');
    expect(section).toContain('1. Mobile navigation polish');
    expect(section).toContain('2. Economy sinks and rewards');
    expect(section).toContain('3. Social polish');
    expect(section).toContain('4. Lures and cosmetics');
    expect(section).toContain('10. Next GDD expansion brief');
    expect(section).toContain('### Next');
    expect(section).toContain('Next slice: Next GDD Expansion Brief is complete for now');
    expect(section).not.toContain('Next slice: Achievement milestones');
  });

  it('marks implemented post-Phase-3 polish slices complete before starting a new slice', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('## Current Feature: Mobile Navigation Polish');
    expect(roadmap).toContain('Mobile navigation polish complete for now');
    expect(roadmap).toContain('## Current Feature: Economy Sinks and Rewards');
    expect(roadmap).toContain('Economy sinks and rewards slice complete for now');
    expect(roadmap).toContain('## Current Feature: Social Polish');
    expect(roadmap).toContain('Social polish slice complete for now');
    expect(roadmap).toContain('## Current Feature: Lures and Cosmetics');
    expect(roadmap).toContain('Lures and cosmetics slice complete for now');
    expect(roadmap).toContain('## Current Feature: Convenience Boosts');
    expect(roadmap).toContain('Review the next GDD expansion or define a new post-Phase-3 slice.');
  });

  it('defines achievement milestones as the next post-Phase-3 expansion slice', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('## Current Feature: Achievement Milestones');
    expect(roadmap).toContain('Pure collection achievement milestone rules exist before persistence/UI');
    expect(roadmap).toContain('Claimed achievement persistence and wallet rewards are wired through D1/Worker APIs');
    expect(roadmap).toContain('Home surfaces a player-facing Achievements panel for collection milestones and claim feedback');
    expect(roadmap).toContain('Achievement milestones slice complete for now');
  });

  it('defines team management polish from the remaining GDD UX gaps', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('**Focus:** Weekly Missions slice');
    expect(roadmap).toContain('## Current Feature: Team Management Polish');
    expect(roadmap).toContain('GDD calls for Team drag/drop slots and synergy hints');
    expect(roadmap).toContain('Team synergy hints surface type coverage in Collection');
    expect(roadmap).toContain('Reorder controls let trainers move team members between battle slots');
    expect(roadmap).toContain('Team management polish slice complete for now');
  });

  it('tracks collection discovery polish from the remaining GDD UX gaps', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('## Current Feature: Collection Discovery Polish');
    expect(roadmap).toContain('GDD calls for Collection filter/search/rarity highlights');
    expect(roadmap).toContain('Collection ViewModel filters by search text, type, and rarity');
    expect(roadmap).toContain('Collection page surfaces search, type, and rarity controls with visible result counts');
    expect(roadmap).toContain('Collection discovery polish slice complete for now');
  });

  it('tracks the auth recovery risk called out by the GDD', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('## Current Feature: Trainer Recovery Code');
    expect(roadmap).toContain('GDD risk: Auth is localStorage UUID with data-loss risk');
    expect(roadmap).toContain('Home surfaces a trainer recovery code panel with copy feedback');
    expect(roadmap).toContain('Trainer recovery code slice complete for now');
  });

  it('tracks the D1 query performance risk called out by the GDD', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('## Current Feature: D1 Query Performance');
    expect(roadmap).toContain('GDD risk: D1 query performance');
    expect(roadmap).toContain('Repeatable D1 query index audit covers hot daily quest, PvP, co-op raid, and trading read paths');
    expect(roadmap).toContain('Pending trade offer lists use composite status/user indexes for incoming and outgoing reads');
    expect(roadmap).toContain('D1 query performance slice complete for now');
  });

  it('tracks KPI metric rules from the GDD', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('## Current Feature: KPI Metrics Snapshot');
    expect(roadmap).toContain('GDD KPIs: D1 retention, D7 retention, session length, Level 5 reach, and Zone 1 completion');
    expect(roadmap).toContain('Pure KPI snapshot rules calculate target progress before dashboard/API wiring');
    expect(roadmap).toContain('Worker KPI endpoint reads persisted user, progress, boss clear, and session rows');
    expect(roadmap).toContain('Player session samples persist for session-length KPI tracking');
    expect(roadmap).toContain('KPI Metrics Snapshot slice complete for now');
  });

  it('tracks the content volume management risk called out by the GDD', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('## Current Feature: Content Volume Management');
    expect(roadmap).toContain('GDD risk: Content volume management');
    expect(roadmap).toContain('Repeatable content volume audit checks roster count, type coverage, and rarity spread');
    expect(roadmap).toContain('Checked-in seed content stays inside the Phase 1 50-80 Pokemon range');
    expect(roadmap).toContain('Content Volume Management slice complete for now');
  });

  it('tracks the web performance risk called out by the GDD', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('## Current Feature: Web Performance Guardrails');
    expect(roadmap).toContain('GDD risk: Web limitations require light animations and fast mobile sessions');
    expect(roadmap).toContain('Repeatable web performance audit blocks heavyweight animation/rendering dependencies');
    expect(roadmap).toContain('Checked-in source stays within the infinite-animation budget per file');
    expect(roadmap).toContain('Built asset gzip budgets keep JavaScript, CSS, and total payloads inside mobile-friendly limits');
    expect(roadmap).toContain('Web Performance Guardrails slice complete for now');
  });

  it('tracks the no-pay-to-win monetization guardrail from the GDD', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('## Current Feature: Monetization Fairness Guardrails');
    expect(roadmap).toContain('GDD monetization guardrail: cosmetics and convenience boosts only, no pay-to-win');
    expect(roadmap).toContain('Repeatable monetization fairness audit blocks combat-power upgrades');
    expect(roadmap).toContain('Cosmetic slots stay visual-only and lure boosts avoid catch-rate or XP advantages');
    expect(roadmap).toContain('Monetization Fairness Guardrails slice complete for now');
  });

  it('tracks an overall GDD coverage audit before new expansion work', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('## Current Feature: GDD Coverage Audit');
    expect(roadmap).toContain('Repeatable GDD coverage audit checks Phase 1, Phase 2, Phase 3, UX, economy/monetization, KPI, and risk markers');
    expect(roadmap).toContain('Checked-in roadmap currently covers every major GDD group');
    expect(roadmap).toContain('GDD Coverage Audit slice complete for now');
  });

  it('defines the next GDD expansion brief before new feature work starts', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('## Current Feature: Next GDD Expansion Brief');
    expect(roadmap).toContain('Phase 4 candidate: Live Ops and Retention');
    expect(roadmap).toContain('Weekly missions and event rotations build on daily quests, streaks, and seasonal events');
    expect(roadmap).toContain('Collection mastery tiers extend achievements without adding pay-to-win power');
    expect(roadmap).toContain('Release-readiness guardrails stay mandatory before any automatic deployment');
    expect(roadmap).toContain('Detailed Phase 4 GDD v1.1 now defines the live-ops loop, delivery order, and evidence-based quality gates.');
  });

  it('tracks release-readiness automation before automatic deployment', () => {
    const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');

    expect(roadmap).toContain('## Current Feature: Release Readiness Automation');
    expect(roadmap).toContain('Release readiness audit requires tests, build, content volume, D1 index, GDD coverage, monetization fairness, web performance, and Worker dry-run checks');
    expect(roadmap).toContain('Package release verification chains the mandatory checks before deployment');
    expect(roadmap).toContain('Tracked pre-push hook runs release verification before automatic deployment');
    expect(roadmap).toContain('Local Git hooks path is configured to use the tracked release hook directory');
    expect(roadmap).toContain('GitHub CI runs release verification before the production deploy job');
    expect(roadmap).toContain('GitHub CI production deploy depends on the release verification job');
    expect(roadmap).toContain('GitHub CI production deploy is limited to the main branch');
    expect(roadmap).toContain('GitHub CI production deploy requires the Cloudflare token and account secrets');
    expect(roadmap).toContain('GitHub CI production deploy uses the minified Worker deploy command');
    expect(roadmap).toContain('Release Readiness Automation slice complete for now');
  });
});
