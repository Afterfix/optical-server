class DailySummaryController {
    constructor(dailySummaryService) {
        this.service = dailySummaryService;
    }

    async getSummary(req, res, next) {
        try {
            const tenantId = req.user.tenant_id;
            const filters = req.query; 
            
            // Pass req.db as the first argument
            const summary = await this.service.generateSummary(req.db, tenantId, filters);
            
            res.status(200).json(summary);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = DailySummaryController;