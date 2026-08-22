// TradingViewModel - browser-free trading offer orchestration.

export class TradingViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.status = 'idle';
    this.lastOffer = null;
    this.completedTrade = null;
    this.tradeAction = null;
    this.incomingOffers = [];
    this.outgoingOffers = [];
    this.isLoading = false;
    this.error = null;
  }

  get completedSummary() {
    const transferCount = Array.isArray(this.completedTrade?.transfers)
      ? this.completedTrade.transfers.length
      : 0;

    return {
      transferCount,
      label: transferCount > 0
        ? `${transferCount} Pokemon ownership updates completed`
        : null,
    };
  }

  getTradeInviteSummary(offer) {
    const tradeId = offer?.id || null;

    return tradeId
      ? {
        tradeId,
        label: `Trade code: ${tradeId}`,
        helper: 'Share this code so the invited trainer can accept the trade.',
      }
      : null;
  }

  async loadOffers() {
    this.isLoading = true;
    this.error = null;

    try {
      const offers = await this.api.listTradeOffers();
      this.incomingOffers = Array.isArray(offers?.incoming) ? offers.incoming : [];
      this.outgoingOffers = Array.isArray(offers?.outgoing) ? offers.outgoing : [];
      return {
        incoming: this.incomingOffers,
        outgoing: this.outgoingOffers,
      };
    } catch (err) {
      this.error = err.message;
      console.error('Failed to load trade offers:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async createOffer({ toUserId, offeredCaughtId, requestedCaughtId }) {
    this.isLoading = true;
    this.error = null;

    try {
      const offer = await this.api.createTradeOffer({
        toUserId,
        offeredCaughtId,
        requestedCaughtId,
      });
      this.lastOffer = offer;
      this.completedTrade = null;
      this.tradeAction = null;
      this.status = offer?.status || 'pending';
      return offer;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to create trade offer:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async acceptOffer(tradeId) {
    this.isLoading = true;
    this.error = null;

    try {
      const result = await this.api.acceptTradeOffer(tradeId);
      this.completedTrade = result;
      this.tradeAction = result;
      this.lastOffer = result?.offer || this.lastOffer;
      this.status = result?.status || this.status;
      return result;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to accept trade offer:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async cancelOffer(tradeId) {
    return this.resolveTradeAction(() => this.api.cancelTradeOffer(tradeId));
  }

  async declineOffer(tradeId) {
    return this.resolveTradeAction(() => this.api.declineTradeOffer(tradeId));
  }

  async resolveTradeAction(action) {
    this.isLoading = true;
    this.error = null;

    try {
      const result = await action();
      this.tradeAction = result;
      this.lastOffer = result?.offer || this.lastOffer;
      this.status = result?.status || this.status;
      return result;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to update trade offer:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }
}

export function createTradingViewModel(apiClient) {
  return new TradingViewModel(apiClient);
}
