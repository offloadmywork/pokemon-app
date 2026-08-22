# Nintendo-Level Quality Review — Round 1

**Reviewer:** Independent verifier agent
**Verdict:** ❌ NOT ACCEPTED

## Verdict
NOT ACCEPTED. The core loop is genuinely closer to authentic Pokémon than most fan projects — a properly phased turn-based battle riding on a smoothly lerped-camera overworld shows real craft. But the experience is completely silent (zero audio or haptics anywhere), the Home hub dumps 13 undifferentiated feature panels into one vertical scroll, and the entire save is a localStorage UUID that dies with the browser profile. These are exactly the dimensions where "Nintendo-level" is decided, and they're all fixable.

## Scorecard
| Dimension | Score | Rationale |
|---|---|---|
| Game feel & core loop | 7/10 | Authentic 21-phase battle with lunges, shakes, damage floats, crits, wobble-count catches, fainted bonus catch; lerped camera overworld — but no sound and 200ms grid-step movement feels mechanical |
| Onboarding & first-time UX | 3/10 | No tutorial whatsoever; starter claim is a bare button; Starter Path panel duplicates main nav |
| UI/UX polish (incl. audio/juice) | 4/10 | Strong visual systems undermined by zero audio/haptics, emoji-as-sprites clashing with pixel tiles, 13-panel Home pile |
| Content depth | 6/10 | Impressive breadth (zones, PvP, raids, trading, shop, cosmetics, mastery, events) but mostly thin stacked panels |
| Technical quality | 6/10 | 812 tests with real coverage, clean game-module separation; but localStorage-UUID auth, raw error.message leaks, side effects inside state updaters |
| Performance & accessibility | 4/10 | ~99KB gzip excellent; only ~51 aria attributes app-wide, zero prefers-reduced-motion despite strobing flashes/shakes |
| Retention/live-ops coherence | 6/10 | Dailies/weekly/streaks/events genuinely wired into gameplay — but everything funnels through the unreadable Home wall |

## Top Issues
1. [critical] Zero audio and haptics
2. [critical] Home is a 13-panel feature dump — no hierarchy/tabs/progressive disclosure
3. [major] Save = localStorage UUID; recovery code IS the UUID
4. [major] No onboarding/tutorial flow
5. [major] "Team" tab silently redirects to Collection
6. [major] No prefers-reduced-motion support (strobing flashes, shakes)
7. [major] Sparse accessibility (~51 aria attributes app-wide)
8. [major] Junk artifact committed: src/pages/Collection.jsx-e
9. [minor] Side effects inside setPlayerPos state updater (StrictMode double-roll risk)
10. [minor] Battle intro effect lacks unmount cleanup
11. [minor] Worker leaks raw error.message in 500s
12. [minor] Mixed art direction (pixel tiles vs emoji vs hosted art)
13. [minor] Movement feel stiff (fixed 200ms cooldown, no buffered input)

## What's Already Good (protect these)
- Battle phase machine architecture (intro/switch/faint/run/catch sequencing)
- Overworld presentation (rAF camera lerp, directional walk sprites, ambient tile animation, minimap)
- src/game/* pure logic modules with colocated tests
- Worker API validation discipline
- Live-ops plumbing genuinely hooks gameplay events

---

# Quality Epic Plan (derived)

## E1 — Sound & Juice [critical]
- [ ] E1.1 WebAudio SFX engine module (`src/game/audio.js`) with mute toggle, lazy init on first interaction
- [ ] E1.2 Hook SFX: hit, super-effective, crit, ball throw/wobble/catch click/fail, level-up jingle, faint, UI taps
- [ ] E1.3 Haptics via navigator.vibrate on crits/catches (mobile)
- [ ] E1.4 Tests for audio settings persistence + mute behavior

## E2 — Home & Navigation IA [critical]
- [x] E2.1 Reorganize Home into tabbed hub (Play / Social / Shop / Profile) with progressive disclosure
- [x] E2.2 Real Team page as its own destination (team management moves out of Collection)
- [ ] E2.3 Visual hierarchy pass: featured content vs utility panels

## E3 — Onboarding Tutorial [major]
- [ ] E3.1 First-run guided flow: claim starter → move → encounter → weaken → catch → heal
- [ ] E3.2 Contextual tips (type advantage hints already partially exist in PvP)
- [ ] E3.3 Skip/replay support + persistence of tutorial completion

## E4 — Save Safety / Accounts [major]
- [ ] E4.1 Server-side session continuity beyond localStorage UUID (passcode-based recovery distinct from user id)
- [ ] E4.2 Cross-device restore flow using recovery codes
- [ ] E4.3 Data-loss warning UX for at-risk saves

## E5 — Accessibility & Motion [major]
- [x] E5.1 prefers-reduced-motion media query disabling flashes/shakes/confetti
- [ ] E5.2 Aria labels/alt text sweep across interactive elements + battle viewport text alternative
- [ ] E5.3 Focus management in overlays/modals

## E6 — Technical Hygiene [minor]
- [x] E6.1 Remove committed junk artifact Collection.jsx-e
- [x] E6.2 Move encounter roll out of setState updater; guard battle intro async chain against unmount
- [x] E6.3 Centralized worker error handler; scrub internal error messages from 500s
- [ ] E6.4 Art direction audit: replace emoji sprites with consistent pixel assets
- [ ] E6.5 Movement feel: buffered input + held-key acceleration

## Verification loop
After each epic: re-run verifier with prior report as baseline. Game is done when verdict = NINTENDO LEVEL.
