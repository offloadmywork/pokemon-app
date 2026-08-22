import { useState, useEffect, useCallback } from "react";
import {
  loadTeamAsync,
  saveTeamAsync,
  removeFromTeamAsync,
  moveTeamMember,
  getTeamSynergySummary,
} from "@/game/team";
import { typeEmojis, rarityConfig, getPokemonImage } from "@/game/constants";
import { Button } from "@/components/ui/button";
import { Shield, HeartPulse, Plus } from "lucide-react";
import { pokemonAPI } from "@/api/client";

function getImg(pokemon) {
  if (pokemon.image_url && pokemon.image_url.length > 100) return pokemon.image_url;
  return getPokemonImage(pokemon);
}

// Team management destination (E2.2 — real Team page replacing the
// Collection redirect). Team state flows through @/game/team so persistence
// (API + localStorage fallback) stays in one place.
export default function TeamPage({ onNavigate, apiClient = pokemonAPI }) {
  const [team, setTeam] = useState([]);
  const [caught, setCaught] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const teamSynergy = getTeamSynergySummary(team);

  const refresh = useCallback(async () => {
    try {
      const loadedTeam = await loadTeamAsync();
      setTeam(Array.isArray(loadedTeam) ? loadedTeam : []);
      if (apiClient?.getCaughtPokemon) {
        const caughtList = await apiClient.getCaughtPokemon();
        setCaught(Array.isArray(caughtList) ? caughtList : []);
      }
    } catch {
      setMessage("Failed to load your team. Try refreshing.");
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = async (nextTeam) => {
    try {
      if (apiClient?.setTeam) await apiClient.setTeam(nextTeam);
      else await saveTeamAsync(nextTeam);
    } catch {
      setMessage("Could not sync your team — changes saved locally.");
    }
  };

  const handleMove = async (fromIndex, toIndex) => {
    const next = moveTeamMember(team, fromIndex, toIndex);
    setTeam(next);
    await persist(next);
  };

  const handleRemove = async (pokemonId) => {
    const next = team.filter((p) => p.pokemon_id !== pokemonId);
    setTeam(next);
    await persist(next);
    try {
      await removeFromTeamAsync(pokemonId);
    } catch {
      // State already updated optimistically; persistence retried on next save.
    }
    setMessage("Removed from team.");
  };

  const handleAdd = async (pokemon) => {
    const memberId = pokemon.id || pokemon.pokemon_id;
    const maxHP = Number(pokemon.maxHP) || 30;
    const newMember = {
      pokemon_id: memberId,
      name: pokemon.name,
      type: pokemon.type,
      image_url: pokemon.image_url,
      power_level: pokemon.power_level,
      rarity: pokemon.rarity,
      currentHP: pokemon.currentHP ?? maxHP,
      maxHP: pokemon.maxHP ?? maxHP,
    };
    if (team.length >= 3) {
      setMessage("Team is full! (max 3)");
      return;
    }
    if (team.some((p) => p.pokemon_id === memberId)) {
      setMessage("Already on your team!");
      return;
    }
    const next = [...team, newMember];
    setTeam(next);
    await persist(next);
    setMessage(`${pokemon.name} joined your team!`);
  };

  const handleHeal = async () => {
    try {
      if (apiClient?.healTeam) await apiClient.healTeam();
      const healed = team.map((p) => ({ ...p, currentHP: p.maxHP }));
      setTeam(healed);
      setMessage("Your team is fully healed!");
    } catch {
      setMessage("Healing failed — try again.");
    }
  };

  const bench = caught.filter(
    (p) => !team.some((member) => member.pokemon_id === (p.pokemon_id || p.id))
  );

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-1 flex items-center gap-2 drop-shadow-lg">
          <Shield className="w-7 h-7" /> My Battle Team ({team.length}/3)
        </h1>
        <p className="text-white/90 font-semibold mb-6">Up to 3 Pokémon fight together. Lead with your strongest.</p>

        {isLoading && <div className="pixel-panel-dark p-4 text-center pixel-text">Loading team…</div>}

        {!isLoading && message && (
          <div className="pixel-panel-dark px-4 py-2 mb-4 text-xs md:text-sm font-bold text-center" role="status">
            {message}
          </div>
        )}

        {!isLoading && (
          <>
            {team.length === 0 ? (
              <div className="pixel-panel p-5 mb-6 text-center">
                <p className="pixel-muted font-bold mb-2">No Pokémon on your team yet!</p>
                <p className="pixel-muted text-sm">Pick teammates from the bench below ⬇️</p>
              </div>
            ) : (
              <>
                <div className="pixel-inset p-3 mb-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-xs font-black pixel-text">Team Synergy</div>
                      <div className="mt-1 text-xs md:text-sm font-bold pixel-muted">{teamSynergy.message}</div>
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

                <ul className="space-y-3 mb-6">
                  {team.map((p, i) => {
                    const rarity = rarityConfig[p.rarity] || rarityConfig.Common;
                    const hpRatio = p.maxHP > 0 ? p.currentHP / p.maxHP : 1;
                    const hpColor = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
                    return (
                      <li key={p.pokemon_id || `${p.name}-${i}`} className="pixel-card p-3 flex items-center gap-3">
                        <span className="text-[10px] font-black pixel-muted uppercase">Slot {i + 1}</span>
                        <div className="w-14 h-14 flex-shrink-0 pixel-inset flex items-center justify-center">
                          <img src={getImg(p)} alt={p.name} className="max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span>{typeEmojis[p.type] || '⚪'}</span>
                            <span className="font-black pixel-text text-sm truncate">{p.name}</span>
                            <span className="text-[10px] font-bold" style={{ color: rarity.color }}>{p.rarity}</span>
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
                          <button type="button" aria-label={`Move ${p.name} up`} disabled={i === 0}
                            onClick={() => handleMove(i, i - 1)}
                            className="pixel-btn h-7 w-7 text-[10px] font-black disabled:opacity-40">↑</button>
                          <button type="button" aria-label={`Move ${p.name} down`} disabled={i === team.length - 1}
                            onClick={() => handleMove(i, i + 1)}
                            className="pixel-btn-secondary h-7 w-7 text-[10px] font-black disabled:opacity-40">↓</button>
                          <button type="button" aria-label={`Remove ${p.name}`}
                            onClick={() => handleRemove(p.pokemon_id)}
                            className="pixel-btn-danger h-7 w-7 text-[10px] font-bold">×</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <Button onClick={handleHeal} className="mb-8 h-12 px-6 text-base font-bold w-full sm:w-auto">
                  <HeartPulse className="w-5 h-5 mr-2" /> Heal Team
                </Button>
              </>
            )}

            <h2 className="text-xl font-black text-white mb-3 flex items-center gap-2 drop-shadow-lg">
              <Plus className="w-5 h-5" /> Bench — pick teammates
            </h2>
            {bench.length === 0 ? (
              <div className="pixel-panel p-4 text-center pixel-muted text-sm">
                Everyone you've caught is already on the team.{" "}
                <button type="button" onClick={() => onNavigate?.('browse')} className="underline font-bold">
                  Catch more Pokémon!
                </button>
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bench.map((p) => (
                  <li key={p.pokemon_id || p.id} className="pixel-card p-3 flex items-center gap-3">
                    <div className="w-12 h-12 flex-shrink-0 pixel-inset flex items-center justify-center">
                      <img src={getImg(p)} alt={p.name} className="max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span>{typeEmojis[p.type] || '⚪'}</span>
                        <span className="font-black pixel-text text-sm truncate">{p.name}</span>
                      </div>
                      <span className="text-[10px] font-bold pixel-muted">{p.type}</span>
                    </div>
                    <Button size="sm" aria-label={`Add ${p.name}`} onClick={() => handleAdd(p)}>
                      Add
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
