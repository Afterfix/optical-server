class ServicesController {
  constructor(servicesService) {
    this.service = servicesService;
  }

  async getAll(req, res, next) {
    try {
      const services = await this.service.getAll(req.user, req.query);
      res.json(services);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const newService = await this.service.create(req.body, req.user);
      res.status(201).json(newService);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      const data = await this.service.getAllPaginated(req.user, req.query);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const service = await this.service.getById(req.params.id, req.user);
      if (!service) {
        return res
          .status(404)
          .json({ message: "Service not found or not authorized" });
      }
      res.json(service);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await this.service.update(
        req.params.id,
        req.body,
        req.user
      );
      if (!updated) {
        return res
          .status(404)
          .json({ message: "Service not found or not authorized to update" });
      }
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await this.service.delete(req.params.id, req.user);
      if (!result) {
        return res
          .status(404)
          .json({ message: "Service not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Service deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ServicesController;