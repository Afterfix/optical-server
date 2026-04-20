// api/itemProfitReport/itemProfitReport.controller.js
class ItemProfitReportController {
    constructor(itemProfitReportService) {
        this.service = itemProfitReportService;
    }

    async getSummary(req, res, next) {
        try {
            const tenant_id = req.user.tenant_id;
            const filters = req.query; // { start_date, end_date }
            
            // Pass req.db
            const summary = await this.service.generateSummary(tenant_id, filters, req.db);
            
            res.status(200).json(summary);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = ItemProfitReportController;