class CategoryCustomFieldsController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getAll(
        req.params.categoryId,
        req.user,
        req.db
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await this.service.create(
        req.body,
        req.user,
        req.db
      );
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const data = await this.service.delete(
        req.params.id,
        req.user,
        req.db
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CategoryCustomFieldsController;