import { useState, useEffect, useCallback, useMemo } from "react";
import { pokemonAPI } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  loadTeamAsync,
  saveTeamAsync,
  healTeamAsync,
  addToTeam,
  removeFromTeam,
  moveTeamMember,
  getTeamSynergySummary,
  MAX_TEAM_SIZE,
} from "@/game/team";
import { typeEmojis, rarityConfig } from "@/game/constants";

// ═══════════════════════════════════════════
// TEAM PAGE — first-class team management (Epic E2.2)
// ═══════════════════════════════════════════

function getImage(pokemon) {
  if (pokemon.image_url && pokemon.image_url.length > 100) return pokemon.image_url;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemon_id || 1}.png`;
}

export default function TeamPage({ apiClient = pokemonAPI }) {
  const [team, setTeam] = useState([]);
  const [caught, setCaught] = useState([]);
  const [teamMessage, setTeamMessage] = useState('');
  const [needsHealing, setNeedsHealing] = useState(false);

  const flashMessage = useCallback((message) => {
    setTeamMessage(message);
    setTimeout(() => setTeamMessage(''), 2000);
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const savedTeam = await loadTeamAsync();
        if (!isMounted) return;
        setTeam(savedTeam);
      } catch {
        if (isMounted) setTeam([]);
      }

      try {
        const allCaught = await apiClient.getCaughtPokemon();
        if (!isMounted) return;
        setCaught(Array.isArray(allCaught) ? allCaught : []);
      } catch {
        if (isMounted) setCaught([]);
      }
    })();

    return () => { isMounted = false; };
  }, [apiClient]);

  useEffect(() => {
    const hurt = team.some((p) => p.currentHP < p.maxHP && p.currentHP > 0);
    const fainted = team.some((p) => p.currentHP <= 0);
    setNeedsHealing(hurt || fainted);
  }, [team]);

  const teamSynergy = useMemo(() => getTeamSynergySummary(team), [team]);
  const onTeamIds = new Set(team.map((p) => String(p.pokemon_id)));
  const bench = caught.filter((p) => !onTeamIds.has(String(p.pokemon_id)));

  const persistTeam = useCallback(async (nextTeam) => {
    setTeam(nextTeam);
    try {
      await saveTeamAsync(nextTeam);
    } catch {
      // Keep local state; sync retries next mutation.
    }
  }, []);

  const handleHealAll = async () => {
    try {
      await healTeamAsync();
      const healed = team.map((p) => ({ ...p, currentHP: p.maxHP }));
      await persistTeam(healed);
      flashMessage('Team fully healed! 💖');
    } catch {
      flashMessage('Could not heal right now.');
    }
  };

  const handleMoveTeamMember = (fromIndex, toIndex) => {
    const newTeam = moveTeamMember(team, fromIndex, toIndex);
    persistTeam(newTeam);
  };

  const handleRemoveFromTeam = (pokemonId) => {
    const newTeam = team.filter((p) => String(p.pokemon_id) !== String(pokemonId));
    persistTeam(newTeam);
    flashMessage('Removed from team');
  };

  const handleAddToTeam = (pokemon) => {
    if (team.length >= MAX_TEAM_SIZE) {
      flashMessage(`Team is full (${MAX_TEAM_SIZE})!`);
      return;
    }
    const withHp = { ...pokemon, maxHP: pokemon.maxHP || 30, currentHP: pokemon.currentHP ?? pokemon.maxHP ?? 30 };
    persistTeam([...team, withHp]);
    flashMessage(`${pokemon.name} joined the team!`);
  };

  return (
    <div className="min-h-screen bg-[#f5efdc] px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-2xl md:text-3xl font-black pixel-text mb-6">⚔️ Team Management</h1>

        <div className="pixel-panel p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg md:text-xl font-black pixel-text">
              ⚔️ My Battle Team ({team.length}/{MAX_TEAM_SIZE})
            </h2>
            <div className="flex gap-2">
              {needsHealing && (
                <Button
                  onClick={handleHealAll}
                  className="h-10 px-4 text-sm md:text-base font-bold pixel-btn-success rounded-none"
                >
                  💖 Heal All
                </Button>
              )}
            </div>
          </div>

          {teamMessage && (
            <div className="pixel-panel-dark px-4 py-2 mb-3 text-xs md:text-sm font-bold text-center" role="status">
              {teamMessage}
            </div>
          )}

          {team.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-base md:text-lg pixel-muted font-bold mb-2">No Pokémon on your team yet!</p>
              <p className="text-xs md:text-sm pixel-muted">Add Pokémon from your roster below ⬇️</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="pixel-inset p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-xs font-black pixel-text">Team Synergy</div>
                    <div className="mt-1 text-xs md:text-sm font-bold pixel-muted">
                      {teamSynergy.message}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="pixel-badge px-2 py-1 text-[10px] font-black">
                      {teamSynergy.typeCount} types ready
                    </span>
                    {teamSynergy.types.map((type) => (
                      <span key={type} className="pixel-badge px-2 py-1 text-[10px] font-black">
                        {typeEmojis[type] || '⚪'} {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {team.map((p, i) => {
                  const hpRatio = p.maxHP > 0 ? p.currentHP / p.maxHP : 1;
                  const hpColor = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
                  return (
                    <div key={p.pokemon_id || `${p.name}-${i}`} className="pixel-card p-3 flex items-center gap-3">
                      <div className="w-16 h-16 flex-shrink-0 pixel-inset flex items-center justify-center">
                        <img src={getImage(p)} alt={p.name} className="max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span aria-hidden="true">{typeEmojis[p.type] || '⚪'}</span>
                          <span className="font-black pixel-text text-sm truncate">{p.name}</span>
                        </div>
                        <div className="h-3 pixel-hp-shell mt-1">
                          <div style={{
                            width: `${Math.max(0, hpRatio * 100)}%`,
                            background: hpColor,
                            transition: 'width 0.3s',
                            height: '100%',
                            borderRadius: '2px',
                          }} />
                        </div>
                        <span className="text-[10px] font-bold pixel-muted">HP: {p.currentHP}/{p.maxHP}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          aria-label={`Move ${p.name} up`}
                          disabled={i === 0}
                          onClick={() => handleMoveTeamMember(i, i - 1)}
                          className="pixel-btn h-7 w-7 text-[10px] font-black rounded-none disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${p.name} down`}
                          disabled={i === team.length - 1}
                          onClick={() => handleMoveTeamMember(i, i + 1)}
                          className="pixel-btn-secondary h-7 w-7 text-[10px] font-black rounded-none disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${p.name} from team`}
                          onClick={() => handleRemoveFromTeam(p.pokemon_id)}
                          className="pixel-btn-danger h-7 w-7 text-[10px] font-bold rounded-none"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bench — add from collection */}
        <div className="pixel-panel p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-black pixel-text mb-4">
            📦 Available Pokémon ({bench.length})
          </h2>
          {bench.length === 0 ? (
            <p className="text-sm pixel-muted text-center py-4">
              Everyone is already on the team. Catch more Pokémon!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bench.map((p) => {
                const rarity = rarityConfig[p.rarity] || rarityConfig.Common;
                return (
                  <div key={p.pokemon_id} className="pixel-card p-3 flex items-center gap-3">
                    <div className="w-12 h-12 flex-shrink-0 pixel-inset flex items-center justify-center">
                      <img src={getImage(p)} alt={p.name} className="max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span aria-hidden="true">{typeEmojis[p.type] || '⚪'}</span>
                        <span className="font-black pixel-text text-sm truncate">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: rarity.color + '30', color: rarity.color }}>
                        {p.rarity}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleAddToTeam(p)}
                      aria-label={`Add ${p.name} to team`}
                      className="h-9 px-3 text-xs font-bold rounded-none"
                      disabled={team.length >= MAX_TEAM_SIZE}
                    >
                      Add
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
