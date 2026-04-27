class PayrollController {
  constructor(service) {
    this.service = service;
  }

  async create(req, res, next) {
    try {
      const newPayroll = await this.service.create(req.body, req.user, req.db);
      res.status(201).json(newPayroll);
    } catch (error) {
      next(error);
    }
  }

  async createBulk(req, res, next) {
    try {
      const newPayrolls = await this.service.createBulk(req.body, req.user, req.db);
      res.status(201).json(newPayrolls);
    } catch (error) {
      next(error);
    }
  }

  async getAllPayrolls(req, res, next) {
    try {
      const data = await this.service.getAll(req.user, req.query, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      const data = await this.service.getAllPaginated(req.user, req.query, req.db);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const payroll = await this.service.getById(req.params.id, req.user, req.db);
      if (!payroll) {
        return res.status(404).json({ message: "Payroll record not found or not authorized" });
      }
      res.json(payroll);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updatedPayroll = await this.service.update(req.params.id, req.body, req.user, req.db);
      res.json(updatedPayroll);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.service.delete(req.params.id, req.user, req.db);
      res.status(200).json({ message: "Payroll record deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PayrollController;