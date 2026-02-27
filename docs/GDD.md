# Pokémon App — Game Design Document (GDD)
**Version:** 1.0  
**Platform:** Web (mobile‑first)  
**Stack:** React + Vite + Tailwind, Cloudflare Workers + D1  
**Current Features:** Home, Browse, Collection, Battle system, Maps, Team management, Items

---

## 1) Vision & Pillars
**Vision:** A fast, lightweight Pokémon collecting + battling experience designed for short, rewarding sessions on the web.

**Pillars**
1. **Short‑Session Fun** — meaningful progress in 3–5 minutes.
2. **Collection Pride** — clear milestones and rarity highlights.
3. **Strategic Battles** — accessible depth via types + team synergy.
4. **Web‑Friendly** — fast load, minimal friction, mobile‑first UI.

---

## 2) Target Audience
- Pokémon fans seeking casual collection + battles
- Web/mobile users who want quick sessions
- Strategy‑lite players who enjoy optimization and progression

---

## 3) Core Game Loop
1. **Explore Map** → encounters / nodes
2. **Battle** → win XP / coins / drops
3. **Capture** → add to collection
4. **Manage Team** → optimize roster
5. **Progress** → unlock zones, items, content

---

## 4) Progression
**Tracks**
- **Trainer Level (XP)** → unlocks zones/items/features
- **Pokédex Completion** → bonuses and milestones
- **Team Power** → gates boss content

**Beats**
- L1–5: tutorial, starters, basic battles
- L6–10: new zones + team slot unlocks
- L11–20: evolutions, rare encounters
- L21+: events, challenges

---

## 5) Combat System
- **Turn‑based** 1v1 or 3v3
- **Type effectiveness** (existing 18‑type chart)
- **Moves:** 2 basic + 1 special
- **Energy:** specials require energy from basics

**Rewards:** XP, coins, item drops, rare catch chance
**Scaling:** enemy power scales to team power

---

## 6) Economy & Items
**Currencies:**
- Coins (soft)
- Shards (rare)

**Core Items:**
- Pokéballs (capture)
- Potions / Super Potions (heal)
- Revives
- Lures (future)

**Sources:** battles, dailies, nodes, achievements
**Sinks:** items, upgrades, cosmetics

---

## 7) Content Roadmap
**Phase 1 (Now):**
- Onboarding polish
- 50–80 Pokémon
- 3 zones + boss battles
- Daily Quests + streaks

**Phase 2:**
- Seasonal events
- Challenge tower
- Leaderboards

**Phase 3:**
- PvP battles
- Co‑op raids
- Trading

---

## 8) UX / UI
**Principles:** fast, clean, mobile‑first

**Flows:**
- Capture: quick, minimal friction
- Battle: clear turn indicators
- Collection: filter/search/rarity highlights
- Team: drag/drop slots, synergy hints

**Nav:** bottom tabs (Home, Map, Browse, Collection, Team)

---

## 9) Monetization (Optional)
- Cosmetics only (trainer card, ball skins)
- Convenience boosts (extra lures, extra tasks)
- No pay‑to‑win

---

## 10) KPIs
- D1 retention ≥ 35%
- D7 retention ≥ 15%
- Session length 4–7 mins
- 60% reach Level 5
- 30% complete Zone 1

---

## 11) Risks / Constraints
- Web limitations (keep animations light)
- D1 query performance
- Content volume management
- Auth is localStorage UUID (risk of data loss)

---

## 12) Summary
Lightweight, rewarding, web‑first Pokémon experience with scalable content and clear progression.
