class TransactionController {
  constructor(transactionService) {
    this.service = transactionService;
  }

  async create(req, res, next) {
    try {
      const transactionData = {
        ...req.body,
        tenant_id: req.user.tenant_id,
        done_by_id: req.body.done_by_id || null, 
      };
      const newTransaction = await this.service.create(transactionData, req.db);
      res.status(201).json(newTransaction);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const transaction = await this.service.getById(req.params.id, req.user.tenant_id, req.db);
      res.json(transaction);
    } catch (error) {
      if (error.message.includes("not found")) {
          return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getAll(req.user.tenant_id, req.query, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      const filters = req.query;
      const data = await this.service.getPaginated(req.user.tenant_id, filters, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async deleteById(req, res, next) {
    try {
      const result = await this.service.deleteById(req.params.id, req.user.tenant_id, req.db);
      if (!result) {
        return res
          .status(404)
          .json({ message: "Transaction not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

    async getRecentTransactions(req, res, next) {
    try {
      const data = await this.service.getRecent(req.user.tenant_id, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = TransactionController;