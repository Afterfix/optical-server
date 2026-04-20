class FrameVariantController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const result = await this.service.getAll(req.user, req.query, req.db);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      const data = await this.service.getAllPaginated(
        req.user,
        req.query,
        req.db,
      );
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const variant = await this.service.getById(
        req.params.id,
        req.user,
        req.db,
      );
      res.json(variant);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const result = await this.service.create(req.body, req.user, req.db);
      res
        .status(result.status === "success" ? 201 : result.error.statusCode)
        .json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const result = await this.service.update(
        req.params.id,
        req.body,
        req.user,
        req.db,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await this.service.delete(req.params.id, req.user, req.db);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FrameVariantController;
