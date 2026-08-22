import { useEffect, useMemo, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { getEffectiveness } from '@/game/battle';
import { calculatePvpTeamPower } from '@/game/pvp';
import { PvpBattleViewModel } from '@/viewmodels/PvpBattleViewModel';
import { PvpViewModel } from '@/viewmodels/PvpViewModel';
import { AlertTriangle, Flag, LogOut, Radar, RefreshCcw, Shield, Sparkles, Swords, Trophy } from 'lucide-react';

export default function PvpPanel({ apiClient = pokemonAPI, onNavigate = null }) {
  const [viewModel] = useState(() => new PvpViewModel(apiClient));
  const [team, setTeam] = useState([]);
  const [status, setStatus] = useState(viewModel.status);
  const [opponent, setOpponent] = useState(viewModel.opponent);
  const [lastMatch, setLastMatch] = useState(viewModel.lastMatch);
  const [matchHistory, setMatchHistory] = useState(viewModel.matchHistory);
  const [wallet, setWallet] = useState(viewModel.wallet);
  const [battleViewModel, setBattleViewModel] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const [battleVersion, setBattleVersion] = useState(0);
  const [error, setError] = useState(null);
  const [isTeamLoading, setIsTeamLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const teamPower = useMemo(() => calculatePvpTeamPower(team), [team]);
  const canQueue = teamPower > 0 && !isTeamLoading && !isActionLoading;
  const hasMatchmakingError = Boolean(error && status === 'idle' && teamPower > 0);
  const shouldShowEmptyHistory = status === 'idle' && teamPower > 0 && matchHistory.length === 0 && !lastMatch && !error;

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const nextTeam = await apiClient.getTeam();
        if (!isMounted) return;
        setTeam(Array.isArray(nextTeam) ? nextTeam : []);
        setError(null);
        const currentWallet = await viewModel.loadWallet();
        if (!isMounted) return;
        setWallet(currentWallet);
        const recentMatches = await viewModel.loadMatchHistory(3);
        if (!isMounted) return;
        setMatchHistory(recentMatches);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message);
      } finally {
        if (isMounted) setIsTeamLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [apiClient]);

  const syncViewModelState = () => {
    setStatus(viewModel.status);
    setOpponent(viewModel.opponent);
    setLastMatch(viewModel.lastMatch);
    setMatchHistory(viewModel.matchHistory);
    setWallet(viewModel.wallet);
    setError(viewModel.error);
  };

  const handleJoinQueue = async () => {
    setIsActionLoading(true);
    await viewModel.joinQueue(team);
    if (viewModel.status === 'matched' && viewModel.opponent) {
      const nextBattle = new PvpBattleViewModel({
        playerTeam: team,
        opponentTeam: getOpponentTeam(viewModel.opponent),
      });
      setBattleViewModel(nextBattle);
      setBattleResult(nextBattle.result);
    }
    syncViewModelState();
    setIsActionLoading(false);
  };

  const handleLeaveQueue = async () => {
    setIsActionLoading(true);
    await viewModel.leaveQueue();
    setBattleViewModel(null);
    setBattleResult(null);
    syncViewModelState();
    setIsActionLoading(false);
  };

  const handleAttack = () => {
    if (!battleViewModel?.activePlayerPokemon) return;
    const result = battleViewModel.playerAttack();
    setBattleResult(result);
    setBattleVersion((version) => version + 1);
  };

  const handleGuard = () => {
    if (!battleViewModel?.activePlayerPokemon) return;
    const result = battleViewModel.playerGuard();
    setBattleResult(result);
    setBattleVersion((version) => version + 1);
  };

  const handleSwitchPokemon = (teamIndex) => {
    if (!battleViewModel) return;
    battleViewModel.switchPlayerPokemon(teamIndex);
    setBattleResult(battleViewModel.result);
    setBattleVersion((version) => version + 1);
  };

  const handleForfeit = () => {
    if (!battleViewModel) return;
    const result = battleViewModel.forfeit();
    setBattleResult(result);
    setBattleVersion((version) => version + 1);
  };

  const handleSpecialAttack = () => {
    if (!battleViewModel?.activePlayerPokemon) return;
    const result = battleViewModel.specialAttack();
    if (result?.used === false) return;
    setBattleResult(result);
    setBattleVersion((version) => version + 1);
  };

  const handleSubmitBattleResult = async () => {
    if (!opponent || !battleViewModel) return;
    const payload = battleViewModel.buildMatchResultPayload(opponent.user_id);
    if (!payload) return;

    setIsActionLoading(true);
    await viewModel.submitMatchResult(payload);
    await viewModel.loadMatchHistory(3);
    setBattleViewModel(null);
    setBattleResult(null);
    syncViewModelState();
    setIsActionLoading(false);
  };

  const getOpponentTeam = (targetOpponent = opponent) => {
    const sourceTeam = targetOpponent?.team || targetOpponent?.opponent_team || targetOpponent?.opponentTeam || [];

    if (sourceTeam.length > 0) {
      return sourceTeam;
    }

    return [{
      pokemon_id: targetOpponent?.user_id || 'opponent',
      name: 'Opponent',
      power_level: targetOpponent?.team_power ?? targetOpponent?.teamPower ?? 0,
      currentHP: 1,
    }];
  };

  const statusText = {
    idle: 'Ready to queue',
    queued: 'Searching for a fair opponent...',
    matched: opponent ? `Matched with Trainer ${opponent.user_id}` : 'Match found',
    complete: 'Last match recorded',
  }[status] || 'Ready to queue';
  const opponentTeamPreview = opponent ? getOpponentTeam(opponent) : [];
  const playerTeamSynergy = battleViewModel ? getTeamTypeSynergy(battleViewModel.playerTeam) : null;
  const openingSwitchSuggestion = battleViewModel ? getOpeningSwitchSuggestion({
    activePlayerPokemon: battleViewModel.activePlayerPokemon,
    activeOpponentPokemon: battleViewModel.activeOpponentPokemon,
    switchablePlayerPokemon: battleViewModel.switchablePlayerPokemon,
  }) : null;

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#8a5c18]">Phase 3</p>
            <h2 className="mt-1 text-2xl font-bold flex items-center gap-2">
              <Swords className="w-6 h-6" />
              PvP Arena
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#5c4320]/80">{statusText}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <span className="rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-1 text-sm font-black text-[#4f3514]">
              Team Power: {teamPower}
            </span>
            {wallet && !lastMatch?.wallet && (
              <span className="rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-1 text-sm font-black text-[#4f3514]">
                {formatPvpWallet(wallet)}
              </span>
            )}
          </div>
        </div>

        <div className="gold-inset mt-4 p-4">
          {isTeamLoading ? (
            <div className="text-sm text-[#5c4320]/80">Loading PvP team...</div>
          ) : (
            <div className="flex flex-col gap-3">
              {opponent && (
                <div className="text-sm font-semibold text-[#4f3514]">
                  Opponent Power: {opponent.team_power ?? opponent.teamPower ?? 0}
                </div>
              )}
              {!canQueue && teamPower === 0 && (
                <div className="text-sm text-[#7a2e1f]">
                  Heal or add a living teammate before queueing.
                </div>
              )}
              {hasMatchmakingError ? (
                <div className="rounded border border-[#b4532d]/50 bg-[#fff1df] p-3 text-sm text-[#7a2e1f]">
                  <div className="flex items-center gap-2 font-black">
                    <AlertTriangle className="h-4 w-4" />
                    Matchmaking failed
                  </div>
                  <div className="mt-1 font-semibold text-[#7a2e1f]/85">
                    {error}
                  </div>
                </div>
              ) : error && (
                <div className="text-sm text-[#7a2e1f]">{error}</div>
              )}
              {lastMatch?.outcome && (
                <div className="rounded border border-[#2f7d46]/40 bg-[#e7f7df] p-3 text-sm font-semibold text-[#2f6f3a]">
                  <div>Result recorded: {lastMatch.outcome}</div>
                  {lastMatch.rewards && (
                    <div className="mt-1 font-black text-[#1f5f32]">
                      {formatPvpRewards(lastMatch.rewards)}
                    </div>
                  )}
                  {lastMatch.wallet && (
                    <div className="mt-1 text-xs font-black text-[#1f5f32]">
                      {formatPvpWallet(lastMatch.wallet)}
                    </div>
                  )}
                  <div className="mt-2 font-black text-[#1f5f32]">Ready for a rematch</div>
                  <div className="mt-1 text-xs text-[#2f6f3a]/85">
                    Queue again when your team is set.
                  </div>
                </div>
              )}
              {matchHistory.length > 0 && (
                <div className="rounded border border-[#c79a36]/50 bg-[#fff8dc] p-3 text-sm text-[#4f3514]">
                  <div className="font-black">Recent PvP</div>
                  <div className="mt-1 text-xs font-black text-[#4f3514]">
                    Record: {viewModel.matchSummary.label}
                  </div>
                  <div className="mt-2 space-y-1">
                    {matchHistory.map((match) => (
                      <div key={match.id} className="flex flex-col gap-0.5 text-xs font-semibold text-[#5c4320]/80 sm:flex-row sm:items-center sm:justify-between">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            aria-label={`PvP outcome: ${match.outcome}`}
                            className={`rounded border px-2 py-0.5 text-[10px] font-black uppercase ${getPvpOutcomeClass(match.outcome)}`}
                          >
                            {formatPvpOutcome(match.outcome)}
                          </span>
                          <span>vs {getPvpOpponentLabel(match)}</span>
                        </span>
                        {formatPvpMatchTimestamp(match.completed_at) && (
                          <span className="text-[#8a5c18]">
                            {formatPvpMatchTimestamp(match.completed_at)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {shouldShowEmptyHistory && (
                <div className="rounded border border-[#c79a36]/50 bg-[#fff8dc] p-3 text-sm text-[#4f3514]">
                  <div className="font-black">No PvP battles yet</div>
                  <div className="mt-1 text-xs font-semibold text-[#5c4320]/80">
                    Find a match to start your arena record.
                  </div>
                </div>
              )}
              {status === 'queued' && (
                <div className="rounded border border-[#c79a36]/50 bg-[#fff8dc] p-3 text-sm text-[#4f3514]">
                  <div className="flex items-center gap-2 font-black">
                    <Radar className="h-4 w-4" />
                    Waiting for a fair opponent
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[#5c4320]/80">
                    Stay on this screen while matchmaking checks for a balanced team.
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                {status === 'queued' ? (
                  <Button
                    onClick={handleLeaveQueue}
                    disabled={isActionLoading}
                    className="h-11 px-4 text-sm font-bold"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {isActionLoading ? 'Leaving...' : 'Leave Queue'}
                  </Button>
                ) : status === 'matched' ? (
                  <div className="flex w-full flex-col gap-3" data-battle-version={battleVersion}>
                    {battleViewModel && (
                      <div className="rounded border border-[#c79a36]/50 bg-[#fff8dc] p-3 text-sm text-[#4f3514]">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <div className="font-black">
                            Battle: {battleViewModel.activePlayerPokemon?.name || 'Your team'} vs {battleViewModel.activeOpponentPokemon?.name || 'Opponent defeated'}
                          </div>
                          <div className="w-fit rounded border border-[#c79a36]/50 bg-[#fff3c4] px-2 py-0.5 text-xs font-black text-[#4f3514]">
                            Turn {battleViewModel.turnNumber}
                          </div>
                        </div>
                        <div className="mt-2 w-fit rounded border border-[#6c63b7]/35 bg-[#eef0ff] px-2 py-0.5 text-xs font-black text-[#3f3b87]">
                          Energy: {battleViewModel.playerEnergy} / 2
                        </div>
                        {battleResult?.status !== 'complete' && (
                          <div className="mt-2 rounded border border-[#6c63b7]/25 bg-[#f4f1ff] px-2 py-1 text-xs font-semibold text-[#3f3b87]">
                            <div className="font-black">Move guide</div>
                            <div className="mt-1 flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:gap-x-3">
                              <span>Basic: Attack builds 1 energy</span>
                              <span>Basic: Guard builds 1 energy and reduces retaliation</span>
                              <span>Special: Spend 2 energy on Special Strike</span>
                            </div>
                          </div>
                        )}
                        <div className="mt-2 grid gap-2 text-xs font-semibold text-[#5c4320]/80 sm:grid-cols-2">
                          <div className={`rounded border px-2 py-1 ${getActivePokemonHpClass(battleViewModel.activePlayerPokemon)}`}>
                            <span>{formatActivePokemonHp(battleViewModel.activePlayerPokemon, 'Your team')}</span>
                            {isActivePokemonLowHp(battleViewModel.activePlayerPokemon) && (
                              <span
                                aria-label={`${battleViewModel.activePlayerPokemon?.name || 'Your team'} low HP`}
                                className="ml-2 rounded border border-[#9f3328]/50 bg-[#ffe4dc] px-1.5 py-0.5 text-[10px] font-black text-[#7a2e1f]"
                              >
                                LOW HP
                              </span>
                            )}
                          </div>
                          <div className={`rounded border px-2 py-1 ${getActivePokemonHpClass(battleViewModel.activeOpponentPokemon)}`}>
                            <span>{formatActivePokemonHp(battleViewModel.activeOpponentPokemon, 'Opponent')}</span>
                            {isActivePokemonLowHp(battleViewModel.activeOpponentPokemon) && (
                              <span
                                aria-label={`${battleViewModel.activeOpponentPokemon?.name || 'Opponent'} low HP`}
                                className="ml-2 rounded border border-[#9f3328]/50 bg-[#ffe4dc] px-1.5 py-0.5 text-[10px] font-black text-[#7a2e1f]"
                              >
                                LOW HP
                              </span>
                            )}
                          </div>
                        </div>
                        {battleViewModel.playerTeam.length > 0 && (
                          <div className="mt-3 rounded border border-[#c79a36]/40 bg-[#fff3c4] p-2 text-xs font-semibold text-[#5c4320]/85">
                            <div className="font-black text-[#4f3514]">Your team preview</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {battleViewModel.playerTeam.map((pokemon, index) => (
                                <span
                                  key={pokemon.pokemon_id || `${pokemon.name}-${index}`}
                                  className={`rounded border px-2 py-1 ${getPreviewPokemonHpClass(pokemon, index === battleViewModel.activePlayerIndex)}`}
                                >
                                  <span>{formatPreviewPokemonHp(pokemon)}</span>
                                  {index === battleViewModel.activePlayerIndex && (
                                    <span
                                      aria-label={`${pokemon?.name || 'Pokemon'} active player preview`}
                                      className="ml-2 rounded border border-[#2f7d46]/50 bg-[#e7f7df] px-1.5 py-0.5 text-[10px] font-black text-[#2f6f3a]"
                                    >
                                      ACTIVE
                                    </span>
                                  )}
                                  {isPokemonFainted(pokemon) && (
                                    <span
                                      aria-label={`${pokemon?.name || 'Pokemon'} fainted player preview`}
                                      className="ml-2 rounded border border-[#5c4320]/40 bg-[#ead9b8] px-1.5 py-0.5 text-[10px] font-black text-[#5c4320]"
                                    >
                                      FAINTED
                                    </span>
                                  )}
                                  {isPokemonLowHp(pokemon) && (
                                    <span
                                      aria-label={`${pokemon?.name || 'Pokemon'} low HP player preview`}
                                      className="ml-2 rounded border border-[#9f3328]/50 bg-[#ffe4dc] px-1.5 py-0.5 text-[10px] font-black text-[#7a2e1f]"
                                    >
                                      LOW HP
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                            {playerTeamSynergy && (
                              <div className="mt-2 rounded border border-[#2f7d46]/30 bg-[#e7f7df] px-2 py-1 text-xs font-semibold text-[#2f6f3a]">
                                <div className="font-black">{playerTeamSynergy.summary}</div>
                                <div className="mt-0.5 text-[#2f6f3a]/85">{playerTeamSynergy.coverage}</div>
                              </div>
                            )}
                          </div>
                        )}
                        {opponentTeamPreview.length > 0 && (
                          <div className="mt-3 rounded border border-[#c79a36]/40 bg-[#fff3c4] p-2 text-xs font-semibold text-[#5c4320]/85">
                            <div className="font-black text-[#4f3514]">Opponent team preview</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {opponentTeamPreview.map((pokemon, index) => (
                                <span
                                  key={pokemon.pokemon_id || `${pokemon.name}-${index}`}
                                  className={`rounded border px-2 py-1 ${getPreviewPokemonHpClass(pokemon, index === battleViewModel.activeOpponentIndex)}`}
                                >
                                  <span>{formatPreviewPokemonHp(pokemon)}</span>
                                  {index === battleViewModel.activeOpponentIndex && (
                                    <span
                                      aria-label={`${pokemon?.name || 'Pokemon'} active opponent preview`}
                                      className="ml-2 rounded border border-[#2f7d46]/50 bg-[#e7f7df] px-1.5 py-0.5 text-[10px] font-black text-[#2f6f3a]"
                                    >
                                      ACTIVE
                                    </span>
                                  )}
                                  {isPokemonFainted(pokemon) && (
                                    <span
                                      aria-label={`${pokemon?.name || 'Pokemon'} fainted opponent preview`}
                                      className="ml-2 rounded border border-[#5c4320]/40 bg-[#ead9b8] px-1.5 py-0.5 text-[10px] font-black text-[#5c4320]"
                                    >
                                      FAINTED
                                    </span>
                                  )}
                                  {isPokemonLowHp(pokemon) && (
                                    <span
                                      aria-label={`${pokemon?.name || 'Pokemon'} low HP opponent preview`}
                                      className="ml-2 rounded border border-[#9f3328]/50 bg-[#ffe4dc] px-1.5 py-0.5 text-[10px] font-black text-[#7a2e1f]"
                                    >
                                      LOW HP
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {battleResult?.status !== 'complete' && battleViewModel.turnLog.length === 0 && (
                          <div className="mt-3 rounded border border-[#c79a36]/40 bg-[#fff3c4] p-2 text-xs font-semibold text-[#5c4320]/85">
                            <div className="font-black text-[#4f3514]">Opening matchup</div>
                            <div className="mt-1">
                              {battleViewModel.activePlayerPokemon?.name || 'Your lead'} is leading into {battleViewModel.activeOpponentPokemon?.name || 'the opponent'}. Attack when you're ready or switch to a better teammate.
                            </div>
                            {openingSwitchSuggestion && (
                              <div className="mt-2 rounded border border-[#2f7d46]/30 bg-[#e7f7df] px-2 py-1 font-black text-[#2f6f3a]">
                                {openingSwitchSuggestion}
                              </div>
                            )}
                          </div>
                        )}
                        {battleResult?.status === 'complete' && (
                          <div className="mt-3 rounded border border-[#2f7d46]/40 bg-[#e7f7df] p-2 text-xs font-semibold text-[#2f6f3a]">
                            <div className="font-black">Battle complete: {battleResult.outcome}</div>
                            <div className="mt-2 font-black text-[#1f5f32]">Result ready to record</div>
                            <div className="mt-1">
                              Submit this {battleResult.outcome} to update your PvP record.
                            </div>
                          </div>
                        )}
                        {battleResult?.status !== 'complete' && battleViewModel.switchablePlayerPokemon.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {battleViewModel.switchablePlayerPokemon.map((pokemon) => (
                              <Button
                                key={pokemon.pokemon_id || pokemon.teamIndex}
                                onClick={() => handleSwitchPokemon(pokemon.teamIndex)}
                                disabled={isActionLoading}
                                className="h-8 px-3 text-xs font-bold"
                              >
                                <span>{formatSwitchPokemonLabel(pokemon)}</span>
                                {isPokemonLowHp(pokemon) && (
                                  <span
                                    aria-label={`${pokemon?.name || 'Pokemon'} low HP switch choice`}
                                    className="ml-2 rounded border border-[#9f3328]/50 bg-[#ffe4dc] px-1.5 py-0.5 text-[10px] font-black text-[#7a2e1f]"
                                  >
                                    LOW HP
                                  </span>
                                )}
                              </Button>
                            ))}
                          </div>
                        )}
                        {battleViewModel.turnLog.length > 0 && (
                          <div className="mt-3 space-y-1 border-t border-[#c79a36]/40 pt-2">
                            {battleViewModel.turnLog.slice(-3).map((entry, index) => (
                              <div key={`${entry}-${index}`} className="text-xs font-semibold text-[#5c4320]/80">
                                {entry}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        onClick={battleResult?.status === 'complete' ? handleSubmitBattleResult : handleAttack}
                        disabled={isActionLoading}
                        className="h-11 px-4 text-sm font-bold"
                      >
                        <Swords className="w-4 h-4 mr-2" />
                        {battleResult?.status === 'complete' ? 'Submit Result' : 'Attack'}
                      </Button>
                      {battleResult?.status !== 'complete' && (
                        <Button
                          onClick={handleGuard}
                          disabled={isActionLoading}
                          variant="outline"
                          className="h-11 px-4 text-sm font-bold"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Guard
                        </Button>
                      )}
                      {battleResult?.status !== 'complete' && (
                        <Button
                          onClick={handleSpecialAttack}
                          disabled={isActionLoading || !battleViewModel?.canUseSpecialAttack}
                          variant="outline"
                          className="h-11 px-4 text-sm font-bold"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Special
                        </Button>
                      )}
                      {battleResult?.status !== 'complete' && (
                        <Button
                          onClick={handleForfeit}
                          disabled={isActionLoading}
                          variant="outline"
                          className="h-11 px-4 text-sm font-bold"
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          Forfeit
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleJoinQueue}
                    disabled={!canQueue}
                    className="h-11 px-4 text-sm font-bold"
                  >
                    {hasMatchmakingError ? (
                      <RefreshCcw className="w-4 h-4 mr-2" />
                    ) : (
                      <Radar className="w-4 h-4 mr-2" />
                    )}
                    {isActionLoading ? 'Searching...' : hasMatchmakingError ? 'Try Again' : 'Find Match'}
                  </Button>
                )}
                {onNavigate && (
                  <Button
                    onClick={() => onNavigate('leaderboards')}
                    variant="outline"
                    className="h-11 px-4 text-sm font-bold"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    View PvP Rankings
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatPvpMatchTimestamp(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${hours}:${minutes} UTC`;
}

function getPvpOutcomeClass(outcome) {
  if (outcome === 'win') return 'border-[#2f7d46]/50 bg-[#e7f7df] text-[#2f6f3a]';
  if (outcome === 'loss') return 'border-[#9f3328]/50 bg-[#ffe4dc] text-[#7a2e1f]';
  if (outcome === 'draw') return 'border-[#8a5c18]/50 bg-[#fff3c4] text-[#6f4a16]';
  return 'border-[#c79a36]/50 bg-[#fff8dc] text-[#4f3514]';
}

function formatPvpOutcome(outcome) {
  return String(outcome || 'unknown').toUpperCase();
}

function formatPvpRewards(rewards) {
  return `Rewards: +${rewards.xp ?? 0} XP, +${rewards.coins ?? 0} coins`;
}

function formatPvpWallet(wallet) {
  return `Wallet: ${wallet.coins ?? 0} coins`;
}

function getPvpOpponentLabel(match) {
  return match?.opponent_user_id || match?.player_user_id || 'Unknown Trainer';
}

function formatActivePokemonHp(pokemon, fallbackName) {
  const name = pokemon?.name || fallbackName;
  const currentHP = pokemon?.currentHP ?? 0;
  const maxHP = pokemon?.maxHP ?? 100;
  return `${name} HP: ${currentHP} / ${maxHP}`;
}

function formatSwitchPokemonLabel(pokemon) {
  const currentHP = pokemon?.currentHP ?? 0;
  const maxHP = pokemon?.maxHP ?? 100;
  return `Switch to ${pokemon?.name || 'Pokemon'} (${currentHP} / ${maxHP} HP)`;
}

function formatPreviewPokemonHp(pokemon) {
  const currentHP = pokemon?.currentHP ?? 0;
  const maxHP = pokemon?.maxHP ?? 100;
  return `${pokemon?.name || 'Pokemon'} ${currentHP} / ${maxHP} HP`;
}

function getTeamTypeSynergy(team = []) {
  const types = [...new Set(team.map((pokemon) => pokemon?.type).filter(Boolean))];
  if (types.length === 0) return null;

  return {
    summary: `Synergy: ${types.length} type ${types.length === 1 ? 'role' : 'roles'} covered`,
    coverage: `Coverage: ${types.join(', ')}`,
  };
}

function getOpeningSwitchSuggestion({
  activePlayerPokemon,
  activeOpponentPokemon,
  switchablePlayerPokemon = [],
} = {}) {
  if (!activePlayerPokemon || !activeOpponentPokemon || switchablePlayerPokemon.length === 0) {
    return null;
  }

  const leadEffectiveness = getEffectiveness(activePlayerPokemon.type, activeOpponentPokemon.type);
  const opponentEffectiveness = getEffectiveness(activeOpponentPokemon.type, activePlayerPokemon.type);
  const leadIsDisadvantaged = leadEffectiveness === 'not-very-effective' || opponentEffectiveness === 'super-effective';

  if (!leadIsDisadvantaged) {
    return null;
  }

  const suggestedPokemon = switchablePlayerPokemon.find(
    (pokemon) => getEffectiveness(pokemon.type, activeOpponentPokemon.type) === 'super-effective',
  );

  if (!suggestedPokemon) {
    return null;
  }

  return `Suggested switch: ${suggestedPokemon.name || 'Pokemon'} has type advantage.`;
}

function isPokemonLowHp(pokemon) {
  if (!pokemon) return false;
  const maxHP = Math.max(1, pokemon.maxHP ?? 100);
  return (pokemon.currentHP ?? 0) > 0 && (pokemon.currentHP ?? 0) / maxHP <= 0.25;
}

function isPokemonFainted(pokemon) {
  return Boolean(pokemon) && (pokemon.currentHP ?? 0) <= 0;
}

function isActivePokemonLowHp(pokemon) {
  return isPokemonLowHp(pokemon);
}

function getActivePokemonHpClass(pokemon) {
  if (isActivePokemonLowHp(pokemon)) {
    return 'border-[#9f3328]/50 bg-[#ffe4dc] text-[#7a2e1f]';
  }

  return 'border-[#c79a36]/30 bg-[#fff3c4]/70';
}

function getPreviewPokemonHpClass(pokemon, isActive = false) {
  if (isPokemonFainted(pokemon)) {
    return 'border-[#5c4320]/35 bg-[#ead9b8]/70 text-[#5c4320]';
  }

  if (isActive) {
    return 'border-[#2f7d46]/60 bg-[#e7f7df] text-[#2f6f3a]';
  }

  if (isPokemonLowHp(pokemon)) {
    return 'border-[#9f3328]/50 bg-[#fff1df] text-[#7a2e1f]';
  }

  return 'border-[#c79a36]/40 bg-[#fff8dc]';
}
