class AccountController {
  constructor(accountService) {
    this.service = accountService;
  }

  async getAll(req, res, next) {
    try {
      const accounts = await this.service.getAllAccounts(
        req.user,
        req.query,
        req.db,
      );
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const newAccount = await this.service.create(req.body, req.user, req.db);

      // WRAPPED SUCCESS RESPONSE
      res.status(201).json({ status: "success", data: newAccount });
    } catch (error) {
      // CATCH SERVICE ERRORS
      if (error.message.includes("already exists")) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const account = await this.service.getById(
        req.params.id,
        req.user,
        req.db,
      );
      if (!account) {
        return res
          .status(404)
          .json({ message: "Account not found or not authorized" });
      }
      res.json(account);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await this.service.update(
        req.params.id,
        req.body,
        req.user,
        req.db,
      );

      if (!updated) {
        return res
          .status(404)
          .json({ message: "Account not found or not authorized" });
      }

      // WRAPPED SUCCESS RESPONSE
      res.json({ status: "success", data: updated });
    } catch (error) {
      if (error.message.includes("already taken")) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const deleted = await this.service.delete(
        req.params.id,
        req.user,
        req.db,
      );
      if (!deleted) {
        return res
          .status(404)
          .json({ message: "Account not found or not authorized" });
      }
      res.status(200).json({ message: "Account deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AccountController;
