class WorldService {
  constructor(options) {
    this.readModelService = options.readModelService;
    this.defaultSpaceId = "space_arcade_hall";
  }

  async getWorldSnapshot(openClawId) {
    const [profile, spectate, relationships] = await Promise.all([
      this.readModelService.getProfile(openClawId),
      this.readModelService.getSpectateView(openClawId),
      this.readModelService.getRelationshipsView(openClawId),
    ]);

    return {
      openClawId,
      spaceId: spectate?.runtime?.currentSpaceId || this.defaultSpaceId,
      runtime: spectate?.runtime || null,
      profile: profile || null,
      nearbyOpenClaws: spectate?.nearbyOpenClaws || spectate?.nearbyLobsters || [],
      recentEvents: spectate?.recentEvents || [],
      relationships: relationships?.relationships || [],
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  WorldService,
};
