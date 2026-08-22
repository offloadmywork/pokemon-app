import { useEffect, useMemo, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { calculateCoopRaidTeamPower } from '@/game/coopRaids';
import { CoopRaidViewModel } from '@/viewmodels/CoopRaidViewModel';
import { AlertTriangle, CheckCircle2, Copy, RadioTower, ShieldCheck, Swords, Users } from 'lucide-react';

const defaultCopyRoomCode = async (roomCode) => {
  if (!globalThis.navigator?.clipboard?.writeText) return;
  await globalThis.navigator.clipboard.writeText(roomCode);
};

export default function CoopRaidPanel({ apiClient = pokemonAPI, copyRoomCode = defaultCopyRoomCode }) {
  const [viewModel] = useState(() => new CoopRaidViewModel(apiClient));
  const [team, setTeam] = useState([]);
  const [room, setRoom] = useState(viewModel.room);
  const [status, setStatus] = useState(viewModel.status);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState(viewModel.error);
  const [lastAttempt, setLastAttempt] = useState(viewModel.lastAttempt);
  const [rewards, setRewards] = useState(viewModel.rewards);
  const [rewardSummary, setRewardSummary] = useState(viewModel.rewardSummary);
  const [copyStatus, setCopyStatus] = useState('idle');
  const [isTeamLoading, setIsTeamLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const raidPower = useMemo(() => calculateCoopRaidTeamPower(team), [team]);
  const canRaid = raidPower > 0 && !isTeamLoading && !isActionLoading;
  const canAttack = canRaid && room?.raid?.id && room?.ready && room?.raid?.status !== 'complete';
  const participants = Array.isArray(room?.participants) ? room.participants : [];
  const participantSummary = viewModel.participantSummary;
  const inviteSummary = viewModel.inviteSummary;

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const nextTeam = await apiClient.getTeam();
        if (!isMounted) return;
        setTeam(Array.isArray(nextTeam) ? nextTeam : []);
        setError(null);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsTeamLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [apiClient]);

  const syncViewModelState = () => {
    setRoom(viewModel.room);
    setStatus(viewModel.status);
    setError(viewModel.error);
    setLastAttempt(viewModel.lastAttempt);
    setRewards(viewModel.rewards);
    setRewardSummary(viewModel.rewardSummary);
  };

  const handleHostRaid = async () => {
    setIsActionLoading(true);
    setCopyStatus('idle');
    await viewModel.createRaid(team, 1);
    syncViewModelState();
    setIsActionLoading(false);
  };

  const handleJoinRaid = async () => {
    if (!roomCode.trim()) return;

    setIsActionLoading(true);
    setCopyStatus('idle');
    await viewModel.joinRaid(roomCode.trim(), team);
    syncViewModelState();
    setIsActionLoading(false);
  };

  const handleAttackRaid = async () => {
    setIsActionLoading(true);
    await viewModel.attackRaid(raidPower);
    syncViewModelState();
    setIsActionLoading(false);
  };

  const handleCopyInvite = async () => {
    if (!inviteSummary?.roomCode) return;

    try {
      await copyRoomCode(inviteSummary.roomCode);
      setCopyStatus('copied');
    } catch (err) {
      setError(err.message);
      setCopyStatus('idle');
    }
  };

  const statusText = {
    idle: 'Ready to host or join',
    waiting: 'Waiting for one more trainer',
    ready: 'Raid party ready',
    in_progress: 'Raid attack landed',
    complete: 'Raid cleared',
  }[status] || 'Ready to host or join';

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#8a5c18]">Phase 3</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <Users className="h-6 w-6" />
              Co-op Raids
            </h2>
            <p className="mt-2 text-sm text-[#5c4320]/80 sm:text-base">{statusText}</p>
          </div>
          <span className="rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-1 text-sm font-black text-[#4f3514]">
            Raid Power: {raidPower}
          </span>
        </div>

        <div className="gold-inset mt-4 p-4">
          {isTeamLoading ? (
            <div className="text-sm text-[#5c4320]/80">Loading raid team...</div>
          ) : (
            <div className="flex flex-col gap-3">
              {raidPower === 0 && (
                <div className="text-sm font-semibold text-[#7a2e1f]">
                  Heal or add a living teammate before raiding.
                </div>
              )}

              {error && (
                <div className="rounded border border-[#b4532d]/50 bg-[#fff1df] p-3 text-sm text-[#7a2e1f]">
                  <div className="flex items-center gap-2 font-black">
                    <AlertTriangle className="h-4 w-4" />
                    Co-op raid action failed
                  </div>
                  <div className="mt-1 font-semibold text-[#7a2e1f]/85">{error}</div>
                </div>
              )}

              {room?.raid && (
                <div className="rounded border border-[#c79a36]/50 bg-[#fff8dc] p-3 text-sm text-[#4f3514]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-black">{room.raid.boss_name} Lv. {room.raid.level}</div>
                      <div className="mt-1 font-semibold text-[#5c4320]/80">Room: {room.raid.id}</div>
                      <div className="mt-1 font-semibold text-[#5c4320]/80">
                        Boss HP: {room.raid.current_hp} / {room.raid.max_hp}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-black uppercase ${
                      room.ready
                        ? 'border-[#2f7d46]/50 bg-[#e7f7df] text-[#2f6f3a]'
                        : 'border-[#c79a36]/60 bg-[#fff3c4] text-[#4f3514]'
                    }`}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {room.ready ? 'Ready' : 'Waiting'}
                    </span>
                  </div>
                  <div className="mt-3 rounded border border-[#c79a36]/40 bg-white/45 p-2 text-xs font-black text-[#4f3514]">
                    {participantSummary.label}
                  </div>
                  {inviteSummary && (
                    <div className="mt-3 rounded border border-[#c79a36]/40 bg-white/45 p-3 text-xs text-[#4f3514]">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-black">{inviteSummary.label}</div>
                          <div className="mt-1 font-semibold text-[#5c4320]/80">{inviteSummary.helper}</div>
                        </div>
                        <Button
                          onClick={handleCopyInvite}
                          variant="ghost"
                          className="h-9 px-3 text-sm font-bold"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Invite
                        </Button>
                      </div>
                      {copyStatus === 'copied' && (
                        <div className="mt-2 flex items-center gap-2 font-black text-[#2f6f3a]">
                          <CheckCircle2 className="h-4 w-4" />
                          Invite code copied.
                        </div>
                      )}
                    </div>
                  )}
                  {participants.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {participants.map((participant) => (
                        <span
                          key={participant.user_id}
                          className="rounded border border-[#c79a36]/45 bg-[#fff3c4] px-2 py-1 text-xs font-bold text-[#5c4320]"
                        >
                          {participant.user_id}: {participant.team_power} power
                        </span>
                      ))}
                    </div>
                  )}
                  {lastAttempt?.damage_dealt > 0 && (
                    <div className="mt-3 rounded border border-[#c79a36]/40 bg-white/45 p-2 text-xs font-black text-[#4f3514]">
                      Last hit dealt {lastAttempt.damage_dealt} damage.
                    </div>
                  )}
                  {rewards.length > 0 && (
                    <div className="mt-3 rounded border border-[#2f7d46]/50 bg-[#e7f7df] p-3 text-sm font-bold text-[#2f6f3a]">
                      <div>Raid cleared! Rewards shared with {rewards.length} trainers.</div>
                      {rewardSummary.rewardLabel && (
                        <div className="mt-1">{rewardSummary.rewardLabel}</div>
                      )}
                      {rewardSummary.progressLabel && (
                        <div className="mt-1 text-xs text-[#245c31]">{rewardSummary.progressLabel}</div>
                      )}
                      {rewardSummary.walletLabel && (
                        <div className="mt-1 text-xs text-[#245c31]">{rewardSummary.walletLabel}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleHostRaid}
                  disabled={!canRaid}
                  className="h-11 px-5 text-base font-bold"
                >
                  <RadioTower className="mr-2 h-4 w-4" />
                  {isActionLoading ? 'Syncing...' : 'Host Raid'}
                </Button>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-wide text-[#8a5c18]">
                    Raid room code
                    <input
                      aria-label="Raid room code"
                      value={roomCode}
                      onChange={(event) => setRoomCode(event.target.value)}
                      className="h-11 rounded border border-[#c79a36]/60 bg-[#fff8dc] px-3 text-sm font-bold normal-case tracking-normal text-[#4f3514] outline-none focus:border-[#8a5c18]"
                      placeholder="raid-1"
                    />
                  </label>
                  <Button
                    onClick={handleJoinRaid}
                    disabled={!canRaid || !roomCode.trim()}
                    className="h-11 self-end px-5 text-base font-bold"
                  >
                    Join Raid
                  </Button>
                </div>
                {room?.raid && (
                  <Button
                    onClick={handleAttackRaid}
                    disabled={!canAttack}
                    className="h-11 px-5 text-base font-bold"
                  >
                    <Swords className="mr-2 h-4 w-4" />
                    Attack Boss
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
