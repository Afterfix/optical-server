// api/stockDetailedReport/stockDetailedReport.controller.js
class StockDetailedReportController {
    constructor(stockDetailedReportService) {
        this.service = stockDetailedReportService;
    }

    async getSummary(req, res, next) {
        try {
            // Assuming tenant_id is available from the validated token middleware
            const tenant_id = req.user.tenant_id;
            const filters = req.query; // { start_date, end_date }
            const summary = await this.service.generateSummary(tenant_id, filters, req.db);
            res.status(200).json(summary);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = StockDetailedReportController;