class EmployeeController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      // Pass req.db
      const data = await this.service.getAll(req.user, req.query, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      // Pass req.db
      const data = await this.service.getAllPaginated(req.user, req.query, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      // Pass req.db
      const employee = await this.service.getById(req.params.id, req.user, req.db);
      if (!employee) {
        return res
          .status(404)
          .json({ message: "Employee not found or not authorized" });
      }
      res.json(employee);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      // Pass req.db
      const newEmployee = await this.service.create(req.body, req.user, req.db);
      res.status(201).json(newEmployee);
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      // Pass req.db
      const updatedEmployee = await this.service.update(
        req.params.id,
        req.body,
        req.user,
        req.db
      );
      if (!updatedEmployee) {
        return res
          .status(404)
          .json({ message: "Employee not found or not authorized to update" });
      }
      res.json(updatedEmployee);
    } catch (error) {
      if (error.message.includes('already taken')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      // Pass req.db
      const result = await this.service.delete(req.params.id, req.user, req.db);
       if (!result) {
        return res
          .status(404)
          .json({ message: "Employee not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Employee deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}
module.exports = EmployeeController;