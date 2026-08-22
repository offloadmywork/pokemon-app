import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { pokemonAPI } from "@/api/client";
import { Button } from "@/components/ui/button";
import DPad from "@/components/DPad";
import BattleScreen from "@/components/BattleScreen";
import { getMap, isWalkable, isGrass, isHealingSpot } from "@/game/maps";
import { loadTeam, saveTeam, healTeam, isTeamAlive } from "@/game/team";
import { loadProgress, saveProgress } from "@/game/progress";
import { incrementDailyQuestsForEvent } from "@/game/dailyQuestProgress";
import { getBossClearKey, loadBossClears, recordBossClear } from "@/game/bossProgress";
import { getActiveSeasonalEvent, selectSeasonalEncounterType } from "@/game/seasonalEvents";
import { getItemById } from "@/game/items";
import { playSfx } from "@/game/audio";
import { applyLureDurationBonus, getLureByItemId, selectLureEncounterType } from "@/game/lures";
import { getCosmetic } from "@/game/cosmetics";
import playerSprite from "@/assets/player-spritesheet.svg";
import { Cloud, Flame, Gem, Heart, Home, Map, Mountain, PartyPopper, Sparkles, Star, TreePine, Trophy, Frown } from "lucide-react";
import grassTile from "@/assets/tiles/grass.svg";
import treeTile from "@/assets/tiles/tree.svg";
import waterTile from "@/assets/tiles/water.svg";
import rockTile from "@/assets/tiles/rock.svg";
import healTile from "@/assets/tiles/heal.svg";
import portalTile from "@/assets/tiles/portal.svg";
import poiTower from "@/assets/poi/tower.svg";
import poiQuest from "@/assets/poi/quest.svg";
import poiRare from "@/assets/poi/rare.svg";
import tileSprite from "@/assets/tileset.svg";
import TutorialCoach from "@/components/TutorialCoach";
import {
  CATCH_RATES, TOTAL_POKEMON, STORAGE_KEY, LEVEL_CONFIG,
  XP_REWARDS, RARITY_WEIGHTS, rollRarity,
  getLevelFromXP, getLevelConfig, getNextLevelXP,
  getPokemonImage, typeEmojis, rarityConfig,
} from "@/game/constants";

// ═══════════════════════════════════════════
// TILE SIZE & VIEWPORT
// ═══════════════════════════════════════════
const TILE = 48;
const VIEW_COLS = 9;
const VIEW_ROWS = 7;
const VIEWPORT_W = VIEW_COLS * TILE;  // 432
const VIEWPORT_H = VIEW_ROWS * TILE;  // 336
const MOVE_COOLDOWN = 200; // ms
const ACTIVE_LURE_KEY = 'pokemon-active-lure';

// Direction offsets
const DIR_DELTA = {
  up:    { dx: 0, dy: -1 },
  down:  { dx: 0, dy: 1 },
  left:  { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// Player sprite sheet layout (2 columns x 4 rows)
const SPRITE_COLS = 2;
const SPRITE_ROWS = 4;

// Tile sprite sheet layout (7 columns x 1 row)
const TILESET_COLS = 7;
const TILE_INDEX = {
  path: 0,
  grass: 1,
  tree: 2,
  water: 3,
  rock: 4,
  heal: 5,
  portal: 6,
};
const SPRITE_ROW_BY_DIR = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};

// ═══════════════════════════════════════════
// MINIMAP + POI CONFIG
// ═══════════════════════════════════════════
const MINIMAP_TILE = 6;
const POI_MARKERS = {
  tower: { shape: 'square', color: '#f59e0b', label: 'Tower' },
  quest: { shape: 'triangle', color: '#ef4444', label: 'Quest' },
  rare: { shape: 'diamond', color: '#22c55e', label: 'Rare' },
  boss: { shape: 'circle', color: '#f43f5e', label: 'Boss' },
};

const getPoiMarkerStyle = (type, size = 6) => {
  const marker = POI_MARKERS[type];
  if (!marker) return {};
  const style = {
    width: size,
    height: size,
    background: marker.color,
    boxShadow: '0 1px 2px rgba(0,0,0,0.8)',
  };
  if (marker.shape === 'square') {
    style.borderRadius = 1;
  }
  if (marker.shape === 'triangle') {
    style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
  }
  if (marker.shape === 'diamond') {
    style.transform = 'rotate(45deg)';
  }
  if (marker.shape === 'circle') {
    style.borderRadius = 999;
    style.border = '1px solid rgba(255,255,255,0.85)';
  }
  return style;
};

const POIS_BY_LEVEL = {
  1: [
    { x: 9, y: 7, type: 'tower' },
    { x: 15, y: 3, type: 'quest' },
    { x: 4, y: 12, type: 'rare' },
  ],
  2: [
    { x: 9, y: 7, type: 'tower' },
    { x: 14, y: 4, type: 'quest' },
    { x: 5, y: 10, type: 'rare' },
  ],
  3: [
    { x: 9, y: 7, type: 'tower' },
    { x: 2, y: 9, type: 'quest' },
    { x: 16, y: 12, type: 'rare' },
  ],
  4: [
    { x: 9, y: 7, type: 'tower' },
    { x: 3, y: 2, type: 'quest' },
    { x: 17, y: 10, type: 'rare' },
  ],
  5: [
    { x: 9, y: 7, type: 'tower' },
    { x: 2, y: 11, type: 'quest' },
    { x: 16, y: 3, type: 'rare' },
  ],
};

const LEVEL_ICONS = {
  1: TreePine,
  2: Gem,
  3: Mountain,
  4: Flame,
  5: Cloud,
};

function loadActiveLure() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTIVE_LURE_KEY) || 'null');
    if (!saved?.itemId || saved.remainingEncounters <= 0) return null;

    const item = getItemById(saved.itemId);
    const lure = getLureByItemId(saved.itemId);
    if (!item || !lure) return null;

    return {
      ...lure,
      name: item.name,
      remainingEncounters: Math.min(saved.remainingEncounters, lure.durationEncounters),
    };
  } catch {
    return null;
  }
}

function saveActiveLure(lure) {
  if (!lure || lure.remainingEncounters <= 0) {
    localStorage.removeItem(ACTIVE_LURE_KEY);
    return;
  }

  localStorage.setItem(ACTIVE_LURE_KEY, JSON.stringify({
    itemId: lure.itemId,
    name: lure.name,
    remainingEncounters: lure.remainingEncounters,
  }));
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function Browse({ onNavigate, today = new Date().toISOString().slice(0, 10) }) {
  // Progress state
  const [xp, setXp] = useState(() => loadProgress().xp);
  const [level, setLevel] = useState(() => loadProgress().level);
  const [showLevelUp, setShowLevelUp] = useState(null);

  // Map & player
  const mapConfig = useMemo(() => getMap(level), [level]);
  const activeSeasonalEvent = useMemo(() => getActiveSeasonalEvent(today), [today]);
  const [facing, setFacing] = useState('down');
  const [isMoving, setIsMoving] = useState(false);
  const lastMoveRef = useRef(0);
  const moveTimerRef = useRef(null);

  // Encounter state
  const [encounterPhase, setEncounterPhase] = useState(null); // null | 'flash' | 'battle' | 'no-team'
  const [pokemon, setPokemon] = useState(null);
  const [battleTeam, setBattleTeam] = useState(null);

  // Caught tracking
  const [caughtIds, setCaughtIds] = useState(new Set());
  const [caughtToday, setCaughtToday] = useState(0);
  const [isInitLoading, setIsInitLoading] = useState(true);

  // Healing flash
  const [showHeal, setShowHeal] = useState(false);
  const [healMessage, setHealMessage] = useState('');
  const [bossClearMessage, setBossClearMessage] = useState('');
  const [bossClears, setBossClears] = useState(() => loadBossClears());
  const [lureInventory, setLureInventory] = useState([]);
  const [activeLure, setActiveLure] = useState(() => loadActiveLure());
  const [lureMessage, setLureMessage] = useState('');
  const [equippedBallSkinCosmeticId, setEquippedBallSkinCosmeticId] = useState(null);

  // Persist progress
  useEffect(() => {
    saveProgress(xp, level);
  }, [xp, level]);

  // Load caught pokemon on mount
  useEffect(() => {
    (async () => {
      try {
        const caughtList = await pokemonAPI.getCaughtPokemon();
        setCaughtIds(new Set(caughtList.map((c) => c.pokemon_id)));
        const today = new Date().toISOString().slice(0, 10);
        setCaughtToday(caughtList.filter(c => c.caught_date && c.caught_date.slice(0, 10) === today).length);

        const apiClears = await pokemonAPI.getBossClears?.();
        if (Array.isArray(apiClears)) {
          const clearsByKey = Object.fromEntries(apiClears.map((clear) => [
            clear.boss_key || getBossClearKey(clear),
            {
              name: clear.name,
              reward_xp: clear.reward_xp || 0,
              cleared_at: clear.cleared_at,
            },
          ]));
          setBossClears(prev => ({ ...prev, ...clearsByKey }));
        }

        const items = await pokemonAPI.getItems?.();
        const upgradeResult = await pokemonAPI.getUpgrades?.();
        const lureUpgradeLevel = Math.max(0, Number(upgradeResult?.upgrades?.encounter_lure_slot) || 0);

        if (Array.isArray(items)) {
          setLureInventory(items
            .map((row) => {
              const item = getItemById(row.item_id);
              const lure = getLureByItemId(row.item_id);
              return item && lure && row.quantity > 0
                ? { item, lure: applyLureDurationBonus(lure, lureUpgradeLevel), quantity: row.quantity }
                : null;
            })
            .filter(Boolean));
        }

        const cosmeticsResult = await pokemonAPI.getCosmetics?.();
        const equippedBallSkin = (cosmeticsResult?.cosmetics || []).find((cosmetic) => {
          const catalogItem = getCosmetic(cosmetic.cosmetic_id);
          return cosmetic.equipped && catalogItem?.slot === 'ball_skin';
        });
        setEquippedBallSkinCosmeticId(equippedBallSkin?.cosmetic_id || null);
      } catch (err) {
        console.error("Failed to fetch caught Pokemon:", err);
      }
      setIsInitLoading(false);
    })();
  }, []);

  const activateLure = useCallback(async (lureEntry) => {
    try {
      await pokemonAPI.useItem(lureEntry.item.id);
      const nextLure = {
        ...lureEntry.lure,
        name: lureEntry.item.name,
        remainingEncounters: lureEntry.lure.durationEncounters,
      };
      saveActiveLure(nextLure);
      setActiveLure(nextLure);
      setLureInventory((current) => current
        .map((entry) => (
          entry.item.id === lureEntry.item.id
            ? { ...entry, quantity: Math.max(0, entry.quantity - 1) }
            : entry
        ))
        .filter((entry) => entry.quantity > 0));
      setLureMessage(`${lureEntry.item.name} active`);
    } catch (err) {
      console.error("Failed to use lure:", err);
      setLureMessage(`Could not use ${lureEntry.item.name}`);
    }
  }, []);

  // ═══════════════════════════════════════════
  // POKEMON FETCHING
  // ═══════════════════════════════════════════
  const fetchRandomPokemon = useCallback(async () => {
    const selectedRarity = rollRarity(level);
    const lureType = selectLureEncounterType(activeLure);
    const seasonalType = selectSeasonalEncounterType(activeSeasonalEvent);
    const encounterType = lureType || seasonalType;
    try {
      const pokemon = await pokemonAPI.getRandomPokemon(selectedRarity, encounterType);
      return pokemon;
    } catch (err) {
      console.error("Failed to fetch random Pokemon:", err);
      // Fallback to any rarity
      try {
        const pokemon = await pokemonAPI.getRandomPokemon();
        return pokemon;
      } catch (err2) {
        console.error("Fallback fetch failed:", err2);
        return null;
      }
    }
  }, [level, activeSeasonalEvent, activeLure]);

  const startBossEncounter = useCallback((boss) => {
    const team = loadTeam();
    if (!team.length || !isTeamAlive(team)) {
      setEncounterPhase('no-team');
      return;
    }

    setPokemon({
      id: `boss-${boss.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: boss.name,
      type: boss.pokemonType || 'Dragon',
      description: boss.description || `${boss.name} guards this zone's final path.`,
      image_url: boss.image_url,
      rarity: boss.rarity || 'Epic',
      power_level: boss.power_level || Math.min(100, level * 18 + 52),
      rewardXP: boss.rewardXP || 100,
      isBoss: true,
    });
    setBattleTeam(team);
    setEncounterPhase('battle');
  }, [level]);

  // Player position (combined x,y)
  const [playerPos, setPlayerPos] = useState(() => {
    const mc = getMap(loadProgress().level);
    return { x: mc.startX, y: mc.startY };
  });
  const playerPosRef = useRef(playerPos);

  // Keep the movement ref in sync for cooldown-gated reads.
  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  // Reset position when level changes
  useEffect(() => {
    const mc = getMap(level);
    setPlayerPos({ x: mc.startX, y: mc.startY });
  }, [level]);

  const movePlayer = useCallback((dir) => {
    if (encounterPhase) return;

    const now = Date.now();
    if (now - lastMoveRef.current < MOVE_COOLDOWN) return;
    lastMoveRef.current = now;

    const { dx, dy } = DIR_DELTA[dir];
    setFacing(dir);
    setIsMoving(true);
    if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
    moveTimerRef.current = setTimeout(() => setIsMoving(false), MOVE_COOLDOWN);

    // Compute the next tile outside the state updater: React StrictMode
    // double-invokes updaters, which would double-roll encounters.
    const current = playerPosRef.current;
    const newX = current.x + dx;
    const newY = current.y + dy;
    const map = mapConfig.data;

    const inBounds = newY >= 0 && newY < map.length && newX >= 0 && newX < map[0].length;
    const walkable = inBounds && isWalkable(map[newY][newX]);
    if (walkable) {
      setPlayerPos({ x: newX, y: newY });
      playerPosRef.current = { x: newX, y: newY };

      const tile = map[newY][newX];
      setTimeout(() => {
        if (isHealingSpot(tile)) {
          // Actually heal the team
          const team = loadTeam();
          if (team.length > 0) {
            const healed = healTeam(team);
            saveTeam(healed);
            setHealMessage('Team healed!');
          } else {
            setHealMessage('Healing spot!');
          }
          setShowHeal(true);
          setTimeout(() => { setShowHeal(false); setHealMessage(''); }, 1500);
        }
        if (isGrass(tile) && Math.random() < 0.20) {
          triggerEncounter();
        }
      }, 50);
    }
  }, [encounterPhase, mapConfig, activeLure]);

  // ═══════════════════════════════════════════
  // KEYBOARD CONTROLS
  // ═══════════════════════════════════════════
  useEffect(() => {
    const handleKey = (e) => {
      const keyMap = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
      };
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        movePlayer(dir);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [movePlayer]);

  useEffect(() => () => {
    if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
  }, []);

  // ═══════════════════════════════════════════
  // ENCOUNTERS
  // ═══════════════════════════════════════════
  const triggerEncounter = useCallback(async () => {
    setEncounterPhase('flash');
    // Quick white flash
    await new Promise(r => setTimeout(r, 400));

    // Load team
    const team = loadTeam();
    if (!team.length || !isTeamAlive(team)) {
      setEncounterPhase('no-team');
      return;
    }

    // Fetch Pokemon
    const found = await fetchRandomPokemon();
    if (!found) {
      setEncounterPhase(null);
      return;
    }

    setActiveLure((current) => {
      if (!current) return current;
      const remainingEncounters = current.remainingEncounters - 1;
      const nextLure = remainingEncounters > 0
        ? { ...current, remainingEncounters }
        : null;
      saveActiveLure(nextLure);
      return nextLure;
    });
    setPokemon(found);
    setBattleTeam(team);
    setEncounterPhase('battle');
  }, [fetchRandomPokemon]);

  // ═══════════════════════════════════════════
  // BATTLE END HANDLER
  // ═══════════════════════════════════════════
  const handleBattleEnd = useCallback(async (result) => {
    // Update team HP in localStorage
    if (result.teamHP) {
      const team = loadTeam();
      const updated = team.map((p, i) => ({
        ...p,
        currentHP: result.teamHP[i] !== undefined ? result.teamHP[i] : p.currentHP,
      }));
      saveTeam(updated);
    }

    // Handle catch
    if (result.caught && result.pokemon) {
      try {
        await pokemonAPI.catchPokemon(result.pokemon.id);
        setCaughtIds(prev => new Set([...prev, result.pokemon.id]));
        setCaughtToday(prev => prev + 1);
      } catch (err) {
        console.error("Failed to save caught Pokemon:", err);
      }
    }

    // Daily quest progress: battle win
    if (result.battleWon) {
      incrementDailyQuestsForEvent(pokemonAPI, 'battleWin', 1);
    }

    let xpGained = result.xpGained || 0;

    if (result.battleWon && result.pokemon?.isBoss) {
      const clear = recordBossClear(result.pokemon);
      const bossKey = getBossClearKey(result.pokemon);
      setBossClears(prev => ({ ...prev, [bossKey]: clear }));
      pokemonAPI.recordBossClear?.({
        boss_key: bossKey,
        name: clear.name,
        reward_xp: clear.reward_xp,
        cleared_at: clear.cleared_at,
      }).catch((err) => {
        console.error("Failed to sync boss clear:", err);
      });
      xpGained += clear.reward_xp;
      setBossClearMessage(`${clear.name} defeated! Zone cleared +${clear.reward_xp} XP`);
      setTimeout(() => setBossClearMessage(''), 3500);
    }

    // Award XP
    if (xpGained > 0) {
      const newXp = xp + xpGained;
      setXp(newXp);
      const newLevel = getLevelFromXP(newXp);
      if (newLevel > level) {
        setTimeout(() => {
          setLevel(newLevel);
          setShowLevelUp(getLevelConfig(newLevel));
          playSfx('level_up');
          setTimeout(() => setShowLevelUp(null), 3500);
        }, 500);
      }
    }

    // Handle team wipe
    if (result.teamWiped) {
      const team = loadTeam();
      const healed = healTeam(team);
      saveTeam(healed);
      // Teleport to start
      const mc = getMap(level);
      setPlayerPos({ x: mc.startX, y: mc.startY });
    }

    // Dismiss encounter
    setEncounterPhase(null);
    setPokemon(null);
    setBattleTeam(null);
  }, [xp, level]);

  const dismissEncounter = () => {
    setEncounterPhase(null);
    setPokemon(null);
    setBattleTeam(null);
  };

  // ═══════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════
  const currentEnv = getLevelConfig(level);
  const LevelIcon = LEVEL_ICONS[currentEnv.level] || Map;
  const nextLevelXP = getNextLevelXP(level);
  const currentLevelXP = currentEnv.xpRequired;
  const xpInLevel = xp - currentLevelXP;
  const xpNeededForLevel = nextLevelXP ? nextLevelXP - currentLevelXP : 0;
  const xpProgress = nextLevelXP ? Math.min(1, xpInLevel / xpNeededForLevel) : 1;

  // ═══════════════════════════════════════════
  // VIEWPORT CAMERA
  // ═══════════════════════════════════════════
  const map = mapConfig.data;
  const mapRows = map.length;
  const mapCols = map[0].length;
  const minimapW = mapCols * MINIMAP_TILE;
  const minimapH = mapRows * MINIMAP_TILE;
  const pois = [...(POIS_BY_LEVEL[level] || []), ...(mapConfig.pois || [])];

  // Camera: center on player, clamped to edges (target)
  const targetCameraX = Math.max(0, Math.min(playerPos.x * TILE - (VIEWPORT_W / 2) + (TILE / 2), mapCols * TILE - VIEWPORT_W));
  const targetCameraY = Math.max(0, Math.min(playerPos.y * TILE - (VIEWPORT_H / 2) + (TILE / 2), mapRows * TILE - VIEWPORT_H));

  // Smooth camera follow
  const [camera, setCamera] = useState(() => ({ x: targetCameraX, y: targetCameraY }));
  const cameraRef = useRef({ x: targetCameraX, y: targetCameraY });
  const cameraAnimRef = useRef(null);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const raf = (cb) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(cb, 16));
    const caf = (id) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id));

    if (cameraAnimRef.current) caf(cameraAnimRef.current);
    const lerp = 0.18;
    const step = () => {
      const { x, y } = cameraRef.current;
      const nextX = x + (targetCameraX - x) * lerp;
      const nextY = y + (targetCameraY - y) * lerp;
      const snap = Math.abs(targetCameraX - nextX) < 0.25 && Math.abs(targetCameraY - nextY) < 0.25;
      const next = snap ? { x: targetCameraX, y: targetCameraY } : { x: nextX, y: nextY };
      cameraRef.current = next;
      setCamera(next);
      if (!snap) {
        cameraAnimRef.current = raf(step);
      }
    };
    cameraAnimRef.current = raf(step);
    return () => caf(cameraAnimRef.current);
  }, [targetCameraX, targetCameraY]);

  // ═══════════════════════════════════════════
  // TILE RENDERER
  // ═══════════════════════════════════════════
  const theme = mapConfig.theme;
  const tileTypeToTheme = {
    0: theme.path,
    1: theme.grass,
    2: theme.tree,
    3: theme.water,
    4: theme.rock,
    5: theme.heal,
    6: theme.portal,
  };

  const tileTypeToIndex = {
    0: TILE_INDEX.path,
    1: TILE_INDEX.grass,
    2: TILE_INDEX.tree,
    3: TILE_INDEX.water,
    4: TILE_INDEX.rock,
    5: TILE_INDEX.heal,
    6: TILE_INDEX.portal,
  };

  // ═══════════════════════════════════════════
  // LOADING SCREEN
  // ═══════════════════════════════════════════
  if (isInitLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: currentEnv.gradient }}>
        <style>{animationStyles}</style>
        <div className="text-center">
          <div className="flex items-center justify-center" style={{ animation: "float 2s ease-in-out infinite" }}>
            <LevelIcon className="w-16 h-16 text-white/90" />
          </div>
          <p className="text-2xl font-bold mt-4" style={{ color: currentEnv.textColor }}>
            Entering {currentEnv.shortName}...
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-screen relative overflow-hidden select-none" style={{ background: currentEnv.gradient }}>
      <style>{animationStyles}</style>

      {/* ═══ HUD TOP BAR ═══ */}
      <div className="absolute top-0 left-0 right-0 z-30 p-2" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)' }}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex gap-1">
            <Button
              onClick={() => onNavigate("home")}
              className="h-9 px-3 text-sm font-bold bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm border border-white/20"
            >
              <Home className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => onNavigate("collection")}
              className="h-9 px-3 text-sm font-bold bg-emerald-500/40 hover:bg-emerald-500/50 text-white rounded-xl backdrop-blur-sm border border-emerald-400/30"
            >
              <Star className="w-4 h-4" />
            </Button>
          </div>

          {/* Level badge */}
          <div
            className="flex items-center gap-1 backdrop-blur-sm rounded-xl px-2 py-1 border"
            style={{
              backgroundColor: currentEnv.buttonGlow + '20',
              borderColor: currentEnv.buttonGlow + '40',
            }}
          >
            <span className="text-lg font-black text-white" style={{ textShadow: `0 0 10px ${currentEnv.buttonGlow}` }}>
              Lv.{level}
            </span>
            <span className="text-sm font-bold" style={{ color: currentEnv.textColor }}>
              {currentEnv.shortName}
            </span>
          </div>

          <div
            className="bg-yellow-500/30 backdrop-blur-sm border border-yellow-400/40 rounded-xl px-2 py-1 text-yellow-200 font-bold text-sm flex items-center gap-1"
          >
            <Trophy className="w-4 h-4" /> {caughtToday}
          </div>
        </div>

        {/* XP Bar */}
        <div className="flex items-center gap-2">
          {nextLevelXP ? (
            <>
              <div className="flex-1 h-3 bg-black/40 rounded-full overflow-hidden border border-white/20">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.max(2, xpProgress * 100)}%`,
                    background: `linear-gradient(90deg, ${currentEnv.buttonGlow}, ${currentEnv.buttonGlow}cc)`,
                    boxShadow: `0 0 8px ${currentEnv.buttonGlow}80`,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-white/70 whitespace-nowrap">
                {xp}/{nextLevelXP}
              </span>
            </>
          ) : (
            <span className="text-xs font-bold text-yellow-300 flex items-center gap-1"><Star className="w-3 h-3" /> Max Level</span>
          )}
        </div>

        {activeSeasonalEvent && (
          <div className="mt-2 flex items-center justify-center">
            <div className="inline-flex max-w-full items-center gap-2 rounded-xl border border-cyan-200/35 bg-cyan-950/45 px-3 py-1 text-xs font-black text-cyan-100 shadow-lg backdrop-blur-sm">
              <PartyPopper className="w-4 h-4 shrink-0 text-cyan-200" />
              <span className="truncate">{activeSeasonalEvent.name}</span>
              <span className="hidden h-1 w-1 rounded-full bg-cyan-200/70 sm:block" />
              <span className="truncate text-cyan-100/85">
                {activeSeasonalEvent.boostedTypes.join(' / ')} boosted
              </span>
            </div>
          </div>
        )}

        {(activeLure || lureInventory.length > 0 || lureMessage) && (
          <div className="mt-2 flex items-center justify-center">
            <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-lime-200/35 bg-lime-950/45 px-3 py-1.5 text-xs font-black text-lime-100 shadow-lg backdrop-blur-sm">
              <Sparkles className="w-4 h-4 shrink-0 text-lime-200" />
              {activeLure ? (
                <>
                  <span>{activeLure.name} active</span>
                  <span className="text-lime-100/80">{activeLure.remainingEncounters} encounters boosted</span>
                </>
              ) : (
                lureInventory.map((entry) => (
                  <button
                    key={entry.item.id}
                    type="button"
                    onClick={() => activateLure(entry)}
                    className="rounded-lg border border-lime-200/30 bg-lime-500/20 px-2 py-1 text-lime-50 transition hover:bg-lime-400/30"
                  >
                    Use {entry.item.name}
                  </button>
                ))
              )}
              {lureMessage && !activeLure && (
                <span className="text-lime-100/80">{lureMessage}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ GAME VIEWPORT ═══ */}
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', paddingTop: '70px', paddingBottom: '20px' }}>
        <div
          role="img"
          aria-label={`Overworld map: zone ${level}. You are at position ${playerPos.x + 1}, ${playerPos.y + 1} of a ${mapCols} by ${mapRows} tile map. Use arrow keys or the D-pad to move. Grass tiles may trigger wild encounters.`}
          style={{
            width: VIEWPORT_W,
            height: VIEWPORT_H,
            overflow: 'hidden',
            borderRadius: '16px',
            border: '3px solid rgba(255,255,255,0.2)',
            boxShadow: '0 0 30px rgba(0,0,0,0.5)',
            position: 'relative',
            background: '#111',
          }}
        >
          {/* Map layer — scrolls with camera */}
          <div
            style={{
              position: 'absolute',
              width: mapCols * TILE,
              height: mapRows * TILE,
              transform: `translate(${-camera.x}px, ${-camera.y}px)`,
            }}
          >
            {/* Tiles */}
            {map.map((row, y) =>
              row.map((tileType, x) => {
                const t = tileTypeToTheme[tileType] || theme.path;
                const isWaterTile = tileType === 3;
                const isHealTile = tileType === 5;
                return (
                  <div
                    key={`${x}-${y}`}
                    style={{
                      position: 'absolute',
                      left: x * TILE,
                      top: y * TILE,
                      width: TILE,
                      height: TILE,
                      backgroundColor: t.bg,
                      backgroundImage: `url(${tileSprite})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: `${TILESET_COLS * TILE}px ${TILE}px`,
                      backgroundPosition: `-${tileTypeToIndex[tileType] * TILE}px 0px`,
                      imageRendering: 'pixelated',
                      overflow: 'hidden',
                    }}
                    className={`tile ${t.animClass || ''} ${isWaterTile ? 'water-shimmer' : ''} ${isHealTile ? 'heal-sparkle' : ''}`}
                  />
                );
              })
            )}

            {/* Player character */}
            <div
              style={{
                position: 'absolute',
                left: playerPos.x * TILE,
                top: playerPos.y * TILE,
                width: TILE,
                height: TILE,
                zIndex: 10,
                transition: 'left 0.15s ease-out, top 0.15s ease-out',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
            >
              <div
                className={`player-sprite ${isMoving ? 'player-walk' : ''}`}
                style={{
                  width: TILE,
                  height: TILE,
                  backgroundImage: `url(${playerSprite})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${SPRITE_COLS * TILE}px ${SPRITE_ROWS * TILE}px`,
                  backgroundPositionX: '0px',
                  backgroundPositionY: `${-SPRITE_ROW_BY_DIR[facing] * TILE}px`,
                  imageRendering: 'pixelated',
                }}
              />
            </div>
          </div>

          {/* Minimap */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: minimapW + 10,
              height: minimapH + 10,
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              padding: 5,
              zIndex: 15,
              boxShadow: '0 6px 14px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <div style={{ position: 'relative', width: minimapW, height: minimapH }}>
              {map.map((row, y) =>
                row.map((tileType, x) => {
                  const t = tileTypeToTheme[tileType] || theme.path;
                  return (
                    <div
                      key={`mini-${x}-${y}`}
                      style={{
                        position: 'absolute',
                        left: x * MINIMAP_TILE,
                        top: y * MINIMAP_TILE,
                        width: MINIMAP_TILE,
                        height: MINIMAP_TILE,
                        backgroundColor: t.bg,
                        opacity: tileType === 2 || tileType === 3 || tileType === 4 ? 0.75 : 1,
                      }}
                    />
                  );
                })
              )}

              {/* POI markers */}
              {pois.map((poi, i) => {
                const bossKey = poi.type === 'boss' ? getBossClearKey(poi) : null;
                const isBossCleared = bossKey && bossClears[bossKey];
                return (
                  <button
                    key={`poi-${i}`}
                    type="button"
                    aria-label={poi.type === 'boss'
                      ? `${isBossCleared ? 'Cleared Boss' : 'Boss'}: ${poi.name}`
                      : POI_MARKERS[poi.type]?.label || poi.type}
                    onClick={() => {
                      if (poi.type === 'boss') startBossEncounter(poi);
                    }}
                    style={{
                      position: 'absolute',
                      left: poi.x * MINIMAP_TILE,
                      top: poi.y * MINIMAP_TILE,
                      transform: 'translate(-1px, -2px)',
                      padding: 0,
                      border: 0,
                      cursor: poi.type === 'boss' ? 'pointer' : 'default',
                      opacity: isBossCleared ? 0.95 : 1,
                      ...getPoiMarkerStyle(poi.type, 7),
                      ...(isBossCleared ? {
                        background: '#22c55e',
                        boxShadow: '0 0 8px rgba(34,197,94,0.95)',
                      } : {}),
                    }}
                    title={isBossCleared ? `${poi.name} cleared` : (poi.name || poi.type)}
                  />
                );
              })}

              {/* Player dot */}
              <div
                style={{
                  position: 'absolute',
                  left: playerPos.x * MINIMAP_TILE + 1,
                  top: playerPos.y * MINIMAP_TILE + 1,
                  width: MINIMAP_TILE - 2,
                  height: MINIMAP_TILE - 2,
                  borderRadius: 999,
                  background: '#22c55e',
                  boxShadow: '0 0 6px rgba(34,197,94,0.9)',
                  border: '1px solid rgba(255,255,255,0.8)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 10, color: '#e5e7eb' }}>
              {Object.entries(POI_MARKERS).map(([type, marker]) => (
                <span key={`legend-${type}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', ...getPoiMarkerStyle(type, 8) }} />
                  {marker.label}
                </span>
              ))}
            </div>
          </div>

          {/* Healing flash overlay */}
          {showHeal && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, rgba(236,72,153,0) 70%)',
                animation: 'heal-flash 1.2s ease-out forwards',
                zIndex: 20,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Heart className="w-12 h-12 text-pink-300" />
              {healMessage && (
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#ec4899', textShadow: '0 1px 4px #000' }}>
                  {healMessage}
                </span>
              )}
            </div>
          )}

          {/* Encounter flash overlay */}
          {encounterPhase === 'flash' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'white',
                animation: 'encounter-flash 0.4s ease-out forwards',
                zIndex: 25,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>

      {bossClearMessage && (
        <div className="fixed left-1/2 top-20 z-[70] -translate-x-1/2 rounded border border-rose-300/70 bg-rose-950/90 px-4 py-3 text-center text-sm font-black text-rose-100 shadow-2xl backdrop-blur">
          {bossClearMessage}
        </div>
      )}

      {/* ═══ D-PAD ═══ */}
      {!encounterPhase && <DPad onMove={movePlayer} />}

      {/* ═══ BATTLE SCREEN ═══ */}
      {encounterPhase === 'battle' && pokemon && battleTeam && (
        <BattleScreen
          wildPokemon={pokemon}
          team={battleTeam}
          onEnd={handleBattleEnd}
          levelConfig={currentEnv}
          seasonalEvent={activeSeasonalEvent}
          equippedBallSkinCosmeticId={equippedBallSkinCosmeticId}
        />
      )}

      {/* ═══ NO TEAM MESSAGE ═══ */}
      {encounterPhase === 'no-team' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative z-10 text-center px-8 max-w-md">
            <div className="flex items-center justify-center mb-4">
              <Frown className="w-16 h-16 text-white/80" />
            </div>
            <h2 className="text-3xl font-black text-white mb-3">
              No Pokémon on your team!
            </h2>
            <p className="text-lg text-gray-300 mb-6">
              Go to your Collection and add Pokémon to your battle team (up to 3) using the "Add to Team" button.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { dismissEncounter(); onNavigate("collection"); }}
                className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-black text-xl px-8 py-4 rounded-2xl border-2 border-emerald-300/50 shadow-2xl transform hover:scale-105 transition-all active:scale-95"
              >
                <span className="inline-flex items-center gap-2"><Star className="w-5 h-5" /> Go to Collection</span>
              </button>
              <button
                onClick={dismissEncounter}
                className="text-gray-400 hover:text-white transition font-medium text-base"
              >
                Continue exploring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LEVEL UP CELEBRATION OVERLAY ═══ */}
      {showLevelUp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={`lvl-conf-${i}`}
                className="absolute"
                style={{
                  left: Math.random() * 100 + '%',
                  top: '-5%',
                  fontSize: Math.random() * 24 + 14 + 'px',
                  animation: `confetti-fall ${2 + Math.random() * 3}s linear forwards`,
                  animationDelay: `${Math.random() * 1.2}s`,
                }}
              >
                {['✨', '⭐', '🌟', '💫', '🎉', '🎊', '🏆', '💎', '🔥', '❤️'][Math.floor(Math.random() * 10)]}
              </div>
            ))}
          </div>
          <div className="relative text-center z-10 px-8" style={{ animation: 'scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <div className="text-8xl mb-6" style={{ animation: 'celebration-spin 0.8s ease-out' }}>🎊</div>
            <h1
              className="text-6xl md:text-7xl font-black mb-6"
              style={{
                background: 'linear-gradient(135deg, #facc15, #f59e0b, #fbbf24, #facc15)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 30px #facc1580)',
              }}
            >
              LEVEL UP!
            </h1>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl px-8 py-6 border border-white/20" style={{ animation: 'fadeIn 0.5s ease-out 0.3s both' }}>
              <h2 className="text-4xl font-black text-white mb-3">Level {showLevelUp.level}</h2>
              <h3 className="text-2xl font-bold" style={{ color: showLevelUp.textColor }}>{showLevelUp.name}</h3>
              <p className="text-lg text-white/60 mt-3 font-medium">New Pokémon await you!</p>
            </div>
          </div>
        </div>
      )}
      <TutorialCoach page="browse" />
      </div>
  );
}

// ═══════════════════════════════════════════
// ANIMATION STYLES
// ═══════════════════════════════════════════
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.3); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes pulse-text {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }
  @keyframes encounter-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0.5); }
    50% { opacity: 1; transform: scale(1.2); }
  }
  @keyframes confetti-fall {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  @keyframes celebration-spin {
    from { transform: rotate(0deg) scale(0.5); }
    to { transform: rotate(360deg) scale(1); }
  }

  /* Player sprite animations */
  .player-sprite {
    background-repeat: no-repeat;
  }
  .player-walk {
    animation: sprite-walk 0.4s steps(2) infinite;
  }
  @keyframes sprite-walk {
    from { background-position-x: 0px; }
    to { background-position-x: -48px; }
  }

  /* Tile animations */
  .grass-sway span {
    animation: tile-sway 2s ease-in-out infinite;
    display: inline-block;
  }
  @keyframes tile-sway {
    0%, 100% { transform: rotate(-3deg) scale(1); }
    50% { transform: rotate(3deg) scale(1.05); }
  }

  .water-wave span {
    animation: tile-wave 3s ease-in-out infinite;
    display: inline-block;
  }
  @keyframes tile-wave {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  .water-shimmer::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0) 80%);
    animation: water-shimmer 2.6s ease-in-out infinite;
    mix-blend-mode: screen;
    opacity: 0.6;
    pointer-events: none;
  }
  @keyframes water-shimmer {
    0% { transform: translateX(-120%); }
    50% { transform: translateX(0%); }
    100% { transform: translateX(120%); }
  }

  .heal-glow {
    animation: tile-heal 2s ease-in-out infinite;
  }
  @keyframes tile-heal {
    0%, 100% { box-shadow: inset 0 0 10px rgba(236,72,153,0.3); }
    50% { box-shadow: inset 0 0 20px rgba(236,72,153,0.6); }
  }

  .heal-sparkle::before,
  .heal-sparkle::after {
    content: '✨';
    position: absolute;
    font-size: 12px;
    opacity: 0;
    animation: heal-sparkle 2s ease-in-out infinite;
    pointer-events: none;
    filter: drop-shadow(0 0 4px rgba(236,72,153,0.6));
  }
  .heal-sparkle::before {
    top: 6px;
    left: 6px;
    animation-delay: 0.2s;
  }
  .heal-sparkle::after {
    bottom: 6px;
    right: 6px;
    font-size: 10px;
    animation-delay: 1s;
  }
  @keyframes heal-sparkle {
    0%, 100% { opacity: 0; transform: scale(0.6); }
    50% { opacity: 1; transform: scale(1.2); }
  }

  .portal-pulse {
    animation: tile-portal 1.5s ease-in-out infinite;
  }
  @keyframes tile-portal {
    0%, 100% { box-shadow: inset 0 0 10px rgba(251,191,36,0.3); }
    50% { box-shadow: inset 0 0 25px rgba(251,191,36,0.7); }
  }

  @keyframes heal-flash {
    0% { opacity: 0; }
    30% { opacity: 1; }
    100% { opacity: 0; }
  }

  @keyframes encounter-flash {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  @keyframes glow-pulse {
    0%, 100% { filter: drop-shadow(0 0 10px #facc1540); }
    50% { filter: drop-shadow(0 0 25px #facc1580); }
  }
`;
