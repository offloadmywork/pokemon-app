# Pokémon App — Game Design Document

**Version:** 1.1 (Phase 4: Live Ops & Retention)

**Platform:** Mobile-first web
**Product quality target:** polished, all-ages, first-party-console-inspired quality bar; every release is judged against the acceptance gates in section 13. This is a quality benchmark, not a claim of affiliation with or equivalence to Nintendo.

## 1) Product Vision

Deliver a welcoming creature-collection adventure that makes a three-to-five-minute web session feel like a complete, memorable play beat: discover, make a meaningful tactical choice, earn visible progress, and leave with a clear reason to return.

### Design pillars

1. **Immediate delight** — the first useful action is obvious; feedback is legible, responsive, and celebratory without slowing play.
2. **Earned mastery** — team composition, type choices, timing, and resource use matter more than grinding or spending.
3. **Collection with stories** — every roster addition, evolution, milestone, and cosmetic gives players something personal to pursue or show.
4. **Respect for the player** — no manipulative pressure, no pay-to-win power, clear odds/rules, recoverable progress, and accessible controls.
5. **Crafted web performance** — mobile loading, navigation, and interactions stay quick even on modest devices.

## 2) Audience and Promise

**Primary:** ages 10+ who enjoy collecting and light turn-based strategy, including returning fans and mobile-web players with short breaks.

**Secondary:** completionists and social competitors pursuing mastery, rankings, cooperative raids, and trades.

**Session promise:** in 3–5 minutes a player can take one meaningful action, understand its result, make progress toward a visible goal, and know the best next action.

## 3) Core Experience Loop

1. **Choose intent:** a home panel offers one clear recommended action (explore, battle, mission, upgrade, or social activity).
2. **Discover:** explore a zone or event encounter; encounter presentation reveals rarity and type clearly.
3. **Decide:** use type advantage, moves, energy, guard/switch choices, team coverage, or an item.
4. **Resolve:** battle/capture feedback explains why an outcome happened and grants XP, currency, items, mastery, or mission progress.
5. **Invest:** improve team, collection, achievements, cosmetics, and mission progress.
6. **Return:** a daily/weekly objective or seasonal rotation offers variety without punishing missed play.

Every new system must attach to at least two loop steps and surface a player-facing reason to engage; isolated menus are not shippable content.

## 4) Progression and Content Cadence

### Player progression

- **Trainer Level:** unlocks zones, advanced mission variants, and features.
- **Collection / mastery:** milestones award one-time currency-only rewards and visible tier recognition.
- **Team mastery:** team coverage and manual battle decisions improve outcomes; combat power must never be sold.
- **Zone progression:** named boss clears record regional accomplishment and unlock the next destination.

### Cadence

| Cadence | Player value | Current implementation |
| --- | --- | --- |
| Moment-to-moment | Encounter, battle, capture, reward | Explore, battle, items, evolution |
| Daily | Compact varied goals and streak recognition | Level-scaled Daily Quests + streak bonuses |
| Weekly | Longer-term goals and completion chest | Weekly Missions with rotating advanced missions |
| Seasonal | Fresh visual/theme and encounter variety | Summer Splash event rules and boosted encounters |
| Long-term | Completion, self-expression, social mastery | Achievements, Collection Mastery, cosmetics, PvP, raids, trading |

### Phase 4 goal

Convert the existing feature set into a coherent retention game: the Home screen recommends a next-best action, weekly missions connect to every core activity, and seasons have an authored beginning, mid-event twist, and closing reward. Production telemetry decides tuning; it must not be guessed.

### Shipped roadmap lineage

**Phase 3:**
- PvP battles
- Co-op raids
- Trading

---

## 5) Battle Design

- Turn-based 1v1 PvE and team-based PvP/raid variants.
- Every combat state answers: whose turn it is, active combatants and HP, available moves/energy, type effectiveness, and what changed after the last action.
- Basic moves build energy; special moves spend it. Guard reduces retaliation; switching enables matchup decisions.
- Difficulty ramps through understandable enemy/team composition and encounter context, not opaque stat spikes.
- Defeat should teach or redirect: show the actionable reason (type mismatch, low HP, missing item, team coverage) and a route back to play.

## 6) Economy, Rewards, and Fairness

**Currencies:** coins (core spending) and shards (rare rewards).

**Sinks:** consumables, trainer upgrades, lures, and visual cosmetics.
**Sources:** encounters, victories, dailies/weeklies, achievements, bosses, social modes, and seasonal content.

### Non-negotiable fairness rules

- Purchases may be cosmetic or convenience-only; no paid combat power, combat-stat advantage, capture-rate boost, XP multiplier, or exclusive competitive capability.
- Mission rewards are bounded, clearly described, and never rely on a purchase to complete.
- Random outcomes must have comprehensible rules and a non-paid path to progress.
- A player can recover identity/progress with a recovery code; account safety is a release requirement.

## 7) Social Modes

- **PvP:** fair power-range matchmaking, readable match state, outcome history, and no monetized advantage.
- **Co-op raids:** at least two eligible trainers, shared boss state, shareable invite codes, and clearly distributed rewards.
- **Trading:** ownership validation, obvious offer status, and cancel/decline affordances.

Social systems must be safe by default: no open text chat in the current scope, no accidental irreversible transfer, and every social action states its effect before confirmation.

## 8) UX, Accessibility, and Presentation

- Fixed mobile bottom navigation reaches Home, Map, Collection, Team, and Rankings in one tap.
- Primary actions have touch-friendly targets, visible focus, semantic labels, and error/retry states.
- Respect reduced-motion preferences; motion never conveys essential information by itself.
- Pair color with text, icons, or patterns for rarity, HP state, and type advantage.
- Audio must respect mute/settings immediately and never block play.
- Use purposeful animation: anticipation → action → outcome; skip ornamental loops that cost attention or battery.
- A first-time player should claim a starter, build a viable team, and begin a battle without external instruction.

## 9) Content Production Rules

- Keep the Phase 1 roster at 50–80 creatures with coverage across all battle types and a healthy rarity spread; expand only with encounter, move, evolution, and collection-purpose design attached.
- Each zone needs a visual identity, a named boss, a distinct encounter promise, a clear unlock condition, and an authored reward moment.
- Each seasonal event needs a player-facing theme, an encounter change, a mission tie-in, a reward, and a start/end date.
- New content ships with deterministic domain tests, API/persistence tests where relevant, and a player-facing UI test.

## 10) Telemetry and Success Metrics

### Product metrics

- D1 retention ≥ 35%; D7 retention ≥ 15%.
- Median session length: 4–7 minutes.
- ≥ 60% of new players reach Level 5; ≥ 30% clear Zone 1.
- Weekly mission activation, completion, reward claim rate, and return rate are tracked before tuning mission targets.

### Experience diagnostics

Track onboarding funnel exits, battle losses by reason, capture/catch abandonment, Home recommended-action selection, mission category completion, social queue wait time, raid completion, trade cancel/decline, crashes, API failures, and performance by device class. Use aggregate, privacy-respecting data only.

## 11) Technical and Operational Constraints

- React/Vite/Tailwind frontend; Cloudflare Worker + D1 backend.
- Local identity is a risk; recovery codes mitigate it. A future authenticated account migration requires a separate design/security review.
- D1 hot paths require indexes and query-audit coverage.
- The initial React shell stays within the automated mobile performance budget. The Phaser world is route-deferred, has a separately enforced engine-download budget, and requires real-device network evidence before release.
- Release gate: full tests, production build, content, D1-index, GDD-coverage, monetization, performance, and Wrangler dry-run audits must pass.

## 12) Near-Term Delivery Order

1. **Phase 4 telemetry:** extend KPI snapshot with weekly-mission engagement when real production data exists; expose an internal-only dashboard after privacy review.
2. **Seasonal event v2:** author an event brief/template with beginning, mid-event goal, final reward, and QA checklist.
3. **Home intent pass:** define and test the recommended-action decision order so the Home screen reduces choice overload.
4. **Vertical-slice polish:** choose one zone from arrival to boss clear, then raise encounter readability, battle feel, reward presentation, audio, and onboarding to the quality gates below.
5. **Roster/evolution expansion:** only after the vertical slice passes, add content in coherent families with encounter and evolution stories.

## 13) AAA-Quality Verification Gate

The app is not labelled "AAA quality" by intent or a test count. It earns a release recommendation only when an independent reviewer can verify all gates below in a real build. A failed **must-pass** gate blocks the claim.

| Area | Must-pass release evidence | Quality bar |
| --- | --- | --- |
| Fun and clarity | Scripted first-session and repeat-session playtests; no critical confusion | Players can state goal, next action, and outcome without coaching |
| Combat | Deterministic tests plus manual battle playthroughs | Choices are readable, responsive, and have understandable consequences |
| Content | Roster/event/zone audit and authored vertical-slice checklist | No filler-only content; each activity has a distinct promise and payoff |
| UX/accessibility | Keyboard, touch, screen-reader smoke tests; reduced-motion/color-state review | Core flows work without precise taps, sound, or color-only cues |
| Reliability | Full release verification, API error/retry tests, migration rollback plan | No data-loss, double-reward, or stuck-progression defects |
| Performance | Production build budgets plus mid-tier mobile device/network smoke test | Fast first meaningful interaction; no gameplay-blocking jank |
| Fairness and safety | Automated monetization audit plus reviewer checklist | No pay-to-win, deceptive pressure, or accidental irreversible social action |
| Live operations | Telemetry schema/validation and event kill-switch/reversion plan | Changes are measured, reversible, and do not degrade the core loop |

### Review protocol

1. A builder submits a build, test/audit logs, known-issues list, and an explicit vertical-slice scenario.
2. An independent verifier plays that scenario on mobile and desktop, reviews the artifacts above, and scores each area **Pass / Conditional / Fail** with concrete evidence.
3. Any must-pass Fail blocks the quality claim. Conditional requires a named owner, fix, and re-review.
4. Two consecutive clean independent reviews across separate releases are required before describing a vertical slice as meeting this benchmark.

## 14) Risks

- **Content breadth over depth:** counter with vertical-slice gates before roster expansion.
- **Retention pressure:** counter with optional, bounded missions and no missed-day punishment beyond streak reset.
- **Web/device variance:** counter with performance budgets and physical-device checks.
- **Sparse production data:** counter with instrumentation before numerical tuning.
- **Quality drift:** counter with independent reviews and evidence-based release gates.
