class ReadModelService {
  constructor(options) {
    this.store = options.store;
    this.defaultOpenClawId = options.defaultOpenClawId || "lob_001";
  }

  resolveOpenClawId(openClawId) {
    return openClawId || this.defaultOpenClawId;
  }

  getProfile(openClawId) {
    return this.store.getProfile(this.resolveOpenClawId(openClawId));
  }

  getHomeView(openClawId) {
    return this.store.getHomeView(this.resolveOpenClawId(openClawId));
  }

  getSpectateView(openClawId) {
    return this.store.getSpectateView(this.resolveOpenClawId(openClawId));
  }

  getSummaryView(openClawId) {
    return this.store.getSummaryView(this.resolveOpenClawId(openClawId));
  }

  getEventsView(openClawId, filters) {
    return this.store.getEventsView(this.resolveOpenClawId(openClawId), filters);
  }

  getRelationshipsView(openClawId) {
    return this.store.getRelationshipsView(this.resolveOpenClawId(openClawId));
  }

  getRelationshipDetail(openClawId, targetId) {
    return this.store.getRelationshipDetail(this.resolveOpenClawId(openClawId), targetId);
  }
}

module.exports = {
  ReadModelService,
};
