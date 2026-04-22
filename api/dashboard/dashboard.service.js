class DashboardService {
  constructor(repo) {
    this.repo = repo;
  }

  async getFinancialSummary(user, db, period) {
    return await this.repo.getFinancialSummary(db, user.tenant_id, period);
  }

  async getWeeklySalesPurchases(user, db) {
    return await this.repo.getWeeklySalesPurchases(db, user.tenant_id);
  }

  async getTopSellingProducts(user, db, period) {
    return await this.repo.getTopSellingProducts(db, user.tenant_id, period);
  }

  async getStockAlerts(user, db) {
    return await this.repo.getStockAlerts(db, user.tenant_id);
  }

  async getRecentSales(user, db) {
    return await this.repo.getRecentSales(db, user.tenant_id);
  }
}

module.exports = DashboardService;
