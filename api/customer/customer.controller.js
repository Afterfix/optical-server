class CustomerController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getAll(req.user, req.db);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  async create(req, res, next) {
    try {
      const data = await this.service.create(req.body, req.user, req.db);
      res.status(201).json({ status: "success", data });
    } catch (e) {
      if (e.message.includes("exists"))
        return res.status(400).json({ error: e.message });
      next(e);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await this.service.getById(req.params.id, req.user, req.db);
      data ? res.json(data) : res.status(404).json({ message: "Not found" });
    } catch (e) {
      next(e);
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
      updated
        ? res.json({ status: "success", data: updated })
        : res.status(404).json({ message: "Not found" });
    } catch (e) {
      if (e.message.includes("exists"))
        return res.status(400).json({ error: e.message });
      next(e);
    }
  }

  async delete(req, res, next) {
    try {
      const deleted = await this.service.delete(
        req.params.id,
        req.user,
        req.db,
      );
      deleted
        ? res.json({ message: "Deleted successfully" })
        : res.status(404).json({ message: "Not found" });
    } catch (e) {
      next(e);
    }
  }
}
module.exports = CustomerController;
