const DashboardRepository = require("./dashboard.repository");
const DashboardService = require("./dashboard.service");

class DashboardController {
  constructor() {
    this.repository = new DashboardRepository();
    this.service = new DashboardService(this.repository);
  }

  async getFinancialSummary(req, res, next) {
    try {
      const { period } = req.query;
      const data = await this.service.getFinancialSummary(req.user, req.db, period);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  async getWeeklySalesPurchases(req, res, next) {
    try {
      const { period } = req.query;
      const data = await this.service.getWeeklySalesPurchases(req.user, req.db, period);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  async getTopSellingProducts(req, res, next) {
    try {
      const { period } = req.query;
      const data = await this.service.getTopSellingProducts(req.user, req.db, period);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  async getStockAlerts(req, res, next) {
    try {
      const data = await this.service.getStockAlerts(req.user, req.db);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  async getRecentSales(req, res, next) {
    try {
      const data = await this.service.getRecentSales(req.user, req.db);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }
  async getRecentPurchases(req, res, next) {
    try {
      const data = await this.service.getRecentPurchases(req.user, req.db);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }
}

module.exports = DashboardController;
