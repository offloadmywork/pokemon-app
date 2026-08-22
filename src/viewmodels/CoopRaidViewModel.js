// CoopRaidViewModel - browser-free co-op raid room orchestration.

export class CoopRaidViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.status = 'idle';
    this.room = null;
    this.isLoading = false;
    this.error = null;
    this.lastAttempt = null;
    this.rewards = [];
    this.progress = [];
    this.wallets = [];
  }

  get raid() {
    return this.room?.raid || null;
  }

  get participants() {
    return Array.isArray(this.room?.participants) ? this.room.participants : [];
  }

  get ready() {
    return Boolean(this.room?.ready);
  }

  get participantSummary() {
    const totalPower = this.participants.reduce(
      (total, participant) => total + (participant.team_power || 0),
      0,
    );

    return {
      count: this.participants.length,
      totalPower,
      label: `${this.participants.length} trainers ready · ${totalPower} raid power`,
    };
  }

  get inviteSummary() {
    const roomCode = this.raid?.id || null;

    return roomCode
      ? {
        roomCode,
        label: `Invite code: ${roomCode}`,
        helper: 'Share this code so another trainer can join your raid.',
      }
      : null;
  }

  get rewardSummary() {
    const firstReward = this.rewards[0] || null;
    const firstProgress = this.progress[0] || null;
    const firstWallet = this.wallets[0] || null;

    return {
      trainerCount: this.rewards.length,
      rewardLabel: firstReward ? `${firstReward.xp} XP · ${firstReward.coins} coins each` : null,
      progressLabel: firstProgress
        ? `${firstProgress.user_id} reached Level ${firstProgress.level} with ${firstProgress.xp} XP`
        : null,
      walletLabel: firstWallet
        ? `${firstWallet.user_id} now has ${firstWallet.coins} coins`
        : null,
    };
  }

  async createRaid(team = [], level = 1) {
    this.isLoading = true;
    this.error = null;

    try {
      const room = await this.api.createCoopRaid(team, level);
      this._setRoom(room);
      return room;
    } catch (err) {
      this.error = err.message;
      this.status = this.room ? this.status : 'idle';
      console.error('Failed to create co-op raid:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async joinRaid(raidId, team = []) {
    this.isLoading = true;
    this.error = null;

    try {
      const room = await this.api.joinCoopRaid(raidId, team);
      this._setRoom(room);
      return room;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to join co-op raid:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async attackRaid(damageDealt = 0) {
    if (!this.raid?.id) {
      this.error = 'Join or host a ready raid before attacking.';
      return null;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const result = await this.api.attackCoopRaid(this.raid.id, damageDealt);
      this._setAttackResult(result);
      return result;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to attack co-op raid:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  _setRoom(room) {
    this.room = room || null;
    this.status = this.ready ? 'ready' : this.room ? 'waiting' : 'idle';
  }

  _setAttackResult(result) {
    if (!result) return;

    this.room = {
      ...(this.room || {}),
      raid: result.raid || this.raid,
      ready: result.raid?.status === 'complete' ? false : this.ready,
    };
    this.lastAttempt = result.attempt || null;
    this.rewards = Array.isArray(result.rewards)
      ? result.rewards
      : Array.isArray(result.attempt?.rewards)
        ? result.attempt.rewards
        : [];
    this.progress = Array.isArray(result.progress) ? result.progress : [];
    this.wallets = Array.isArray(result.wallets) ? result.wallets : [];

    if (result.raid?.status === 'complete' || result.attempt?.status === 'complete') {
      this.status = 'complete';
    } else {
      this.status = 'in_progress';
    }
  }
}

export function createCoopRaidViewModel(apiClient) {
  return new CoopRaidViewModel(apiClient);
}
