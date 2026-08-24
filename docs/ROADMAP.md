# Pokemon App — Roadmap / Status

## Current Phase
- **Phase:** Phase 4 — Live Ops and Retention (GDD v1.1 defined; quality-gate review in progress)
- **Focus:** Weekly Missions slice

## Current Feature: Daily Quests
### Implemented
- API: `GET /api/daily-quests` (auto-generates daily quests for the user/date)
- API: `POST /api/daily-quests/:id/progress` (increment progress)
- API: `POST /api/daily-quests/:id/claim` (claim rewards)
- UI: `DailyQuestsPanel` on Home
- ViewModel: `DailyQuestsViewModel`
- Tests: API + ViewModel + UI component coverage

### Next
- Wire quest progress updates to gameplay events (battles, captures, etc.)
  - ✅ Captures now increment `catch-1` if today's quests already exist
  - ✅ Item usage now increments `use-item`
  - ✅ Battle wins now increment `battle-1`
- Add **streaks** (daily claim streak + bonus rewards)
  - ✅ Domain rules added in `src/game/dailyQuestStreak.js`
  - ✅ BDD tests cover increment, missed-day reset, and 3/7/14-day bonuses
  - ✅ D1 streak persistence migration added
  - ✅ Claim/claim-all API applies streaks once all daily quests are claimed and grants bonus items
  - ✅ Home daily quests UI surfaces streak status and bonus feedback after claim
- Add quest variety + scaling by trainer level
  - ✅ Shared daily quest template generator scales catch/battle/item targets by trainer level
  - ✅ Gameplay event progress maps to scaled daily quest template keys
  - ✅ Worker daily quest generation uses saved trainer level for new daily quest sets
  - ✅ Added heal-team daily quest category for level 2+ trainers
  - ✅ Team heal endpoint progresses `heal-team` quests
  - ✅ Added rare-catch daily quest category for level 3+ trainers
  - ✅ Catch endpoint progresses `rare-catch` quests for Rare/Epic/Legendary Pokémon
  - ✅ Added evolution daily quest category for level 3+ trainers
  - ✅ Evolution endpoint progresses `evolve-pokemon` quests after successful evolution
  - ✅ Added challenge tower daily quest category for level 4+ trainers
  - ✅ Tower completion endpoint progresses `tower-floor` quests after successful floor clears
  - ✅ Daily quest generation now selects a balanced daily subset for higher-level trainers
  - ✅ Home daily quests UI previews today's advanced quest, tomorrow's rotation, and next level unlock
  - ✅ Daily Quests Phase 1 slice complete

## Current Feature: Onboarding Polish
### Implemented
- ✅ Home starter path panel gives new players direct actions for first catch and team setup
- ✅ Home starter path detects empty collections and lets first-run players claim starters
- ✅ Home starter path shows a battle handoff once starters are ready
- ✅ Collection no longer auto-claims starters on page load; empty collections use an explicit starter claim action
- ✅ Collection starter claim uses inline success feedback instead of a blocking alert
- ✅ Collection starter claim shows a battle-ready handoff after starters join the team
- ✅ Onboarding async tests no longer emit React `act(...)` warnings for Collection, Browse, or Evolution flows
- ✅ BattleScreen catch-success XP styling no longer emits a duplicate JSX `style` warning
- ✅ Refreshed Browserslist database so builds no longer emit stale `caniuse-lite` warnings

### Next
- Phase 1 onboarding polish complete for now

## Current Feature: Zone Boss Signals
### Implemented
- ✅ First three Phase 1 maps expose named boss POIs in map metadata
- ✅ Browse minimap legend renders a Boss marker using the existing POI marker system
- ✅ Boss POIs can start named boss battles from the minimap when the player has a living team
- ✅ Boss victories record zone clears, grant bonus XP, and show clear feedback
- ✅ Boss clear progression persists through API/D1
- ✅ Browse and Home surface cleared boss progression state

### Next
- Zone boss signals complete for now

## Current Feature: Pokémon Roster Coverage
### Implemented
- ✅ Added repeatable roster audit helper for checked-in D1 seed data
- ✅ Audit result: `seed-data.sql` currently has 20 Pokémon, 30 short of the Phase 1 minimum of 50
- ✅ BDD coverage tracks roster audit status and Phase 1 target range (50-80 Pokémon)
- ✅ Expanded `seed-data.sql` to 50 Pokémon and verified it loads against `schema.sql`

### Next
- Phase 1 complete for now

## Current Feature: Seasonal Events
### Implemented
- ✅ Added seasonal event domain rules with an active Summer Splash event window
- ✅ Added encounter bonus rules for boosted event types
- ✅ BDD coverage verifies active/inactive event dates and boosted encounter bonuses
- ✅ Home and Browse now surface the active seasonal event and boosted types
- ✅ Seasonal catch-rate and XP bonuses now apply inside BattleScreen catch/reward flow
- ✅ Event-specific encounter weighting now requests boosted Water/Ice random encounters during Summer Splash

### Next
- Seasonal events complete for now

## Current Feature: Challenge Tower
### Implemented
- ✅ Tower domain scaling and D1/API progress exist
- ✅ Home panel loads tower state, shows current floor, and can complete a floor
- ✅ BDD component coverage verifies completing a floor advances to the next floor and marks cleared progress

### Next
- Challenge Tower polish complete for now

## Current Feature: Leaderboards
### Implemented
- ✅ Level, caught, and tower leaderboard API slices exist behind the feature flag
- ✅ Leaderboards page ranks level entries by level and XP
- ✅ BDD coverage verifies switching to Tower rankings loads best-floor data and exposes active tab state
- ✅ Score-only leaderboard entries now render clean fallback details instead of undefined metadata

### Next
- Phase 2 GDD feature polish complete for now

## Current Feature: PvP Battles
### Implemented
- ✅ Pure PvP matchmaking rules calculate living team power
- ✅ PvP queue eligibility requires at least one living team member
- ✅ Matchmaking selects the closest fair opponent within the configured power range
- ✅ API client can join/leave the PvP queue with calculated living team power
- ✅ Worker-side PvP queue persistence can upsert, find fair opponents, and remove queued users
- ✅ D1 schema/migration added for `pvp_queue`
- ✅ Worker API routes can join the queue, return fair matches, keep unmatched players queued, and leave the queue
- ✅ Pure PvP battle result rules resolve win, loss, draw, and in-progress states from team HP
- ✅ Worker-side PvP match result persistence records wins/losses/draws
- ✅ D1 schema/migration added for `pvp_matches`
- ✅ Worker API endpoint submits completed PvP match results and persists the outcome
- ✅ API client can submit PvP match results for the current user
- ✅ PvP ViewModel orchestrates queue status, fair matches, queue exit, and match-result submission
- ✅ Home surfaces a PvP Arena panel wired to the PvP ViewModel queue flow
- ✅ Matched PvP panel can record win/loss/draw outcomes through the ViewModel submit path
- ✅ PvP matchmaking responses include opponent team context for richer battle handoff
- ✅ PvP Battle ViewModel uses both teams to resolve battle completion before result submission
- ✅ PvP Arena panel uses the PvP Battle ViewModel for attack, completion, and result submission
- ✅ PvP turns now support opponent retaliation and a visible turn log
- ✅ PvP battles now log fainted Pokémon and hand off to the next living teammate
- ✅ PvP battles now support manual switching to living bench Pokémon
- ✅ PvP Arena shows recent match history from recorded battle results
- ✅ PvP Arena summarizes recent win/loss/draw records
- ✅ PvP result feedback normalizes worker-shaped match responses
- ✅ PvP battle state resets after recorded results for cleaner rematch flow
- ✅ PvP queue/search errors show a clear retry affordance
- ✅ PvP Arena encourages first-time players when match history is empty
- ✅ Recent PvP match history entries show completed timestamps
- ✅ Recent PvP match history entries use visual outcome badges
- ✅ Recent PvP match history uses friendly fallback labels for unknown opponents
- ✅ PvP queued state gives waiting guidance while matchmaking
- ✅ PvP matched battles show opening guidance before the first attack
- ✅ PvP matched battles show active player and opponent HP
- ✅ PvP matched battle HP readouts warn when active Pokemon are low
- ✅ PvP completed battles show guidance before result submission
- ✅ PvP recorded results show rematch guidance
- ✅ PvP switch choices show bench Pokemon HP before switching
- ✅ PvP switch choices warn when bench Pokemon are low on HP
- ✅ PvP matched battles preview the opponent team with HP
- ✅ PvP opponent team preview warns when Pokemon are low on HP
- ✅ PvP opponent team preview marks fainted Pokemon
- ✅ PvP matched battles preview the player team with HP
- ✅ PvP matched team previews mark the active Pokemon
- ✅ PvP battles support forfeiting an in-progress match as a recorded loss
- ✅ PvP battles show the current turn number during matched fights
- ✅ PvP basic attacks build energy for special attacks
- ✅ PvP battles support a Guard basic move that builds energy and reduces retaliation
- ✅ PvP battle damage applies type effectiveness and shows effectiveness feedback in the turn log
- ✅ PvP matched player team preview shows a type coverage synergy hint
- ✅ PvP opening matchup suggests type-advantaged bench switches
- ✅ PvP matched battles label basic and special move roles
- ✅ PvP completed match responses include deterministic XP and coin rewards
- ✅ PvP XP rewards persist to player progress after completed matches
- ✅ PvP coin rewards persist to a player wallet after completed matches
- ✅ Player wallet can be fetched via API/client and PvP result feedback shows updated coin balance
- ✅ PvP Arena loads and displays the current wallet coin balance before matchmaking
- ✅ Leaderboards include a PvP wins tab sourced from recorded PvP matches
- ✅ PvP leaderboard entries show full win/loss/draw records
- ✅ PvP Arena can route players directly to PvP rankings

### Next
- PvP battle slice complete for now

## Current Feature: Co-op Raids
### Implemented
- ✅ Pure co-op raid domain rules calculate living-team raid power
- ✅ Raid start eligibility requires at least two trainers with living Pokémon
- ✅ Raid boss configuration scales HP, power, XP, and coin rewards by level
- ✅ Raid attempts resolve in-progress vs victory states and grant rewards to eligible participants
- ✅ D1 schema/migration added for co-op raid rooms and participants
- ✅ Worker API can create co-op raid rooms with the host participant
- ✅ Worker API can join a second trainer and mark raids ready
- ✅ API client can create and join co-op raids with living-team power
- ✅ Co-op Raid ViewModel orchestrates room creation, joining, participant summaries, ready state, and errors
- ✅ Home surfaces a Co-op Raid panel wired to the ViewModel for hosting, joining, readiness, and error feedback
- ✅ Worker API can record ready co-op raid attack attempts, persist boss HP/status, and return victory reward payloads
- ✅ API client can submit co-op raid attack attempts for the current user
- ✅ Co-op Raid ViewModel and panel can submit ready-room attacks, update boss HP, and show shared victory rewards
- ✅ Co-op raid victory rewards persist XP and wallet coins for each eligible participant
- ✅ Co-op raid completion UI surfaces persisted XP/level and coin balances from the Worker response

### Next
- Co-op raids slice complete for now

## Current Feature: Trading
### Implemented
- ✅ Pure trading domain rules validate offer eligibility and caught Pokemon ownership
- ✅ Accepted trade resolution swaps caught Pokemon ownership between trainers without changing Pokemon details
- ✅ D1 schema/migration added for persisted trade offers
- ✅ Worker persistence can create pending trade offers and accept trades by swapping caught Pokemon ownership
- ✅ Worker API and client can create and accept trade offers for the current user
- ✅ Trading ViewModel orchestrates offer creation, acceptance, validation errors, and completed trade feedback
- ✅ Home surfaces a Trading panel for selecting owned Pokemon, creating offers, accepting trades, and showing completion feedback
- ✅ Trading panel lists pending incoming/outgoing offers and can accept incoming offers without manually entering trade IDs

### Next
- Trading slice complete for now; revisit for cancel/decline polish after broader Phase 3 review

## Current Feature: Phase 3 Completion Audit
### Implemented
- ✅ Repeatable GDD roadmap audit extracts Phase 3 features from `docs/GDD.md`
- ✅ Audit verifies PvP battles, co-op raids, and trading each have roadmap sections marked complete for now
- ✅ Checked-in Phase 3 roadmap audit currently reports complete

### Next
- Review the next GDD expansion or define the next post-Phase-3 slice before starting new feature work

## Post-Phase-3 Backlog
### Priority
1. Mobile navigation polish
   - GDD calls for bottom tabs across Home, Map, Browse, Collection, and Team flows
   - ✅ Primary app destinations are reachable from a mobile-friendly navigation shell
   - ✅ The routed page outlet reserves nav-height plus safe-area space above the fixed bottom tabs
2. Economy sinks and rewards
   - GDD economy notes still list future lures, upgrades, cosmetics, and achievement-driven sources
   - ✅ Pure reward and shop sink rules exist before UI purchase flows
   - ✅ Shop purchases persist wallet spend and inventory gains through the Worker API
   - ✅ Home surfaces a player-facing Trainer Shop using the persisted purchase API
   - ✅ Pure permanent trainer upgrade sink rules exist before upgrade persistence/UI
   - ✅ Trainer upgrade purchases persist wallet spend and upgrade levels through the Worker API
   - ✅ Home surfaces a player-facing Trainer Upgrades panel using the persisted upgrade API
   - ✅ Daily Task Slot upgrades expand generated daily quest count with extra rotating advanced quests
   - ✅ Lure Slot upgrades extend activated lure duration for longer boosted routes
3. Social polish
   - PvP, co-op raids, and trading now exist as core Phase 3 slices
   - Start by tightening player-facing social affordances such as invite/copy codes, trade cancel/decline, and shareable room feedback
   - ✅ Trading offers can be cancelled by the creator or declined by the invited trainer
   - ✅ Co-op raid rooms show shareable invite codes with copy feedback
   - ✅ Outgoing trade offers show shareable trade codes with copy feedback
4. Lures and cosmetics
   - GDD economy notes list lures as future core items and cosmetics as optional monetization
   - Start with pure lure boost rules before persistence/UI, then revisit cosmetic trainer-card or ball-skin sinks
5. Achievement milestones
   - GDD progression calls for Pokédex completion bonuses and achievement-driven reward sources
   - Start with pure collection milestone rules before persistence/UI
6. Web performance guardrails
   - GDD risks call for keeping web animations light for short mobile sessions
   - ✅ Repeatable web performance audit blocks heavyweight animation/rendering dependencies
   - ✅ Checked-in source stays within the infinite-animation budget per file
   - ✅ Built asset gzip budgets keep JavaScript, CSS, and total payloads inside mobile-friendly limits
7. Monetization fairness guardrails
   - GDD monetization notes allow cosmetics and convenience boosts only, with no pay-to-win
   - ✅ Repeatable monetization fairness audit blocks combat-power upgrades
   - ✅ Cosmetic slots stay visual-only and lure boosts avoid catch-rate or XP advantages
8. GDD coverage audit
   - Confirm every major GDD group has a complete roadmap marker before new expansion work
   - ✅ Checked-in roadmap currently covers every major GDD group
9. Collection discovery polish
   - GDD calls for Collection filter/search/rarity highlights
   - ✅ Collection browsing supports search, type filters, rarity filters, and visible result counts
10. Next GDD expansion brief
    - Define the first post-Phase-3 expansion candidate before starting new feature branches
    - ✅ Phase 4 candidate: Live Ops and Retention
11. Release readiness automation
    - Keep automatic deployment gated by the verified test/build/audit/dry-run chain
    - ✅ Package release verification chains the mandatory checks before deployment
    - ✅ Tracked pre-push hook runs release verification before automatic deployment
    - ✅ Local Git hooks path is configured to use the tracked release hook directory
    - ✅ GitHub CI runs release verification before the production deploy job
    - ✅ GitHub CI production deploy depends on the release verification job
    - ✅ GitHub CI production deploy is limited to the main branch
    - ✅ GitHub CI production deploy requires the Cloudflare token and account secrets
    - ✅ GitHub CI production deploy uses the minified Worker deploy command

### Next
- Next slice: Next GDD Expansion Brief is complete for now; turn Phase 4 into a detailed GDD v1.1 after product direction is confirmed.

## Current Feature: Team Management Polish
### Implemented
- GDD calls for Team drag/drop slots and synergy hints.
- ✅ Team synergy hints surface type coverage in Collection
- ✅ Reorder controls let trainers move team members between battle slots

### Next
- Team management polish slice complete for now; review the next GDD expansion or define a new post-Phase-3 slice.

## Current Feature: Collection Discovery Polish
### Implemented
- GDD calls for Collection filter/search/rarity highlights.
- ✅ Collection ViewModel filters by search text, type, and rarity
- ✅ Collection page surfaces search, type, and rarity controls with visible result counts
- ✅ Collection cards show rarity badges alongside existing team state

### Next
- Collection discovery polish slice complete for now; review the next GDD expansion or define a new post-Phase-3 slice.

## Current Feature: Trainer Recovery Code
### Implemented
- GDD risk: Auth is localStorage UUID with data-loss risk.
- ✅ API client exposes the current trainer identity as a recovery code
- ✅ Home surfaces a trainer recovery code panel with copy feedback

### Next
- Trainer recovery code slice complete for now; review import/restore flow if account recovery becomes a priority.

## Current Feature: D1 Query Performance
### Implemented
- GDD risk: D1 query performance.
- ✅ Repeatable D1 query index audit covers hot daily quest, PvP, co-op raid, and trading read paths
- ✅ Pending trade offer lists use composite status/user indexes for incoming and outgoing reads
- ✅ Trade offer listing uses separate indexed incoming/outgoing queries instead of a broad pending-offer OR scan

### Next
- D1 query performance slice complete for now; extend the audit as new hot Worker read paths are added.

## Current Feature: KPI Metrics Snapshot
### Implemented
- GDD KPIs: D1 retention, D7 retention, session length, Level 5 reach, and Zone 1 completion.
- ✅ Pure KPI snapshot rules calculate target progress before dashboard/API wiring
- ✅ Retention metrics evaluate eligible cohorts against D1 and D7 activity targets
- ✅ Session length, Level 5 reach, and Zone 1 completion metrics report rates and target status
- ✅ Player session samples persist for session-length KPI tracking
- ✅ Worker KPI endpoint reads persisted user, progress, boss clear, and session rows

### Next
- KPI Metrics Snapshot slice complete for now; add an internal dashboard view after production KPI data is available.

## Current Feature: Content Volume Management
### Implemented
- GDD risk: Content volume management.
- ✅ Repeatable content volume audit checks roster count, type coverage, and rarity spread
- ✅ Checked-in seed content stays inside the Phase 1 50-80 Pokemon range
- ✅ Seed content covers every battle type with at least four Pokemon per type
- ✅ Seed content keeps Common, Uncommon, Rare, Epic, and Legendary rarity spread above minimum guardrails

### Next
- Content Volume Management slice complete for now; extend the audit when new content categories need volume guardrails.

## Current Feature: Web Performance Guardrails
### Implemented
- GDD risk: Web limitations require light animations and fast mobile sessions.
- ✅ Repeatable web performance audit blocks heavyweight animation/rendering dependencies
- ✅ Checked-in source stays within the infinite-animation budget per file
- ✅ Web performance guardrail can run as a standalone script for CI or release checks
- ✅ Built asset gzip budgets keep JavaScript, CSS, and total payloads inside mobile-friendly limits
- ✅ Current built assets are on-target at 109,647 gzip bytes against the 143,360-byte total budget

### Next
- Web Performance Guardrails slice complete for now; tighten budgets if production payloads grow or split routes.

## Current Feature: Monetization Fairness Guardrails
### Implemented
- GDD monetization guardrail: cosmetics and convenience boosts only, no pay-to-win.
- ✅ Repeatable monetization fairness audit blocks combat-power upgrades
- ✅ Cosmetic slots stay visual-only and reject combat-advantage copy
- ✅ Lure convenience boosts avoid catch-rate or XP advantages
- ✅ Current checked-in upgrades, cosmetics, and lures pass the no-pay-to-win audit

### Next
- Monetization Fairness Guardrails slice complete for now; extend the audit if new premium surfaces are added.

## Current Feature: GDD Coverage Audit
### Implemented
- Repeatable GDD coverage audit checks Phase 1, Phase 2, Phase 3, UX, economy/monetization, KPI, and risk markers.
- ✅ Checked-in roadmap currently covers every major GDD group
- ✅ Coverage audit can run as a standalone script before new expansion work

### Next
- GDD Coverage Audit slice complete for now; use it when defining the next roadmap expansion.

## Current Feature: Mobile Navigation Polish
### Implemented
- ✅ App shell exposes a fixed primary bottom tab bar for Home, Map, Collection, Team, and Rankings destinations
- ✅ BDD coverage verifies primary destinations remain reachable from the mobile navigation shell
- ✅ Bottom navigation reserves mobile safe-area space and keeps tab buttons at touch-friendly height
- ✅ Routed page content reserves nav-height plus safe-area space to avoid bottom-tab overlap

### Next
- Mobile navigation polish complete for now

## Current Feature: Economy Sinks and Rewards
### Implemented
- ✅ Pure economy rewards scale coins/shards for battle wins, daily bonuses, and achievements
- ✅ Core consumable shop catalog defines coin costs for Pokeballs, potions, and revives
- ✅ Pure shop purchase preview/apply rules spend wallet coins, increment inventory, and reject invalid or unaffordable purchases without mutating inputs
- ✅ Worker shop purchase API persists wallet coin spend and inventory quantity updates
- ✅ API client exposes a current-user shop purchase method for future UI flows
- ✅ Shop ViewModel loads wallet, inventory, and catalog state for browser-free testing
- ✅ Home surfaces a Trainer Shop panel that buys consumables and updates wallet/inventory feedback
- ✅ Pure trainer upgrade catalog defines escalating coin costs for bag slots, lure slots, and daily task slots
- ✅ Pure upgrade purchase preview/apply rules spend wallet coins, increase upgrade level, reject maxed/invalid/unaffordable upgrades, and avoid mutating inputs
- ✅ D1 schema/migration added for persisted trainer upgrade levels
- ✅ Worker upgrade API can list current upgrade levels and persist wallet-spending upgrade purchases
- ✅ API client exposes current-user upgrade list and purchase methods
- ✅ Upgrade ViewModel loads wallet, upgrade levels, and upgrade catalog state for browser-free testing
- ✅ Home surfaces a Trainer Upgrades panel that buys permanent upgrades and updates wallet/level feedback

### Next
- Economy sinks and rewards slice complete for now; revisit cosmetics/lures after social polish

## Current Feature: Social Polish
### Implemented
- ✅ Worker trade API lets creators cancel pending outgoing offers and invited trainers decline pending incoming offers
- ✅ API client exposes cancel/decline trade methods for current-user social actions
- ✅ Trading ViewModel stores cancel/decline feedback and preserves pending lists on action errors
- ✅ Trading Post UI surfaces Cancel and Decline actions in pending offer lists and refreshes after successful actions
- ✅ Trading Post UI surfaces copyable trade codes for outgoing offers with copied feedback
- ✅ Co-op Raid ViewModel exposes shareable room invite summaries after hosting/joining
- ✅ Co-op Raid UI surfaces invite code, helper copy, Copy Invite action, and copied feedback

### Next
- Social polish slice complete for now

## Current Feature: Lures and Cosmetics
### Implemented
- Planned from the GDD post-Phase-3 economy notes: lures, cosmetics, and optional convenience boosts.
- ✅ Basic and Water lure item definitions exist with encounter duration and boost metadata
- ✅ Pure lure rules can load lure effects by item id, boost encounter activity, and deterministically select boosted encounter types
- ✅ Browse loads lure inventory, consumes selected lures, shows active lure encounter counts, and applies boosted lure types to random encounters
- ✅ Active lure duration persists locally across Browse sessions and decrements after boosted encounters
- ✅ Pure cosmetic sink rules define trainer-card and ball-skin catalog entries, preview wallet spend, add owned cosmetics, and reject duplicates/unaffordable purchases
- ✅ Cosmetic ownership and purchases persist through D1/Worker APIs and current-user client methods
- ✅ Home surfaces a player-facing Trainer Cosmetics panel for browsing owned cosmetics, buying new sinks, and showing wallet feedback
- ✅ Owned cosmetics can be equipped through a persisted Worker route, client method, ViewModel action, and Home panel feedback
- ✅ Home reflects equipped trainer-card cosmetics with a visible Trainer Card preview and bronze frame state
- ✅ Browse battle encounters reflect equipped ball-skin cosmetics in capture buttons, throws, and wobble presentation

### Next
- Lures and cosmetics slice complete for now; revisit after broader post-Phase-3 polish review.

## Current Feature: Convenience Boosts
### Implemented
- ✅ Daily Task Slot upgrades now add bonus rotating advanced daily quests during daily quest generation
- ✅ Lure Slot upgrades now extend activated lure duration in Browse

### Next
- Review the next GDD expansion or define a new post-Phase-3 slice.

## Current Feature: Achievement Milestones
### Implemented
- Planned from the GDD progression and economy notes: Pokédex completion bonuses, collection pride milestones, and achievement reward sources.
- ✅ Pure collection achievement milestone rules exist before persistence/UI
- ✅ Claimed achievement persistence and wallet rewards are wired through D1/Worker APIs
- ✅ API client exposes current-user achievement listing and claim methods
- ✅ Home surfaces a player-facing Achievements panel for collection milestones and claim feedback

### Next
- Achievement milestones slice complete for now; review the next GDD expansion or define a new post-Phase-3 slice.

## Current Feature: Next GDD Expansion Brief
### Implemented
- Phase 4 candidate: Live Ops and Retention.
- ✅ Weekly missions and event rotations build on daily quests, streaks, and seasonal events
- ✅ Collection mastery tiers extend achievements without adding pay-to-win power
- ✅ Release-readiness guardrails stay mandatory before any automatic deployment

### Next
- ✅ Detailed Phase 4 GDD v1.1 now defines the live-ops loop, delivery order, and evidence-based quality gates.
- Next: close the independent quality-gate findings, then select the first vertical-slice polish target.

## Current Feature: Release Readiness Automation
### Implemented
- Release readiness audit requires tests, build, content volume, D1 index, GDD coverage, monetization fairness, web performance, and Worker dry-run checks.
- ✅ `verify:release` package script chains the mandatory checks before deployment
- ✅ Repeatable release readiness audit verifies the package script does not skip required guardrails
- ✅ Package release verification chains the mandatory checks before deployment
- ✅ Tracked pre-push hook runs release verification before automatic deployment
- ✅ `hooks:install` points local Git hooks at the tracked release hook directory
- ✅ Local Git hooks path is configured to use the tracked release hook directory
- ✅ GitHub CI runs release verification before the production deploy job
- ✅ GitHub CI production deploy depends on the release verification job
- ✅ GitHub CI production deploy is limited to the main branch
- ✅ GitHub CI production deploy requires the Cloudflare token and account secrets
- ✅ GitHub CI production deploy uses the minified Worker deploy command

### Next
- Release Readiness Automation slice complete for now; keep this chain updated as new release guardrails are added.

## Current Feature: Collection Mastery Tiers (Phase 4 Live Ops)
### Implemented
- ✅ Pure mastery tier rules with Bronze base tier and claimable Silver/Gold/Master milestones (`src/game/collectionMastery.js`)
- ✅ Tier resolution reports current tier, next tier, and progress-to-next
- ✅ Unclaimed reward evaluation pays one-time currency-only rewards (no combat power)
- ✅ BDD coverage: 9 domain tests including fairness (no attack/power rewards) and immutability
- ✅ Worker API: GET `/api/mastery` (tier status + unclaimed rewards), POST `/api/mastery/claim` (one-time claim persisted in `user_achievements` as `mastery_<tier>` with wallet rewards)
- ✅ API client exposes mastery status/claim methods
- ✅ BDD coverage: 3 Worker route tests (status, claim-once, unreached rejection)
- ✅ CollectionMasteryViewModel with load, claim, and claimable detection (5 BDD tests)
- ✅ Home surfaces a Collection Mastery panel with tier list, caught count, claim buttons, and reward/error feedback (4 BDD tests)

### Next
- Collection Mastery slice complete for now; review next Live Ops item after production feedback

## Notes
- Keep implementation BDD-first: add a scenario/test for each new quest type / streak rule.

## Current Feature: Weekly Missions (Phase 4 Live Ops)
### Implemented
- ✅ Pure weekly mission domain rules with ISO week keys (`src/game/weeklyMissions.js`)
- ✅ Level-scaled core missions: catches, battle wins, daily quest sets completed
- ✅ Advanced mission rotation unlocks by level: rare catches, evolutions, tower floors, co-op raid victories
- ✅ Non-mutating progress application clamped at mission targets
- ✅ Reward resolution pays each mission once and grants a one-time weekly completion chest (ultra balls + coins)
- ✅ BDD coverage: 17 domain tests + 3 Worker API route tests
- ✅ D1 schema/migration added for `weekly_missions` (0019)
- ✅ Worker API: GET `/api/weekly-missions` (auto-generates the current week), POST `/api/weekly-missions/progress`, POST `/api/weekly-missions/claim-all` (XP + wallet coins + chest item)
- ✅ API client exposes weekly mission list/progress/claim methods
- ✅ WeeklyMissionsViewModel with load, claim-all, and claimable-rewards state (5 BDD tests)
- ✅ Home surfaces a Weekly Missions panel with week label, progress bars, claim button, and chest feedback (4 BDD tests)
- ✅ Gameplay event wiring (best-effort): catches, rare catches, PvP wins, evolutions, tower floors, co-op raid victories, and fully claimed daily quest days
- ✅ Week-boundary verification: new weeks reset progress, advanced rotation cycles deterministically, core missions stay constant, ISO Sunday/Monday boundaries verified
- ✅ Worker generation scoped to a single week key with fresh progress

### Next
- Extend KPI snapshot with weekly mission engagement once production data exists
- Close the Phase 4 quality-gate findings: server-bound identity/integrity, E2E/accessibility coverage, production observability, and an authored vertical slice.

## Current Feature: Phaser Playable-World Vertical Slice
### Implemented
- ✅ Phaser is route-deferred behind the new World tab, preserving the small initial mobile shell.
- ✅ Verdant Path provides an original handcrafted exploration scene with keyboard movement, camera follow, collision, a bridge route choice, authored encounter glades, landmarks, and deterministic world-rule tests.
- ✅ Performance audit now distinguishes the initial shell from the intentional deferred game-engine download, with individual and total package budgets.
- ✅ A Verdant Path encounter now hands off exactly once into the existing server-rolled battle and capture flow, with BDD coverage for the complete transition.

### Next
- Add touch controls and accessible alternative input, replace primitive generated art with original production assets, and run desktop/mobile playthrough reviews.
