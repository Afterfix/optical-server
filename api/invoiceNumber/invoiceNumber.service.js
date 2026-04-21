class InvoiceNumberService {
  constructor(counterRepository) {
    this.repo = counterRepository
  }

  async generateNext(data, db) {
    return await this.repo.generateNext(db, data)
  }

  async get(data, db) {
    return await this.repo.get(db, data)
    // e.g. SAL-2025-0001
  }

  async getAll(tenantId, db) {
    return await this.repo.getAll(db, tenantId);
  }
}

module.exports = InvoiceNumberService