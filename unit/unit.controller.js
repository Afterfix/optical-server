class UnitController {
  constructor(unitService) {
    this.service = unitService;
  }

  async create(req, res, next) {
    try {
      const newUnit = await this.service.create(req.body, req.user, req.db);
      res.status(201).json(newUnit);
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
      const unit = await this.service.getById(req.params.id, req.user, req.db);
      if (!unit) {
        return res
          .status(404)
          .json({ message: "Unit not found or not authorized" });
      }
      res.json(unit);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updatedUnit = await this.service.update(
        req.params.id,
        req.body,
        req.user,
        req.db
      );
      if (!updatedUnit) {
        return res
          .status(404)
          .json({ message: "Unit not found or not authorized to update" });
      }
      res.json(updatedUnit);
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
        return res
          .status(404)
          .json({ message: "Unit not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Unit deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UnitController;