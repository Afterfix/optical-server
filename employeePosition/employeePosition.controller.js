class EmployeePositionController {
  constructor(employeePositionService) {
    this.service = employeePositionService;
  }

  async create(req, res, next) {
    try {
      // Pass req.db
      const newEmployeePosition = await this.service.create(req.body, req.user, req.db);
      res.status(201).json(newEmployeePosition);
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
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

  async getById(req, res, next) {
    try {
      // Pass req.db
      const employeePosition = await this.service.getById(req.params.id, req.user, req.db);
      if (!employeePosition) {
        return res
          .status(404)
          .json({ message: "Employee Position not found or not authorized" });
      }
      res.json(employeePosition);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      // Pass req.db
      const updatedEmployeePosition = await this.service.update(
        req.params.id,
        req.body,
        req.user,
        req.db
      );
      if (!updatedEmployeePosition) {
        return res.status(404).json({
          message: "Employee Position not found or not authorized to update",
        });
      }
      res.json(updatedEmployeePosition);
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
        return res.status(404).json({
          message: "Employee Position not found or not authorized to delete",
        });
      }
      res
        .status(200)
        .json({ message: "Employee Position deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EmployeePositionController;