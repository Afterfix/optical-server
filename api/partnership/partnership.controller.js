class PartnershipController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const filters = req.query;
      // Pass req.db
      const partnerships = await this.service.getAll(
        req.user.tenant_id,
        filters,
        req.db
      );
      res.json(partnerships);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      const filters = req.query;
      // Pass req.db
      const partnerships = await this.service.getAllPaginated(
        req.user.tenant_id,
        filters,
        req.db
      );
      res.json(partnerships);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      // Pass req.db
      const partnership = await this.service.getById(
        req.params.id,
        req.user.tenant_id,
        req.db
      );
      res.json(partnership);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      // Pass req.db
      const newPartnership = await this.service.create(
        req.user.tenant_id,
        req.body,
        req.user,
        req.db
      );
      res.status(201).json(newPartnership);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      // Pass req.db
      const updatedPartnership = await this.service.update(
        req.params.id,
        req.user.tenant_id,
        req.body,
        req.user,
        req.db
      );
      res.json(updatedPartnership);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      // Pass req.db
      await this.service.delete(req.params.id, req.user.tenant_id, req.db);
      res.json({ message: "Partnership removed" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PartnershipController;