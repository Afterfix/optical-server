class StockValueReportController {
  constructor(stockValueReportService) {
    this.service = stockValueReportService;
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
  
  async getPaginatedSummary(req, res, next) {
    try {
      const tenant_id = req.user.tenant_id;
      const filters = req.query;
      const summary = await this.service.generatePaginatedSummary(tenant_id, filters, req.db);
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StockValueReportController;