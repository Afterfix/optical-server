class ItemCustomFieldValuesController {
  constructor(service) {
    this.service = service;
  }

  async getByItemId(req, res, next) {
    try {
      const data = await this.service.getByItemId(
        req.params.itemId,
        req.user,
        req.db
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const data = await this.service.save(
        req.params.itemId,
        req.body.fields,
        req.user,
        req.db
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ItemCustomFieldValuesController;