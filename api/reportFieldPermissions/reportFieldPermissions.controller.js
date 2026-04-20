class ReportFieldPermissionsController {
  constructor(service) {
    this.service = service;
  }

  // Corresponds to getReportFieldPermissions
  async get(req, res, next) {
    try {
      const data = await this.service.getForCurrentUser(req.user, req.db);
      if (!data) {
        return res
          .status(404)
          .json({ message: 'Report field permissions not found for this user.' });
      }
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  // Corresponds to createReportFieldPermissions
  async create(req, res, next) {
    try {
      const newPermissions = await this.service.create(
        req.user,
        req.body,
        req.db,
      );
      res.status(201).json(newPermissions);
    } catch (error) {
      if (error.message.includes('already exist')) {
        return res.status(409).json({ error: error.message });
      }
      next(error);
    }
  }

  // Corresponds to updateReportFieldPermissions
  async update(req, res, next) {
    try {
      const updatedPermissions = await this.service.update(
        req.params.id,
        req.user,
        req.body,
        req.db,
      );
      res.json(updatedPermissions);
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }
}

module.exports = ReportFieldPermissionsController;