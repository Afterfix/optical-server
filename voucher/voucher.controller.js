class VoucherController {
  constructor(service) {
    this.service = service;
  }

  async create(req, res, next) {
    try {
      const newVoucher = await this.service.create(req.user, req.body, req.db);
      res.status(201).json(newVoucher);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updatedVoucher = await this.service.update(
        req.params.id,
        req.user,
        req.body,
        req.db
      );
      res.json(updatedVoucher);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.service.delete(req.params.id, req.user, req.db);
      res.status(200).json({ message: "Voucher removed successfully" });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const voucher = await this.service.getById(
        req.params.id,
        req.user.tenant_id,
        req.db
      );
      res.json(voucher);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const filters = req.query;
      const data = await this.service.getAll(
        req.user.tenant_id,
        filters,
        req.db
      );
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      const filters = req.query;
      const data = await this.service.getPaginated(
        req.user.tenant_id,
        filters,
        req.db
      );
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = VoucherController;