class ExpenseTypeController {
  constructor(expenseTypeService) {
    this.service = expenseTypeService;
  }

  async create(req, res, next) {
    try {
      const newExpenseType = await this.service.create(
        req.body,
        req.user,
        req.db
      );
      res.status(201).json(newExpenseType);
    } catch (error) {
       if (error.message.includes('already exists')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getAll(req.user, req.query, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const expenseType = await this.service.getById(
        req.params.id,
        req.user,
        req.db
      );
      if (!expenseType) {
        return res
          .status(404)
          .json({ message: "Expense Type not found or not authorized" });
      }
      res.json(expenseType);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updatedExpenseType = await this.service.update(
        req.params.id,
        req.body,
        req.user,
        req.db
      );
      if (!updatedExpenseType) {
        return res.status(404).json({
          message: "Expense Type not found or not authorized to update",
        });
      }
      res.json(updatedExpenseType);
    } catch (error) {
       if (error.message.includes('already taken')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await this.service.delete(req.params.id, req.user, req.db);
      if (!result) {
        return res.status(404).json({
          message: "Expense Type not found or not authorized to delete",
        });
      }
      res.status(200).json({ message: "Expense Type deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ExpenseTypeController;
