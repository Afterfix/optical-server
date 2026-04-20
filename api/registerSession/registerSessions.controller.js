class RegisterSessionsController {
  constructor(service) {
    this.service = service;
  }

  async openSession(req, res, next) {
    try {
      const session = await this.service.openSession(req.user, req.body, req.db);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }

  async closeSession(req, res, next) {
    try {
      const result = await this.service.closeSession(req.params.id, req.user, req.body, req.db);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentSession(req, res, next) {
    try {
      const result = await this.service.getCurrentSession(req.user, req.db);
      if (!result) {
        return res.status(404).json({ message: "No active session found." });
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const result = await this.service.getSessionReport(req.params.id, req.user.tenant_id, req.db);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      const filters = req.query;
      const data = await this.service.getAllPaginated(req.user.tenant_id, filters, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RegisterSessionsController;