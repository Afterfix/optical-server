class TaxSummaryReportController {
  constructor(taxSummaryReportService) {
    this.service = taxSummaryReportService;
  }

  async getSummary(req, res, next) {
    try {
      const tenant_id = req.user.tenant_id;
      const filters = req.query;
      const summary = await this.service.generateSummary(tenant_id, filters, req.db);
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TaxSummaryReportController;