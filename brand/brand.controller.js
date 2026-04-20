class BrandController {
  constructor(brandService) {
    this.service = brandService;
  }

  async create(req, res, next) {
    try {
      // Pass req.db
      const newBrand = await this.service.create(req.body, req.user, req.db);
      res.status(201).json(newBrand);
    } catch (error) {
      if (error.message.includes("already exists")) {
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
      const brand = await this.service.getById(req.params.id, req.user, req.db);
      if (!brand) {
        return res
          .status(404)
          .json({ message: "Brand not found or not authorized" });
      }
      res.json(brand);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      // Pass req.db
      const updatedBrand = await this.service.update(
        req.params.id,
        req.body,
        req.user,
        req.db,
      );
      if (!updatedBrand) {
        return res
          .status(404)
          .json({ message: "Brand not found or not authorized to update" });
      }
      res.json(updatedBrand);
    } catch (error) {
      if (error.message.includes("already taken")) {
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
          .json({ message: "Brand not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Brand deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BrandController;
