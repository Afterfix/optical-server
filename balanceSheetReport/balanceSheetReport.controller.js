class BalanceSheetReportController {
  constructor(balanceSheetReportService) {
    this.service = balanceSheetReportService;
  }

  async getSummary(req, res, next) {
    try {
      const tenant_id = req.user.tenant_id;
      const filters = req.query; 
      
      const summary = await this.service.generateSummary(req.db, tenant_id, filters);
      
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BalanceSheetReportController;