class CostCenterController {
  constructor(costCenterService) {
    this.service = costCenterService;
  }

  async create(req, res, next) {
    try {
      const newCostCenter = await this.service.create(req.body, req.user); // ✅ Removed req.db
      res.status(201).json(newCostCenter);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await this.service.getAll(req.user, req.query); // ✅ Removed req.db
      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const costCenter = await this.service.getById(req.params.id, req.user); // ✅ Removed req.db
      if (!costCenter) {
        return res
          .status(404)
          .json({ message: "Cost Center not found or not authorized" });
      }
      res.json(costCenter);
    } catch (error){
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updatedCostCenter = await this.service.update(
        req.params.id,
        req.body,
        req.user
      );
      if (!updatedCostCenter) {
        return res.status(404).json({
          message: "Cost Center not found or not authorized to update",
        });
      }
      res.json(updatedCostCenter);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await this.service.delete(req.params.id, req.user); // ✅ Removed req.db
      if (!result) {
        return res.status(404).json({
          message: "Cost Center not found or not authorized to delete",
        });
      }
      res.status(200).json({ message: "Cost Center deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CostCenterController;