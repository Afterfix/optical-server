class TransactionFieldPermissionsController {
  constructor(service) {
    this.service = service;
  }

  async get(req, res, next) {
    try {
      const data = await this.service.getForCurrentUser(req.user, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await this.service.update(
        req.params.id,
        req.user,
        req.body,
        req.db,
      );
      res.json(updated);
    } catch (error) {
      if (error.message.includes("not found"))
        return res.status(404).json({ error: error.message });
      next(error);
    }
  }
}

module.exports = TransactionFieldPermissionsController;
