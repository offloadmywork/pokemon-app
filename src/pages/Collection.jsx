import { useState, useEffect, useCallback, useMemo } from "react";
import { pokemonAPI } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPokemonImage, rarityConfig } from "@/game/constants";
import TypeBadge from "@/components/TypeBadge";
import { getMaxHP } from "@/game/battle";
import { 
  loadTeam,
  loadTeamAsync, 
  saveTeam,
  saveTeamAsync, 
  healTeamAsync, 
  addToTeamAsync, 
  removeFromTeamAsync, 
  isOnTeam, 
  moveTeamMember,
  getTeamSynergySummary,
  MAX_TEAM_SIZE 
} from "@/game/team";

const ITEMS_PER_PAGE = 12;

const ALL_FILTER = 'all';

const getCaughtSearchFields = (caught) => {
  const pokemon = caught?.pokemon || {};
  return {
    name: caught?.name || pokemon.name || '',
    nickname: caught?.nickname || '',
    type: caught?.type || pokemon.type || '',
    rarity: caught?.rarity || pokemon.rarity || '',
  };
};

const filterCaughtPokemon = (caughtList, { searchTerm, typeFilter, rarityFilter }) => {
  const search = searchTerm.trim().toLowerCase();

  return caughtList.filter((caught) => {
    const fields = getCaughtSearchFields(caught);
    const searchText = `${fields.name} ${fields.nickname} ${fields.type} ${fields.rarity}`.toLowerCase();
    const matchesSearch = !search || searchText.includes(search);
    const matchesType = typeFilter === ALL_FILTER || fields.type === typeFilter;
    const matchesRarity = rarityFilter === ALL_FILTER || fields.rarity === rarityFilter;

    return matchesSearch && matchesType && matchesRarity;
  });
};

const collectionStyles = `
  .gold-collection {
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
  .pixel-card {
    background: #fff3c8;
    border: 3px solid #6b4b1a;
    box-shadow: inset -3px -3px 0 #e0c073, inset 3px 3px 0 #fff8d9, 0 4px 0 #3b2a10;
  }
  .pixel-inset {
    background: #f0d48b;
    border: 2px solid #6b4b1a;
    box-shadow: inset -2px -2px 0 #c49a4a, inset 2px 2px 0 #fff4cf;
  }
  .pixel-badge {
    background: #e3c36a;
    color: #3b2a10;
    border: 2px solid #6b4b1a;
    box-shadow: inset -2px -2px 0 #c49a4a, inset 2px 2px 0 #fff4cf;
  }
  .pixel-ring {
    box-shadow: 0 0 0 2px #f1d27a, 0 0 0 5px #6b4b1a;
  }

  .pixel-btn {
    background: #f7e8b4;
    border: 3px solid #6b4b1a;
    box-shadow: inset -3px -3px 0 #c49a4a, inset 3px 3px 0 #fff4cf, 0 3px 0 #3b2a10;
    color: #2b1c0b;
  }

  .pixel-btn-secondary {
    background: #d6b565;
    border: 3px solid #6b4b1a;
    box-shadow: inset -3px -3px 0 #b78b41, inset 3px 3px 0 #f7e8b4, 0 3px 0 #3b2a10;
    color: #2b1c0b;
  }

  .pixel-text {
    font-family: "Press Start 2P", "VT323", monospace;
    letter-spacing: 0.3px;
  }

  .pixel-shadow {
    text-shadow: 2px 2px 0 #3b2a10;
  }
`;

export default function Collection({ onNavigate }) {
  const [allCaught, setAllCaught] = useState([]);       // Full caught list (lightweight)
  const [pagePokemons, setPagePokemons] = useState([]);  // Current page with Pokemon details
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nickname, setNickname] = useState("");
  const [team, setTeam] = useState([]);
  const [teamMessage, setTeamMessage] = useState('');
  const [starterClaimMessage, setStarterClaimMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
  const [rarityFilter, setRarityFilter] = useState(ALL_FILTER);
  const [pokemonCache] = useState(() => new Map());      // Cache: pokemon_id → pokemon data
  const filteredCaught = useMemo(
    () => filterCaughtPokemon(allCaught, { searchTerm, typeFilter, rarityFilter }),
    [allCaught, searchTerm, typeFilter, rarityFilter]
  );
  const typeOptions = useMemo(
    () => [...new Set(allCaught.map((caught) => getCaughtSearchFields(caught).type).filter(Boolean))].sort(),
    [allCaught]
  );
  const rarityOptions = useMemo(
    () => [...new Set(allCaught.map((caught) => getCaughtSearchFields(caught).rarity).filter(Boolean))].sort(),
    [allCaught]
  );

  // Initial load: just get the caught list (lightweight, no images)
  useEffect(() => {
    (async () => {
      try {
        // Load team from API first (cross-device)
        const savedTeam = await loadTeamAsync();
        setTeam(savedTeam);
        
        const caughtList = await pokemonAPI.getCaughtPokemon();
        setAllCaught(caughtList);
      } catch (err) {
        console.error("Failed to fetch collection:", err);
      }
      setIsLoading(false);
    })();
    setTeam(loadTeam());
  }, []);

  // When caught list or page changes, fetch Pokemon details for current page
  useEffect(() => {
    if (filteredCaught.length === 0) {
      setPagePokemons([]);
      return;
    }
    loadPage(currentPage, filteredCaught);
  }, [filteredCaught, currentPage]);

  const loadPage = async (page, caughtSource = filteredCaught) => {
    setIsPageLoading(true);
    const start = (page - 1) * ITEMS_PER_PAGE;
    const pageCaught = caughtSource.slice(start, start + ITEMS_PER_PAGE);

    const results = [];
    for (const caught of pageCaught) {
      // Check cache first
      if (pokemonCache.has(caught.pokemon_id)) {
        results.push({ ...caught, pokemon: pokemonCache.get(caught.pokemon_id) });
        continue;
      }
      // Fetch with error handling
      try {
        const pokemon = await pokemonAPI.getPokemon(caught.pokemon_id);
        pokemonCache.set(caught.pokemon_id, pokemon);
        results.push({ ...caught, pokemon });
      } catch (err) {
        console.error(`Failed to fetch ${caught.pokemon_id}:`, err);
        // Use a placeholder so UI doesn't break
        results.push({
          ...caught,
          pokemon: {
            id: caught.pokemon_id,
            name: 'Unknown',
            type: 'Normal',
            power_level: 0,
            rarity: 'Common',
            image_url: ''
          }
        });
      }
      // Small delay between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }

    setPagePokemons(results);
    setIsPageLoading(false);
  };

  const saveNickname = async (caughtId) => {
    await pokemonAPI.updateCaughtPokemon(caughtId, { nickname: nickname.trim() });
    setEditingId(null);
    // Update local state instead of re-fetching everything
    setPagePokemons(prev =>
      prev.map(p => p.id === caughtId ? { ...p, nickname: nickname.trim() } : p)
    );
    setNickname("");
  };

  const releasePokemon = async (caughtId, pokemonId) => {
    if (confirm("Are you sure you want to release this Pokémon? 🥺")) {
      await pokemonAPI.releasePokemon(caughtId);
      // Also remove from team if on team
      if (isOnTeam(pokemonId)) {
        const newTeam = removeFromTeam(pokemonId);
        setTeam(newTeam);
      }
      // Update allCaught and re-paginate
      const updated = allCaught.filter(c => c.id !== caughtId);
      setAllCaught(updated);
      // If current page is now empty and not page 1, go back a page
      const maxPage = Math.max(1, Math.ceil(updated.length / ITEMS_PER_PAGE));
      if (currentPage > maxPage) {
        setCurrentPage(maxPage);
      }
    }
  };

  const handleAddToTeam = useCallback((pokemon) => {
    const result = addToTeam(pokemon);
    setTeam(result.team);
    setTeamMessage(result.message);
    setTimeout(() => setTeamMessage(''), 2000);
  }, []);

  const handleRemoveFromTeam = useCallback((pokemonId) => {
    const newTeam = removeFromTeam(pokemonId);
    setTeam(newTeam);
    setTeamMessage('Removed from team');
    setTimeout(() => setTeamMessage(''), 2000);
  }, []);

  const handleMoveTeamMember = useCallback((fromIndex, toIndex) => {
    const newTeam = moveTeamMember(team, fromIndex, toIndex);
    const oldOrder = team.map(member => member.pokemon_id).join('|');
    const newOrder = newTeam.map(member => member.pokemon_id).join('|');
    if (oldOrder === newOrder) return;

    saveTeam(newTeam);
    setTeam(newTeam);
    setTeamMessage(`${newTeam[toIndex].name} moved to slot ${toIndex + 1}`);
    setTimeout(() => setTeamMessage(''), 2000);
  }, [team]);

  const handleHealAll = useCallback(() => {
    const currentTeam = loadTeam();
    if (currentTeam.length === 0) return;
    const healed = healTeam(currentTeam);
    saveTeam(healed);
    setTeam(healed);
    setTeamMessage('💖 Team fully healed!');
    setTimeout(() => setTeamMessage(''), 2000);
  }, []);

  const handleClaimStarters = async () => {
    setIsLoading(true);
    setStarterClaimMessage('');
    try {
      const result = await pokemonAPI.claimStarters();
      if (result.success) {
        const caughtList = await pokemonAPI.getCaughtPokemon();
        setAllCaught(caughtList);

        if (result.starters && result.starters.length > 0) {
          const newTeam = result.starters.slice(0, 3).map(starter => ({
            pokemon_id: starter.pokemon_id,
            name: starter.name,
            type: starter.type,
            power_level: starter.power_level,
            rarity: starter.rarity,
            image_url: starter.image_url,
            maxHP: 100,
            currentHP: 100
          }));
          saveTeam(newTeam);
          setTeam(newTeam);
        }

        setStarterClaimMessage(result.message || 'Your starter Pokémon joined your team!');
      }
    } catch (err) {
      console.error('Failed to claim starters:', err);
      setStarterClaimMessage('Something went wrong! Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getImg = (pokemon) => {
    if (pokemon.image_url && pokemon.image_url.length > 100) return pokemon.image_url;
    return getPokemonImage(pokemon);
  };

  const needsHealing = team.some(p => p.currentHP < p.maxHP);
  const teamSynergy = getTeamSynergySummary(team);
  const hasActiveFilters = Boolean(searchTerm.trim() || typeFilter !== ALL_FILTER || rarityFilter !== ALL_FILTER);
  const totalPages = Math.max(1, Math.ceil(filteredCaught.length / ITEMS_PER_PAGE));
  const hasMore = currentPage * ITEMS_PER_PAGE < filteredCaught.length;

  const resetToFirstPage = (setter) => (event) => {
    setter(event.target.value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gold-collection flex items-center justify-center">
        <style>{collectionStyles}</style>
        <div className="text-6xl animate-spin">⭐</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 gold-collection">
      <style>{collectionStyles}</style>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3 pixel-panel p-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black pixel-text">
              ⭐ My Collection
            </h1>
            <p className="text-base md:text-lg pixel-muted font-bold mt-1">
              You have {allCaught.length} Pokémon{allCaught.length !== 1 ? 's' : ''}! 🎉
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => onNavigate('home')}
              className="h-11 px-4 text-sm md:text-base font-bold pixel-btn rounded-none"
            >
              🏠 Home
            </Button>
            <Button
              onClick={() => onNavigate('browse')}
              className="h-11 px-4 text-sm md:text-base font-bold pixel-btn-secondary rounded-none"
            >
              🔍 Find More
            </Button>
          </div>
        </div>

        {/* ═══ TEAM SECTION ═══ */}
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
                  style={{ animation: 'pulse 2s ease-in-out infinite' }}
                >
                  💖 Heal All
                </Button>
              )}
            </div>
          </div>

          {/* Team message */}
          {teamMessage && (
            <div className="pixel-panel-dark px-4 py-2 mb-3 text-xs md:text-sm font-bold text-center">
              {teamMessage}
            </div>
          )}

          {team.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-base md:text-lg pixel-muted font-bold mb-2">No Pokémon on your team yet!</p>
              <p className="text-xs md:text-sm pixel-muted">Add Pokémon from your collection below ⬇️</p>
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
                        <TypeBadge type={type} className="mr-1 align-middle" /> {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {team.map((p, i) => {
                  const rarity = rarityConfig[p.rarity] || rarityConfig.Common;
                  const hpRatio = p.maxHP > 0 ? p.currentHP / p.maxHP : 1;
                  const hpColor = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
                  return (
                    <div
                      key={p.pokemon_id || `${p.name}-${i}`}
                      className="pixel-card p-3 flex items-center gap-3"
                    >
                      <div className="w-16 h-16 flex-shrink-0 pixel-inset flex items-center justify-center">
                        <img src={getImg(p)} alt={p.name} className="max-w-full max-h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-lg"><TypeBadge type={p.type} /></span>
                          <span className="font-black pixel-text text-sm truncate">{p.name}</span>
                        </div>
                        {/* HP Bar */}
                        <div className="h-3 pixel-hp-shell mt-1">
                          <div
                            style={{
                              width: `${Math.max(0, hpRatio * 100)}%`,
                              background: hpColor,
                              transition: 'width 0.3s',
                              height: '100%',
                              borderRadius: '2px',
                            }}
                          />
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

        {starterClaimMessage && (
          <div className="pixel-panel-dark px-4 py-3 mb-6 text-xs md:text-sm font-bold text-center">
            <div>{starterClaimMessage}</div>
            {allCaught.length > 0 && (
              <Button
                onClick={() => onNavigate('browse')}
                className="mt-3 h-10 px-4 text-xs md:text-sm font-bold pixel-btn rounded-none"
              >
                Start First Battle
              </Button>
            )}
          </div>
        )}

        {/* Collection Grid */}
        {allCaught.length === 0 ? (
          <div className="text-center py-10 pixel-panel">
            <p className="text-lg md:text-2xl font-black pixel-text mb-4">
              Your collection is empty! 😢
            </p>
            <p className="text-sm md:text-base pixel-muted mb-4">
              Welcome! You need Pokémon to start your adventure!
            </p>
            <div className="flex flex-col gap-3 items-center">
              <Button
                onClick={handleClaimStarters}
                className="h-12 px-4 text-xs md:text-sm font-bold pixel-btn-success rounded-none"
              >
                🎁 Claim Your Starter Pokémon!
              </Button>
              <span className="pixel-muted text-[10px]">or</span>
              <Button
                onClick={() => onNavigate('browse')}
                className="h-10 px-4 text-xs md:text-sm font-bold pixel-btn rounded-none"
              >
                🔍 Explore Wild Pokémon
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="pixel-panel p-4 md:p-5 mb-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <label className="flex-1 text-xs font-black pixel-text">
                  Search collection
                  <Input
                    aria-label="Search collection"
                    value={searchTerm}
                    onChange={resetToFirstPage(setSearchTerm)}
                    placeholder="Name, nickname, type..."
                    className="mt-2 h-11 text-sm pixel-input rounded-none"
                  />
                </label>
                <label className="text-xs font-black pixel-text">
                  Filter by type
                  <select
                    aria-label="Filter by type"
                    value={typeFilter}
                    onChange={resetToFirstPage(setTypeFilter)}
                    className="mt-2 h-11 w-full min-w-40 pixel-input rounded-none px-3 text-sm font-bold"
                  >
                    <option value={ALL_FILTER}>All types</option>
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-black pixel-text">
                  Filter by rarity
                  <select
                    aria-label="Filter by rarity"
                    value={rarityFilter}
                    onChange={resetToFirstPage(setRarityFilter)}
                    className="mt-2 h-11 w-full min-w-40 pixel-input rounded-none px-3 text-sm font-bold"
                  >
                    <option value={ALL_FILTER}>All rarities</option>
                    {rarityOptions.map((rarity) => (
                      <option key={rarity} value={rarity}>{rarity}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold pixel-muted">
                <span>
                  Showing {filteredCaught.length} of {allCaught.length} Pokémon
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setTypeFilter(ALL_FILTER);
                      setRarityFilter(ALL_FILTER);
                      setCurrentPage(1);
                    }}
                    className="pixel-btn-secondary px-3 py-2 text-[10px] font-black rounded-none"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Page loading overlay */}
            {isPageLoading && (
              <div className="flex items-center justify-center py-8 mb-4">
                <div className="pixel-panel px-6 py-3 flex items-center gap-3">
                  <div className="text-4xl animate-spin">⭐</div>
                  <span className="text-sm md:text-base font-bold pixel-text">Loading Pokémon...</span>
                </div>
              </div>
            )}

            {!isPageLoading && (
              filteredCaught.length === 0 ? (
                <div className="pixel-panel p-8 text-center">
                  <p className="text-base md:text-lg font-black pixel-text">No Pokémon match these filters.</p>
                  <p className="mt-2 text-xs md:text-sm font-bold pixel-muted">Try a different name, type, or rarity.</p>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pagePokemons.map((caught) => {
                  const pokemon = caught.pokemon;
                  const isEditing = editingId === caught.id;
                  const onTeam = isOnTeam(pokemon.id);
                  const teamFull = team.length >= MAX_TEAM_SIZE;
                  const rarity = rarityConfig[pokemon.rarity] || rarityConfig.Common;

                  return (
                    <div
                      key={caught.id}
                      className={`pixel-card p-5 transform transition hover:-translate-y-1 ${
                        onTeam ? 'pixel-ring' : ''
                      }`}
                    >
                      {/* On Team Badge */}
                      <div className="mb-2 flex flex-wrap gap-2">
                        {onTeam && (
                          <div className="pixel-badge text-[10px] px-2 py-1 rounded-none inline-block">
                            🛡️ On Team
                          </div>
                        )}
                        <div
                          className="pixel-badge text-[10px] px-2 py-1 rounded-none inline-block"
                          style={{ background: rarity.color || '#e3c36a' }}
                        >
                          {rarity.label || pokemon.rarity || 'Common'}
                        </div>
                      </div>

                      {/* Pokemon Image */}
                      <div className="pixel-inset p-3 mb-4 h-40 flex items-center justify-center">
                        <img
                          src={getImg(pokemon)}
                          alt={pokemon.name}
                          className="max-h-full max-w-full object-contain" style={{ imageRendering: 'pixelated' }}
                        />
                      </div>

                      {/* Pokemon Info */}
                      <div className="text-center mb-4">
                        <h2 className="text-lg md:text-xl font-black pixel-text mb-2">
                          {caught.nickname || pokemon.name}
                          {caught.nickname && (
                            <span className="block text-xs pixel-muted font-normal">
                              ({pokemon.name})
                            </span>
                          )}
                        </h2>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="text-lg"><TypeBadge type={pokemon.type} /></span>
                          <span className="text-xs font-bold pixel-muted">{pokemon.type}</span>
                        </div>
                        <p className="text-[10px] pixel-muted mb-2">
                          Caught: {new Date(caught.caught_date).toLocaleDateString()}
                        </p>
                        <div className="text-sm font-bold pixel-text">
                          💪 Power: {pokemon.power_level}
                        </div>
                      </div>

                      {/* Team Button */}
                      {!onTeam && !teamFull && (
                        <button
                          onClick={() => handleAddToTeam(pokemon)}
                          className="w-full mb-2 h-10 text-xs md:text-sm font-bold pixel-btn rounded-none"
                        >
                          ⚔️ Add to Team!
                        </button>
                      )}
                      {onTeam && (
                        <button
                          onClick={() => handleRemoveFromTeam(pokemon.id)}
                          className="w-full mb-2 h-10 text-xs md:text-sm font-bold pixel-btn-secondary rounded-none"
                        >
                          Remove from Team
                        </button>
                      )}

                      {/* Nickname Edit */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Enter nickname..."
                            className="h-10 text-sm pixel-input rounded-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => saveNickname(caught.id)}
                              className="flex-1 h-9 text-xs font-bold pixel-btn-success rounded-none"
                            >
                              ✓ Save
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingId(null);
                                setNickname("");
                              }}
                              className="flex-1 h-9 text-xs font-bold pixel-btn-secondary rounded-none"
                            >
                              ✗ Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setEditingId(caught.id);
                              setNickname(caught.nickname || "");
                            }}
                            className="flex-1 h-10 text-xs md:text-sm font-bold pixel-btn-secondary rounded-none"
                          >
                            ✏️ Nickname
                          </Button>
                          <Button
                            onClick={() => releasePokemon(caught.id, pokemon.id)}
                            className="flex-1 h-10 text-xs md:text-sm font-bold pixel-btn-danger rounded-none"
                          >
                            👋 Release
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8 mb-4">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isPageLoading}
                  className="h-11 px-4 text-xs md:text-sm font-bold pixel-btn rounded-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ◀ Prev
                </Button>
                <span className="text-xs md:text-sm font-black pixel-text px-2">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!hasMore || isPageLoading}
                  className="h-11 px-4 text-xs md:text-sm font-bold pixel-btn-secondary rounded-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next ▶
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
