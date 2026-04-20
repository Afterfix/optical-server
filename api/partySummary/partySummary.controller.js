class PartySummaryController {
  constructor(partySummaryService) {
    this.service = partySummaryService;
  }

  async getSummary(req, res, next) {
    try {
      const tenant_id = req.user.tenant_id;
      const filters = req.query;

      const summary = await this.service.generateSummary(
        req.db,
        tenant_id,
        filters
      );

      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  }


  async getPartyPaymentDetails(req, res, next) {
    try {
      const tenant_id = req.user.tenant_id;
      const { party_id } = req.params;
      const filters = req.query; 

      const details = await this.service.getPartyPaymentDetails(
        req.db,
        tenant_id,
        parseInt(party_id),
        filters
      );

      res.status(200).json(details);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PartySummaryController;
