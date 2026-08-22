import { useState, useEffect, useCallback, useRef } from "react";
import { calculateDamage, getMaxHP, getCatchRate, getFaintedCatchRate } from "@/game/battle";
import { getPokemonImage, typeEmojis, rarityConfig, XP_REWARDS } from "@/game/constants";
import { getSeasonalCatchRate, getSeasonalXpReward } from "@/game/seasonalEvents";
import { getCosmetic } from "@/game/cosmetics";
import { playSfx, vibrate } from "@/game/audio";

// ═══════════════════════════════════════════
// BATTLE SCREEN — Full turn-based battle UI
// ═══════════════════════════════════════════

// Battle phases
const PHASE = {
  INTRO: 'intro',
  PLAYER_ENTER: 'player-enter',
  CHOOSE: 'choose',
  PLAYER_ATTACK: 'player-attack',
  PLAYER_HIT: 'player-hit',
  EFFECTIVENESS_MSG: 'effectiveness-msg',
  ENEMY_ATTACK: 'enemy-attack',
  ENEMY_HIT: 'enemy-hit',
  CATCH_THROW: 'catch-throw',
  CATCH_WOBBLE: 'catch-wobble',
  CATCH_SUCCESS: 'catch-success',
  CATCH_FAIL: 'catch-fail',
  FAINTED_WILD: 'fainted-wild',
  FAINTED_WILD_CATCH: 'fainted-wild-catch',
  FAINTED_PLAYER: 'fainted-player',
  SWITCH: 'switch',
  RUN_SUCCESS: 'run-success',
  RUN_FAIL: 'run-fail',
  TEAM_WIPED: 'team-wiped',
  VICTORY: 'victory',
};

// Action words for attacks
const ATTACK_WORDS = ['BOOM!', 'POW!', 'WHAM!', 'ZAP!', 'SMASH!', 'CRASH!', 'BAM!'];

function getRandomAttackWord() {
  return ATTACK_WORDS[Math.floor(Math.random() * ATTACK_WORDS.length)];
}

function getImage(pokemon) {
  if (pokemon.image_url && pokemon.image_url.length > 100) return pokemon.image_url;
  return getPokemonImage(pokemon);
}

function getBallPresentation(cosmeticId) {
  const cosmetic = getCosmetic(cosmeticId);
  if (cosmetic?.slot === 'ball_skin' && cosmetic.cosmetic_id === 'premier_ball_skin') {
    return {
      icon: '⚪',
      name: 'Premier Ball',
      buttonClass: 'pixel-btn-premier',
    };
  }

  return {
    icon: '🔴',
    name: 'Pokéball',
    buttonClass: 'pixel-btn-catch',
  };
}

// HP Bar component
function HPBar({ current, max, showText = true, size = 'normal' }) {
  const ratio = max > 0 ? current / max : 0;
  const color = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
  const h = size === 'small' ? 'h-3' : 'h-4';

  return (
    <div className="w-full">
      <div className={`${h} pixel-hp-shell overflow-hidden`}>
        <div
          style={{
            width: `${Math.max(0, ratio * 100)}%`,
            background: color,
            transition: 'width 0.5s ease-out',
            height: '100%',
            borderRadius: '2px',
          }}
        />
      </div>
      {showText && (
        <span className="text-[10px] font-bold pixel-hp-text mt-1 block text-right">
          HP: {Math.max(0, current)}/{max}
        </span>
      )}
    </div>
  );
}

// Floating damage number
function DamageNumber({ damage, isCritical, position }) {
  return (
    <div
      className="absolute pointer-events-none z-50 font-black text-center"
      style={{
        ...position,
        animation: 'damage-float 1.2s ease-out forwards',
      }}
    >
      <span
        className="text-4xl"
        style={{
          color: isCritical ? '#facc15' : '#ef4444',
          textShadow: isCritical
            ? '0 0 20px #facc15, 0 2px 4px #000'
            : '0 0 10px #ef4444, 0 2px 4px #000',
        }}
      >
        -{damage}
      </span>
      {isCritical && (
        <div className="text-yellow-300 text-lg font-black" style={{ textShadow: '0 0 10px #facc15' }}>
          CRITICAL!
        </div>
      )}
    </div>
  );
}

export default function BattleScreen({
  wildPokemon,
  team: initialTeam,
  onEnd,
  levelConfig,
  seasonalEvent = null,
  equippedBallSkinCosmeticId = null,
}) {
  const [phase, setPhase] = useState(PHASE.INTRO);
  const [team, setTeam] = useState(() =>
    initialTeam.map(p => ({ ...p, maxHP: getMaxHP(p), currentHP: p.currentHP ?? getMaxHP(p) }))
  );
  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = initialTeam.findIndex(p => (p.currentHP ?? getMaxHP(p)) > 0);
    return idx >= 0 ? idx : 0;
  });
  const [wildHP, setWildHP] = useState(() => getMaxHP(wildPokemon));
  const wildMaxHP = getMaxHP(wildPokemon);

  // UI state
  const [message, setMessage] = useState('');
  const [attackWord, setAttackWord] = useState('');
  const [playerDamage, setPlayerDamage] = useState(null); // { damage, isCritical }
  const [wildDamage, setWildDamage] = useState(null);
  const [wobbleCount, setWobbleCount] = useState(0);
  const [effectivenessText, setEffectivenessText] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  // Animation flags
  const [playerShake, setPlayerShake] = useState(false);
  const [wildShake, setWildShake] = useState(false);
  const [playerFlashRed, setPlayerFlashRed] = useState(false);
  const [wildFlashRed, setWildFlashRed] = useState(false);
  const [playerLunge, setPlayerLunge] = useState(false);
  const [wildLunge, setWildLunge] = useState(false);

  const activePokemon = team[activeIndex];
  const ballPresentation = getBallPresentation(equippedBallSkinCosmeticId);

  // Catch state for fainted wild pokemon
  const [faintedCatchPhase, setFaintedCatchPhase] = useState(null);

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // ═══ INTRO SEQUENCE ═══
  useEffect(() => {
    (async () => {
      setMessage(`A wild ${wildPokemon.name} appeared!`);
      playSfx('encounter');
      await wait(1800);
      setPhase(PHASE.PLAYER_ENTER);
      setMessage(`Go, ${activePokemon.name}!`);
      await wait(1200);
      setPhase(PHASE.CHOOSE);
      setMessage('What will you do?');
    })();
  }, []); // eslint-disable-line

  // ═══ HELPER: enemy attacks ═══
  const enemyAttack = useCallback(async (currentTeam, currentActiveIndex) => {
    const myPokemon = currentTeam[currentActiveIndex];
    if (!myPokemon || myPokemon.currentHP <= 0) return { team: currentTeam, activeIndex: currentActiveIndex };

    setPhase(PHASE.ENEMY_ATTACK);
    setAttackWord(getRandomAttackWord());
    setMessage(`Wild ${wildPokemon.name} attacks!`);
    setWildLunge(true);
    await wait(600);
    setWildLunge(false);

    const result = calculateDamage(wildPokemon, myPokemon);
    setPhase(PHASE.ENEMY_HIT);
    setPlayerDamage(result);
    setPlayerFlashRed(true);
    setPlayerShake(true);
    playSfx(result.isCritical ? 'critical' : 'hit');
    if (result.isCritical) vibrate([40, 30, 80]);

    const newHP = Math.max(0, myPokemon.currentHP - result.damage);
    const updatedTeam = [...currentTeam];
    updatedTeam[currentActiveIndex] = { ...myPokemon, currentHP: newHP };
    setTeam(updatedTeam);

    await wait(800);
    setPlayerFlashRed(false);
    setPlayerShake(false);
    setPlayerDamage(null);

    // Check if our Pokemon fainted
    if (newHP <= 0) {
      setPhase(PHASE.FAINTED_PLAYER);
      setMessage(`${myPokemon.name} fainted!`);
      playSfx('faint');
      await wait(1500);

      // Find next alive
      const nextAliveIdx = updatedTeam.findIndex((p, i) => i !== currentActiveIndex && p.currentHP > 0);
      if (nextAliveIdx >= 0) {
        setActiveIndex(nextAliveIdx);
        setMessage(`Go, ${updatedTeam[nextAliveIdx].name}!`);
        setPhase(PHASE.PLAYER_ENTER);
        await wait(1200);
        setPhase(PHASE.CHOOSE);
        setMessage('What will you do?');
        return { team: updatedTeam, activeIndex: nextAliveIdx };
      } else {
        // Team wiped!
        setPhase(PHASE.TEAM_WIPED);
        setMessage('All your Pokémon fainted!');
        return { team: updatedTeam, activeIndex: currentActiveIndex, wiped: true };
      }
    }

    setPhase(PHASE.CHOOSE);
    setMessage('What will you do?');
    return { team: updatedTeam, activeIndex: currentActiveIndex };
  }, [wildPokemon]);

  // ═══ ACTION: ATTACK ═══
  const handleAttack = useCallback(async () => {
    if (phase !== PHASE.CHOOSE) return;
    const myPokemon = team[activeIndex];

    // Player attacks
    setPhase(PHASE.PLAYER_ATTACK);
    setAttackWord(getRandomAttackWord());
    setMessage(`${myPokemon.name} attacks!`);
    setPlayerLunge(true);
    await wait(600);
    setPlayerLunge(false);

    const result = calculateDamage(myPokemon, wildPokemon);
    setPhase(PHASE.PLAYER_HIT);
    setWildDamage(result);
    setWildFlashRed(true);
    setWildShake(true);

    if (result.isCritical) {
      playSfx('critical');
      vibrate([40, 30, 80]);
    } else {
      playSfx(
        result.effectiveness === 'super-effective' ? 'super_effective'
          : result.effectiveness === 'not-very-effective' ? 'not_very_effective'
            : 'hit'
      );
      if (result.effectiveness !== 'normal') vibrate(60);
    }

    const newWildHP = Math.max(0, wildHP - result.damage);
    setWildHP(newWildHP);

    await wait(800);
    setWildFlashRed(false);
    setWildShake(false);
    setWildDamage(null);

    // Effectiveness message
    if (result.effectiveness !== 'normal' || result.isCritical) {
      setPhase(PHASE.EFFECTIVENESS_MSG);
      let msg = '';
      if (result.effectiveness === 'super-effective') {
        msg = "It's super effective! 💥";
        setEffectivenessText('super-effective');
      } else if (result.effectiveness === 'not-very-effective') {
        msg = "It's not very effective... 😕";
        setEffectivenessText('not-very-effective');
      }
      if (result.isCritical) {
        msg = (msg ? msg + ' ' : '') + 'Critical hit!';
      }
      setMessage(msg);
      await wait(1200);
      setEffectivenessText('');
    }

    // Check if wild fainted
    if (newWildHP <= 0) {
      setPhase(PHASE.FAINTED_WILD);
      setMessage(`Wild ${wildPokemon.name} fainted!`);
      playSfx('faint');
      await wait(1500);
      // Offer catch with high rate
      setPhase(PHASE.FAINTED_WILD_CATCH);
      setMessage(`Throw a Pokéball to catch it!`);
      return;
    }

    // Enemy turn
    await enemyAttack(team, activeIndex);
  }, [phase, team, activeIndex, wildHP, wildPokemon, enemyAttack]);

  // ═══ ACTION: CATCH ═══
  const handleCatch = useCallback(async (isFaintedCatch = false) => {
    if (phase !== PHASE.CHOOSE && phase !== PHASE.FAINTED_WILD_CATCH) return;

    const baseCatchRate = isFaintedCatch || wildHP <= 0
      ? getFaintedCatchRate()
      : getCatchRate(wildPokemon, wildHP);
    const catchRate = getSeasonalCatchRate(baseCatchRate, seasonalEvent, wildPokemon);
    const success = Math.random() < catchRate;
    const wobbles = success ? 3 : Math.floor(Math.random() * 3) + 1;

    // Throw animation
    setPhase(PHASE.CATCH_THROW);
    setMessage(`Go, ${ballPresentation.name}!`);
    playSfx('ball_throw');
    await wait(1200);

    // Wobble animation
    setPhase(PHASE.CATCH_WOBBLE);
    setWobbleCount(0);
    for (let i = 0; i < wobbles; i++) {
      await wait(800);
      setWobbleCount(i + 1);
      playSfx('ball_wobble');
    }
    await wait(600);

    if (success) {
      setPhase(PHASE.CATCH_SUCCESS);
      setShowConfetti(true);
      setMessage(`You caught ${wildPokemon.name}!`);
      playSfx('catch_success');
      vibrate([50, 50, 50, 50, 150]);
      // End battle after celebration
      await wait(2500);
      const xpGain = getSeasonalXpReward(XP_REWARDS[wildPokemon.rarity] || 10, seasonalEvent, wildPokemon);
      onEnd({
        caught: true,
        battleWon: true,
        xpGained: xpGain,
        teamHP: team.map(p => p.currentHP),
        pokemon: wildPokemon,
      });
    } else {
      setPhase(PHASE.CATCH_FAIL);
      setMessage(`Oh no! ${wildPokemon.name} broke free!`);
      playSfx('catch_fail');
      await wait(1200);

      if (wildHP <= 0) {
        // Fainted pokemon, try again
        setPhase(PHASE.FAINTED_WILD_CATCH);
        setMessage('Try again!');
      } else {
        // Enemy attacks after failed catch
        await enemyAttack(team, activeIndex);
      }
    }
  }, [phase, wildHP, wildPokemon, team, activeIndex, onEnd, enemyAttack, seasonalEvent, ballPresentation.name]);

  // ═══ ACTION: RUN ═══
  const handleRun = useCallback(async () => {
    if (phase !== PHASE.CHOOSE) return;

    const escaped = Math.random() < 0.80;
    if (escaped) {
      setPhase(PHASE.RUN_SUCCESS);
      setMessage('Got away safely!');
      await wait(1200);
      onEnd({
        caught: false,
        xpGained: 0,
        teamHP: team.map(p => p.currentHP),
        pokemon: null,
      });
    } else {
      setPhase(PHASE.RUN_FAIL);
      setMessage("Can't escape!");
      await wait(1000);
      // Enemy attacks
      await enemyAttack(team, activeIndex);
    }
  }, [phase, team, activeIndex, onEnd, enemyAttack]);

  // ═══ ACTION: SWITCH ═══
  const handleSwitch = useCallback((index) => {
    if (index === activeIndex) return;
    if (team[index].currentHP <= 0) return;

    setActiveIndex(index);
    setPhase(PHASE.PLAYER_ENTER);
    setMessage(`Go, ${team[index].name}!`);

    setTimeout(async () => {
      await wait(1000);
      // Enemy attacks after switch
      const result = await enemyAttack(team, index);
      // Update if needed
    }, 0);
  }, [activeIndex, team, enemyAttack]);

  // ═══ TEAM WIPE: End battle ═══
  const handleTeamWiped = useCallback(() => {
    onEnd({
      caught: false,
      xpGained: 0,
      teamHP: team.map(p => p.currentHP),
      pokemon: null,
      teamWiped: true,
    });
  }, [team, onEnd]);

  // ═══ FAINTED WILD: Give up ═══
  const handleGiveUp = useCallback(() => {
    const xpGain = getSeasonalXpReward(Math.floor((XP_REWARDS[wildPokemon.rarity] || 10) / 2), seasonalEvent, wildPokemon);
    onEnd({
      caught: false,
      battleWon: true,
      xpGained: xpGain,
      teamHP: team.map(p => p.currentHP),
      pokemon: wildPokemon,
    });
  }, [team, wildPokemon, onEnd, seasonalEvent]);

  const rarity = rarityConfig[wildPokemon.rarity] || rarityConfig.Common;
  const wildImg = getImage(wildPokemon);
  const playerImg = activePokemon ? getImage(activePokemon) : null;
  const playerRarity = activePokemon ? (rarityConfig[activePokemon.rarity] || rarityConfig.Common) : null;

  const aliveTeam = team.filter(p => p.currentHP > 0);
  const canSwitch = aliveTeam.length > 1;
  const wildHPRatio = wildMaxHP > 0 ? wildHP / wildMaxHP : 0;

  const showActions = phase === PHASE.CHOOSE;
  const showSwitch = phase === PHASE.SWITCH;
  const showFaintedCatch = phase === PHASE.FAINTED_WILD_CATCH;

  return (
    <div className="fixed inset-0 z-50 flex flex-col gold-battle">
      <style>{battleStyles}</style>

      {/* ═══ CONFETTI ═══ */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-[60]">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: Math.random() * 100 + '%',
                top: '-5%',
                fontSize: Math.random() * 20 + 14 + 'px',
                animation: `confetti-fall ${2 + Math.random() * 2}s linear forwards`,
                animationDelay: `${Math.random() * 0.8}s`,
              }}
            >
              {['✨', '⭐', '🌟', '💫', '🎉', '🎊', '❤️', '💛'][Math.floor(Math.random() * 8)]}
            </div>
          ))}
        </div>
      )}

      {/* ═══ BATTLE ARENA ═══ */}
      <div className="flex-1 relative overflow-hidden px-4 pt-4">

        {/* Wild Pokemon — top right */}
        <div
          className="absolute top-4 right-4 left-4"
          style={{
            animation: phase === PHASE.INTRO ? 'slideInRight 0.8s ease-out' : undefined,
          }}
        >
          {/* Name + HP */}
          <div className="pixel-panel p-3 max-w-[260px] ml-auto mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="font-black text-sm md:text-base pixel-text truncate">
                {typeEmojis[wildPokemon.type] || '⚪'} {wildPokemon.name}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: rarity.color + '30', color: rarity.color }}>
                Lv.{Math.floor((wildPokemon.power_level || 10) / 5) + 1}
              </span>
            </div>
            <HPBar current={wildHP} max={wildMaxHP} />
            {wildHPRatio < 0.5 && wildHP > 0 && (
              <div className="text-[10px] font-bold pixel-muted mt-1 animate-pulse">
                ⚠️ The Pokémon is weakened!
              </div>
            )}
          </div>

          {/* Wild Pokemon Image */}
          <div className="flex justify-end pr-4">
            <div
              className={`relative w-32 h-32 md:w-40 md:h-40 ${wildShake ? 'battle-shake' : ''}`}
              style={{
                animation: phase === PHASE.INTRO ? 'encounter-bounce 2s ease-in-out infinite' : undefined,
                filter: wildFlashRed ? 'brightness(2) saturate(0) hue-rotate(0deg)' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                transition: 'filter 0.15s',
                transform: wildLunge ? 'translateX(-30px) translateY(20px)' : 'none',
              }}
            >
              {wildHP > 0 ? (
                <img src={wildImg} alt={wildPokemon.name} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
              ) : (
                <img src={wildImg} alt={wildPokemon.name} className="w-full h-full object-contain opacity-30" style={{ filter: 'grayscale(1)' }} />
              )}
              {wildDamage && (
                <DamageNumber
                  damage={wildDamage.damage}
                  isCritical={wildDamage.isCritical}
                  position={{ top: '10px', left: '50%', transform: 'translateX(-50%)' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Player Pokemon — bottom left */}
        {activePokemon && (
          <div
            className="absolute bottom-4 left-4 right-4"
            style={{
              animation: phase === PHASE.PLAYER_ENTER ? 'slideInLeft 0.8s ease-out' : undefined,
            }}
          >
            {/* Player Pokemon Image */}
            <div className="flex justify-start pl-4 mb-2">
              <div
                className={`relative w-32 h-32 md:w-40 md:h-40 ${playerShake ? 'battle-shake' : ''}`}
                style={{
                  filter: playerFlashRed ? 'brightness(2) saturate(0)' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                  transition: 'filter 0.15s',
                  transform: playerLunge ? 'translateX(30px) translateY(-20px)' : 'none',
                  opacity: activePokemon.currentHP <= 0 ? 0.3 : 1,
                }}
              >
                <img src={playerImg} alt={activePokemon.name} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated', transform: 'scaleX(-1)' }} />
                {playerDamage && (
                  <DamageNumber
                    damage={playerDamage.damage}
                    isCritical={playerDamage.isCritical}
                    position={{ top: '10px', left: '50%', transform: 'translateX(-50%)' }}
                  />
                )}
              </div>
            </div>

            {/* Name + HP */}
            <div className="pixel-panel p-3 max-w-[260px]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-sm md:text-base pixel-text truncate">
                  {typeEmojis[activePokemon.type] || '⚪'} {activePokemon.name}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: (playerRarity?.color || '#999') + '30', color: playerRarity?.color || '#999' }}>
                  Lv.{Math.floor((activePokemon.power_level || 10) / 5) + 1}
                </span>
              </div>
              <HPBar current={activePokemon.currentHP} max={activePokemon.maxHP} />
            </div>
          </div>
        )}

        {/* ═══ CENTER EFFECTS ═══ */}

        {/* Attack word */}
        {(phase === PHASE.PLAYER_HIT || phase === PHASE.ENEMY_HIT) && attackWord && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div
              className="text-6xl md:text-8xl font-black"
              style={{
                color: '#facc15',
                textShadow: '0 0 40px #facc15, 0 0 80px #f97316, 0 4px 8px #000',
                animation: 'attack-word 0.6s ease-out forwards',
              }}
            >
              {attackWord}
            </div>
          </div>
        )}

        {/* Effectiveness text */}
        {phase === PHASE.EFFECTIVENESS_MSG && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div
              className="text-3xl md:text-4xl font-black text-center px-4"
              style={{
                color: effectivenessText === 'super-effective' ? '#facc15' : '#9ca3af',
                textShadow: effectivenessText === 'super-effective'
                  ? '0 0 30px #facc15, 0 2px 4px #000'
                  : '0 2px 4px #000',
                animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {effectivenessText === 'super-effective' ? "Super effective! 💥" : "Not very effective... 😕"}
            </div>
          </div>
        )}

        {/* Catch animations */}
        {phase === PHASE.CATCH_THROW && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="text-8xl" style={{ animation: 'throw-ball 1s cubic-bezier(0.2, 0, 0.2, 1) forwards' }}>
              {ballPresentation.icon}
            </div>
          </div>
        )}

        {phase === PHASE.CATCH_WOBBLE && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40">
            <div className="text-8xl mb-4" style={{ animation: 'wobble 0.6s ease-in-out infinite' }}>
              {ballPresentation.icon}
            </div>
            <div className="flex gap-3">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: i <= wobbleCount ? '#facc15' : '#374151',
                    boxShadow: i <= wobbleCount ? '0 0 10px #facc15' : 'none',
                    transform: i <= wobbleCount ? 'scale(1.3)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
            <p className="text-xl font-black text-yellow-300 mt-3" style={{ animation: 'pulse-text 1s ease-in-out infinite' }}>
              {wobbleCount === 0 ? '...' : wobbleCount === 1 ? 'One shake...' : wobbleCount === 2 ? 'Two shakes...' : 'Three shakes...!'}
            </p>
          </div>
        )}

        {/* Catch success overlay */}
        {phase === PHASE.CATCH_SUCCESS && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
            <div style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <div className="text-7xl mb-3" style={{ animation: 'celebration-spin 0.6s ease-out' }}>🎉</div>
              <h2
                className="text-5xl md:text-6xl font-black mb-4"
                style={{
                  background: 'linear-gradient(135deg, #facc15, #f59e0b, #facc15)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 20px #facc1580)',
                }}
              >
                GOTCHA!
              </h2>
              <div className="pixel-panel p-4 max-w-xs mx-auto">
                <div className="w-20 h-20 mx-auto mb-2 flex items-center justify-center">
                  <img src={wildImg} alt={wildPokemon.name} className="max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                </div>
                <p className="text-base font-black pixel-text">{wildPokemon.name}</p>
                <p className="text-[10px] pixel-muted">{'⭐'.repeat(rarity.stars)} {rarity.label}</p>
                <p className="text-[10px] font-bold" style={{ color: "#2f6b2f" }}>Added to your collection!</p>
                <p
                  className="text-sm font-black"
                  style={{
                    color: "#7a5a1f",
                    animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',
                  }}
                >
                  +{getSeasonalXpReward(XP_REWARDS[wildPokemon.rarity] || 10, seasonalEvent, wildPokemon)} XP
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Team wiped */}
        {phase === PHASE.TEAM_WIPED && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/60">
            <div style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <div className="text-7xl mb-4">😵</div>
              <h2 className="text-lg font-black" style={{ color: "#8a3f2b" }}>All Pokémon fainted!</h2>
              <p className="text-sm pixel-muted mb-4">You need to heal your team...</p>
              <button
                onClick={handleTeamWiped}
                className="pixel-btn pixel-btn-danger text-sm md:text-base px-6 py-3 rounded-none"
              >
                🏃 Retreat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MESSAGE BAR ═══ */}
      <div className="px-4 pb-2">
        <div className="pixel-panel px-4 py-3">
          <p className="text-sm md:text-base font-black pixel-text text-center" style={{ minHeight: '28px' }}>
            {message}
          </p>
        </div>
      </div>

      {/* ═══ ACTION BUTTONS ═══ */}
      <div className="px-4 pb-6">
        {/* Main actions */}
        {showActions && (
          <div className="grid grid-cols-2 gap-3" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Attack */}
            <button
              onClick={handleAttack}
              className="group relative"
            >
              <div className="hidden" />
              <div className="relative pixel-btn pixel-btn-attack w-full text-sm md:text-base px-4 py-4 rounded-none">
                ⚔️ Attack!
              </div>
            </button>

            {/* Catch */}
            <button
              onClick={() => handleCatch(false)}
              className="group relative"
            >
              <div className="hidden" />
              <div className={`relative pixel-btn ${ballPresentation.buttonClass} w-full text-sm md:text-base px-4 py-4 rounded-none`}>
                {ballPresentation.icon} Catch!
              </div>
            </button>

            {/* Switch */}
            <button
              onClick={() => canSwitch ? setPhase(PHASE.SWITCH) : null}
              className="group relative"
              style={{ opacity: canSwitch ? 1 : 0.4 }}
              disabled={!canSwitch}
            >
              <div className="hidden" />
              <div className="relative pixel-btn pixel-btn-switch w-full text-sm md:text-base px-4 py-4 rounded-none">
                🔄 Switch
              </div>
            </button>

            {/* Run */}
            <button
              onClick={handleRun}
              className="group relative"
            >
              <div className="hidden" />
              <div className="relative pixel-btn pixel-btn-run w-full text-sm md:text-base px-4 py-4 rounded-none">
                🏃 Run!
              </div>
            </button>
          </div>
        )}

        {/* Switch panel */}
        {phase === PHASE.SWITCH && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <p className="text-center pixel-text font-bold mb-3 text-sm">Choose your Pokémon:</p>
            <div className="grid gap-2">
              {team.map((p, i) => {
                const isActive = i === activeIndex;
                const isAlive = p.currentHP > 0;
                return (
                  <button
                    key={i}
                    onClick={() => isAlive && !isActive ? handleSwitch(i) : null}
                    disabled={!isAlive || isActive}
                    className={`flex items-center gap-3 p-3 pixel-card transition-all ${
                      isActive
                        ? 'pixel-ring'
                        : isAlive
                        ? 'hover:-translate-y-0.5'
                        : 'opacity-40'
                    }`}
                  >
                    <div className="w-12 h-12 flex-shrink-0">
                      <img src={getImage(p)} alt={p.name} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated', filter: isAlive ? 'none' : 'grayscale(1)' }} />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-black pixel-text text-sm">{typeEmojis[p.type] || '⚪'} {p.name}</span>
                      <HPBar current={p.currentHP} max={p.maxHP} size="small" />
                    </div>
                    {isActive && <span className="text-[10px] font-bold" style={{ color: "#7a5a1f" }}>Active</span>}
                    {!isAlive && <span className="text-[10px] font-bold" style={{ color: "#8a3f2b" }}>Fainted</span>}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { setPhase(PHASE.CHOOSE); setMessage('What will you do?'); }}
              className="w-full mt-3 pixel-muted hover:brightness-110 transition font-bold text-sm py-2"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Fainted wild catch opportunity */}
        {showFaintedCatch && (
          <div className="flex flex-col gap-3" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <button
              onClick={() => handleCatch(true)}
              className="group relative w-full"
              style={{ animation: 'float 2s ease-in-out infinite' }}
            >
              <div className="hidden" />
              <div className={`relative pixel-btn ${ballPresentation.buttonClass} w-full text-sm md:text-base px-6 py-4 rounded-none`}>
                {ballPresentation.icon} Throw {ballPresentation.name}! {ballPresentation.icon}
              </div>
            </button>
            <button
              onClick={handleGiveUp}
              className="pixel-muted hover:brightness-110 transition font-bold text-sm py-2"
            >
              Leave it be (+{getSeasonalXpReward(Math.floor((XP_REWARDS[wildPokemon.rarity] || 10) / 2), seasonalEvent, wildPokemon)} XP)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// BATTLE-SPECIFIC ANIMATION STYLES
// ═══════════════════════════════════════════
const battleStyles = `
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
  @keyframes slideInRight {
    from { transform: translateX(100px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideInLeft {
    from { transform: translateX(-100px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes attack-word {
    0% { transform: scale(0.5); opacity: 0; }
    30% { transform: scale(1.4); opacity: 1; }
    100% { transform: scale(1); opacity: 0; }
  }
  @keyframes damage-float {
    0% { transform: translateX(-50%) translateY(0); opacity: 1; }
    100% { transform: translateX(-50%) translateY(-60px); opacity: 0; }
  }
  .battle-shake {
    animation: battle-shake 0.4s ease-out !important;
  }
  @keyframes battle-shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
    20%, 40%, 60%, 80% { transform: translateX(6px); }
  }
  @keyframes throw-ball {
    0% { transform: translateY(100px) scale(1); opacity: 1; }
    40% { transform: translateY(-40px) scale(0.8); opacity: 1; }
    70% { transform: translateY(-20px) scale(0.6); opacity: 1; }
    100% { transform: translateY(0) scale(0.5); opacity: 0.5; }
  }
  @keyframes wobble {
    0%, 100% { transform: rotate(0deg); }
    20% { transform: rotate(-25deg); }
    40% { transform: rotate(20deg); }
    60% { transform: rotate(-15deg); }
    80% { transform: rotate(10deg); }
  }
  @keyframes confetti-fall {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  @keyframes celebration-spin {
    from { transform: rotate(0deg) scale(0.5); }
    to { transform: rotate(360deg) scale(1); }
  }
  .gold-battle {
    background: linear-gradient(180deg, #2b1c0b 0%, #6b4b1a 45%, #c8a75a 100%);
    color: #2b1c0b;
    font-family: "Press Start 2P", "VT323", monospace;
    letter-spacing: 0.3px;
  }
  .pixel-panel {
    background: #f7e8b4;
    border: 3px solid #6b4b1a;
    box-shadow: inset -3px -3px 0 #c49a4a, inset 3px 3px 0 #fff4cf, 0 4px 0 #3b2a10;
  }
  .pixel-panel-dark {
    background: #3b2a10;
    color: #f7e8b4;
    border: 3px solid #f1d27a;
    box-shadow: inset -3px -3px 0 #2b1c0b, inset 3px 3px 0 #6b4b1a, 0 4px 0 #1a1207;
  }
  .pixel-hp-shell {
    background: #3b2a10;
    border: 2px solid #6b4b1a;
    box-shadow: inset -2px -2px 0 #2b1c0b, inset 2px 2px 0 #6b4b1a;
    border-radius: 4px;
  }
  .pixel-hp-text {
    color: #6b4b1a;
  }
  .pixel-text {
    color: #3b2a10;
  }
  .pixel-muted {
    color: #6b4b1a;
  }
  .pixel-card {
    background: #fff3c8;
    border: 3px solid #6b4b1a;
    box-shadow: inset -3px -3px 0 #e0c073, inset 3px 3px 0 #fff8d9, 0 4px 0 #3b2a10;
  }
  .pixel-ring {
    box-shadow: 0 0 0 2px #f1d27a, 0 0 0 5px #6b4b1a;
  }
  .pixel-btn {
    background: #e3c36a;
    color: #3b2a10;
    border: 3px solid #6b4b1a;
    box-shadow: inset -2px -2px 0 #c49a4a, inset 2px 2px 0 #fff4cf, 0 3px 0 #3b2a10;
    text-transform: uppercase;
  }
  .pixel-btn:hover {
    filter: brightness(1.05);
  }
  .pixel-btn:active {
    transform: translateY(2px);
    box-shadow: inset -2px -2px 0 #c49a4a, inset 2px 2px 0 #fff4cf, 0 1px 0 #3b2a10;
  }
  .pixel-btn-attack {
    background: #d8923b;
    color: #2b1c0b;
    border-color: #6b4b1a;
  }
  .pixel-btn-catch {
    background: #b2553a;
    color: #fff4cf;
    border-color: #5b2316;
    box-shadow: inset -2px -2px 0 #8a3f2b, inset 2px 2px 0 #e27a5a, 0 3px 0 #3b140c;
  }
  .pixel-btn-premier {
    background: #f8fafc;
    color: #1f2937;
    border-color: #64748b;
    box-shadow: inset -2px -2px 0 #cbd5e1, inset 2px 2px 0 #ffffff, 0 3px 0 #334155;
  }
  .pixel-btn-switch {
    background: #9fb9d4;
    color: #1e2b3a;
    border-color: #3d4f67;
    box-shadow: inset -2px -2px 0 #6e8aa6, inset 2px 2px 0 #d7e5f3, 0 3px 0 #1f2a38;
  }
  .pixel-btn-run {
    background: #8a8a8a;
    color: #1c1c1c;
    border-color: #4a4a4a;
    box-shadow: inset -2px -2px 0 #6d6d6d, inset 2px 2px 0 #cfcfcf, 0 3px 0 #2f2f2f;
  }
  .pixel-btn-danger {
    background: #b2553a;
    color: #fff4cf;
    border: 3px solid #5b2316;
    box-shadow: inset -2px -2px 0 #8a3f2b, inset 2px 2px 0 #e27a5a, 0 3px 0 #3b140c;
  }
`;
