
class PurchaseReturnController {
  constructor(purchaseReturnService) {
    this.service = purchaseReturnService;
  }

  async create(req, res, next) {
    try {
      // Pass req.db
      const newReturn = await this.service.create(req.user, req.body, req.db);
      res.status(201).json(newReturn);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      // Pass req.db
      const updatedReturn = await this.service.update(
        req.params.id,
        req.user,
        req.body,
        req.db
      );
      if (!updatedReturn) {
        return res
          .status(404)
          .json({ message: "Return not found or not authorized to update" });
      }
      res.json(updatedReturn);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      // Pass req.db
      const result = await this.service.delete(req.params.id, req.user, req.db);
      if (!result) {
        return res
          .status(404)
          .json({ message: "Return not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Purchase return deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      // Pass req.db
      const purchaseReturn = await this.service.getById(req.params.id, req.user.tenant_id, req.db);
      if (!purchaseReturn) {
        return res
          .status(404)
          .json({ message: "Return not found or not authorized" });
      }
      res.json(purchaseReturn);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const filters = req.query;
      // Pass req.db
      const returns = await this.service.getAll(req.user.tenant_id, filters, req.db);
      res.json(returns);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      const filters = req.query;
      // Pass req.db
      const data = await this.service.getPaginatedByUserId(
        req.user.tenant_id,
        filters,
        req.db
      );
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PurchaseReturnController;