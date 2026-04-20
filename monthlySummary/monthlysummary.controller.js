// --- START OF FILE api/monthly-summary/monthly-summary.controller.js ---

class MonthlySummaryController {
    constructor(monthlySummaryService) {
        this.service = monthlySummaryService;
    }

    async getSummary(req, res, next) {
        try {
            const tenantId = req.user.tenant_id;
            const filters = req.query; 
            const summary = await this.service.generateSummary(tenantId, filters);
            res.status(200).json(summary);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = MonthlySummaryController;