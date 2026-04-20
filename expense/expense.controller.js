class ExpenseController {
  constructor(expenseService) {
    this.service = expenseService;
  }

  async create(req, res, next) {
    try {
      let tenantId;
      if (req.user.role === "super_admin" && req.body.tenant_id) {
        tenantId = req.body.tenant_id;
      } else {
        tenantId = req.user.tenant_id;
      }

      if (tenantId === null || tenantId === undefined) {
        return res.status(400).json({
          message:
            "Cannot create expense: Tenant ID is missing or not authorized.",
        });
      }

      const expenseData = {
        ...req.body,
        tenant_id: tenantId, 
      };

      const newExpense = await this.service.create(
        expenseData,
        req.user,
        req.db
      );
      res.status(201).json(newExpense);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      let tenantId = req.user.tenant_id;

      if (req.user.role === "super_admin") {
        tenantId = req.query.tenant_id || null;
      }

      const data = await this.service.getAll(tenantId, req.query, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      let tenantId = req.user.tenant_id;

      if (req.user.role === "super_admin") {
        tenantId = req.query.tenant_id || null;
      }

      const data = await this.service.getPaginatedByTenantId(
        tenantId,
        req.query,
        req.db
      );
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const expense = await this.service.getById(
        req.params.id,
        req.user.tenant_id,
        req.db
      );
      if (!expense) {
        return res
          .status(404)
          .json({ message: "Expense not found or not authorized" });
      }
      res.json(expense);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updatedExpense = await this.service.update(
        req.params.id,
        req.user.tenant_id,
        req.body,
        req.db
      );
      if (!updatedExpense) {
        return res
          .status(404)
          .json({ message: "Expense not found or not authorized to update" });
      }
      res.json(updatedExpense);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await this.service.delete(
        req.params.id,
        req.user.tenant_id,
        req.db
      );
      if (!result) {
        return res
          .status(404)
          .json({ message: "Expense not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Expense deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ExpenseController;
