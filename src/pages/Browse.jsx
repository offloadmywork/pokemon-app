import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import DPad from "@/components/DPad";
import BattleScreen from "@/components/BattleScreen";
import { getMap, isWalkable, isGrass, isHealingSpot } from "@/game/maps";
import { loadTeam, saveTeam, healTeam, isTeamAlive } from "@/game/team";
import {
  CATCH_RATES, TOTAL_POKEMON, STORAGE_KEY, LEVEL_CONFIG,
  XP_REWARDS, RARITY_WEIGHTS, rollRarity,
  getLevelFromXP, getLevelConfig, getNextLevelXP,
  loadProgress, saveProgress,
  getPokemonImage, typeEmojis, rarityConfig,
} from "@/game/constants";

const Pokemon = base44.entities.Pokemon;
const CaughtPokemon = base44.entities.CaughtPokemon;

// ═══════════════════════════════════════════
// TILE SIZE & VIEWPORT
// ═══════════════════════════════════════════
const TILE = 48;
const VIEW_COLS = 9;
const VIEW_ROWS = 7;
const VIEWPORT_W = VIEW_COLS * TILE;  // 432
const VIEWPORT_H = VIEW_ROWS * TILE;  // 336
const MOVE_COOLDOWN = 200; // ms

// Direction offsets
const DIR_DELTA = {
  up:    { dx: 0, dy: -1 },
  down:  { dx: 0, dy: 1 },
  left:  { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// Player emoji per direction
const PLAYER_EMOJI = {
  up: '🧑',
  down: '🧒',
  left: '🏃',
  right: '🏃',
};

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function Browse({ onNavigate }) {
  // Progress state
  const [xp, setXp] = useState(() => loadProgress().xp);
  const [level, setLevel] = useState(() => loadProgress().level);
  const [showLevelUp, setShowLevelUp] = useState(null);

  // Map & player
  const mapConfig = useMemo(() => getMap(level), [level]);
  const [facing, setFacing] = useState('down');
  const lastMoveRef = useRef(0);

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

  // Persist progress
  useEffect(() => {
    saveProgress(xp, level);
  }, [xp, level]);

  // Load caught pokemon on mount
  useEffect(() => {
    (async () => {
      try {
        const caughtList = await CaughtPokemon.list();
        setCaughtIds(new Set(caughtList.map((c) => c.pokemon_id)));
        const today = new Date().toISOString().slice(0, 10);
        setCaughtToday(caughtList.filter(c => c.caught_date && c.caught_date.slice(0, 10) === today).length);
      } catch (err) {
        console.error("Failed to fetch caught Pokemon:", err);
      }
      setIsInitLoading(false);
    })();
  }, []);

  // ═══════════════════════════════════════════
  // POKEMON FETCHING
  // ═══════════════════════════════════════════
  const fetchRandomPokemon = useCallback(async () => {
    const selectedRarity = rollRarity(level);
    let attempts = 0;
    while (attempts < 8) {
      try {
        const maxSkip = Math.max(1, Math.floor(TOTAL_POKEMON * 0.2));
        const skip = Math.floor(Math.random() * maxSkip);
        const data = await Pokemon.filter({ rarity: selectedRarity }, null, 1, skip);
        if (data && data.length > 0) return data[0];
        if (skip > 0) {
          const data2 = await Pokemon.filter({ rarity: selectedRarity }, null, 1, 0);
          if (data2 && data2.length > 0) return data2[0];
        }
      } catch (err) {
        console.error("Fetch attempt failed:", err);
      }
      attempts++;
    }
    try {
      const skip = Math.floor(Math.random() * 50);
      const data = await Pokemon.list(null, 1, skip);
      if (data && data.length > 0) return data[0];
    } catch (err) {
      console.error("Fallback fetch failed:", err);
    }
    return null;
  }, [level]);

  // Player position (combined x,y)
  const [playerPos, setPlayerPos] = useState(() => {
    const mc = getMap(loadProgress().level);
    return { x: mc.startX, y: mc.startY };
  });

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

    setPlayerPos(prev => {
      const newX = prev.x + dx;
      const newY = prev.y + dy;
      const map = mapConfig.data;

      // Bounds check
      if (newY < 0 || newY >= map.length || newX < 0 || newX >= map[0].length) return prev;
      // Wall check
      if (!isWalkable(map[newY][newX])) return prev;

      const tile = map[newY][newX];

      // Schedule side effects
      setTimeout(() => {
        if (isHealingSpot(tile)) {
          // Actually heal the team
          const team = loadTeam();
          if (team.length > 0) {
            const healed = healTeam(team);
            saveTeam(healed);
            setHealMessage('💖 Team healed!');
          } else {
            setHealMessage('💖 Healing spot!');
          }
          setShowHeal(true);
          setTimeout(() => { setShowHeal(false); setHealMessage(''); }, 1500);
        }
        if (isGrass(tile) && Math.random() < 0.20) {
          triggerEncounter();
        }
      }, 50);

      return { x: newX, y: newY };
    });
  }, [encounterPhase, mapConfig]);

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
        await CaughtPokemon.create({
          pokemon_id: result.pokemon.id,
          caught_date: new Date().toISOString(),
        });
        setCaughtIds(prev => new Set([...prev, result.pokemon.id]));
        setCaughtToday(prev => prev + 1);
      } catch (err) {
        console.error("Failed to save caught Pokemon:", err);
      }
    }

    // Award XP
    if (result.xpGained > 0) {
      const newXp = xp + result.xpGained;
      setXp(newXp);
      const newLevel = getLevelFromXP(newXp);
      if (newLevel > level) {
        setTimeout(() => {
          setLevel(newLevel);
          setShowLevelUp(getLevelConfig(newLevel));
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

  // Camera: center on player, clamped to edges
  const cameraX = Math.max(0, Math.min(playerPos.x * TILE - (VIEWPORT_W / 2) + (TILE / 2), mapCols * TILE - VIEWPORT_W));
  const cameraY = Math.max(0, Math.min(playerPos.y * TILE - (VIEWPORT_H / 2) + (TILE / 2), mapRows * TILE - VIEWPORT_H));

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

  // ═══════════════════════════════════════════
  // LOADING SCREEN
  // ═══════════════════════════════════════════
  if (isInitLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: currentEnv.gradient }}>
        <style>{animationStyles}</style>
        <div className="text-center">
          <div className="text-7xl" style={{ animation: "float 2s ease-in-out infinite" }}>
            {currentEnv.emoji}
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
              🏠
            </Button>
            <Button
              onClick={() => onNavigate("collection")}
              className="h-9 px-3 text-sm font-bold bg-emerald-500/40 hover:bg-emerald-500/50 text-white rounded-xl backdrop-blur-sm border border-emerald-400/30"
            >
              ⭐
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
            className="bg-yellow-500/30 backdrop-blur-sm border border-yellow-400/40 rounded-xl px-2 py-1 text-yellow-200 font-bold text-sm"
          >
            🏆 {caughtToday}
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
            <span className="text-xs font-bold text-yellow-300">✨ MAX LEVEL ✨</span>
          )}
        </div>
      </div>

      {/* ═══ GAME VIEWPORT ═══ */}
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', paddingTop: '70px', paddingBottom: '20px' }}>
        <div
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
              transform: `translate(${-cameraX}px, ${-cameraY}px)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            {/* Tiles */}
            {map.map((row, y) =>
              row.map((tileType, x) => {
                const t = tileTypeToTheme[tileType] || theme.path;
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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: tileType === 2 || tileType === 3 || tileType === 4 ? '28px' : '18px',
                      overflow: 'hidden',
                    }}
                    className={t.animClass || ''}
                  >
                    {t.emoji && <span className={t.animClass || ''}>{t.emoji}</span>}
                  </div>
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                zIndex: 10,
                transition: 'left 0.15s ease-out, top 0.15s ease-out',
                transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
            >
              {PLAYER_EMOJI[facing]}
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
              <span style={{ fontSize: '48px' }}>💖</span>
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

      {/* ═══ D-PAD ═══ */}
      {!encounterPhase && <DPad onMove={movePlayer} />}

      {/* ═══ BATTLE SCREEN ═══ */}
      {encounterPhase === 'battle' && pokemon && battleTeam && (
        <BattleScreen
          wildPokemon={pokemon}
          team={battleTeam}
          onEnd={handleBattleEnd}
          levelConfig={currentEnv}
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
            <div className="text-7xl mb-4">😰</div>
            <h2 className="text-3xl font-black text-white mb-3">
              You need Pokémon to battle!
            </h2>
            <p className="text-lg text-gray-300 mb-6">
              Visit your collection to pick a team of up to 3 Pokémon!
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { dismissEncounter(); onNavigate("collection"); }}
                className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-black text-xl px-8 py-4 rounded-2xl border-2 border-emerald-300/50 shadow-2xl transform hover:scale-105 transition-all active:scale-95"
              >
                ⭐ Go to Collection
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

  .heal-glow {
    animation: tile-heal 2s ease-in-out infinite;
  }
  @keyframes tile-heal {
    0%, 100% { box-shadow: inset 0 0 10px rgba(236,72,153,0.3); }
    50% { box-shadow: inset 0 0 20px rgba(236,72,153,0.6); }
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
