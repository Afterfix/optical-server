class FrameController {
  constructor(frameService) {
    this.service = frameService;
  }

  async getAll(req, res, next) {
    try {
      const frames = await this.service.getAll(req.user, req.query, req.db);
      res.json(frames);
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
      const frame = await this.service.getById(req.params.id, req.user, req.db);
      res.json(frame);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
  try {
    const result = await this.service.create(req.body, req.user, req.db);
    res.status(201).json(result);
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

module.exports = FrameController;
