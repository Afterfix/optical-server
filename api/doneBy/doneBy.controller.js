class DoneByController {
  constructor(doneByService) {
    this.service = doneByService;
  }

  async create(req, res, next) {
    try {
      const newDoneBy = await this.service.create(req.body, req.user, req.db);
      res.status(201).json(newDoneBy);
    } catch (error) {
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
      const doneBy = await this.service.getById(req.params.id, req.user, req.db);
      if (!doneBy) {
        return res
          .status(404)
          .json({ message: "Done By not found or not authorized" });
      }
      res.json(doneBy);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updatedDoneBy = await this.service.update(
        req.params.id,
        req.body,
        req.user,
        req.db
      );
      if (!updatedDoneBy) {
        return res
          .status(404)
          .json({ message: "Done By not found or not authorized to update" });
      }
      res.json(updatedDoneBy);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await this.service.delete(req.params.id, req.user, req.db);
      if (!result) {
        return res
          .status(404)
          .json({ message: "Done By not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Done By deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DoneByController;