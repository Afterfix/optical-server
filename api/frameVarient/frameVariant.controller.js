const {
  moveFrameVariantImage,
  deleteFrameVariantImageFile,
} = require("../../middlewares/upload");

class FrameVariantController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res, next) {
    try {
      const result = await this.service.getAll(req.user, req.query, req.db);
      res.json(result);
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
      const variant = await this.service.getById(
        req.params.id,
        req.user,
        req.db,
      );
      res.json(variant);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const data = { ...req.body };

      // Handle image upload
      if (req.file) {
        const tenantId =
          req.user.role === "super_admin"
            ? data.tenant_id || req.user.tenant_id
            : req.user.tenant_id;
        const imagePath = await moveFrameVariantImage(req.file, tenantId);
        if (imagePath) {
          data.image = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
        }
      }

      const result = await this.service.create(data, req.user, req.db);
      res
        .status(result.status === "success" ? 201 : result.error.statusCode)
        .json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = { ...req.body };

      // Handle image upload
      if (req.file) {
        const tenantId = req.user.role === "super_admin" ? null : req.user.tenant_id;
        // Delete old image if exists
        const existing = await this.service.getById(req.params.id, req.user, req.db);
        if (existing && existing.image) {
          await deleteFrameVariantImageFile(existing.image);
        }
        const imagePath = await moveFrameVariantImage(req.file, req.user.tenant_id);
        if (imagePath) {
          data.image = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
        }
      }

      const result = await this.service.update(
        req.params.id,
        data,
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
      // Delete the image file before deleting the record
      const existing = await this.service.getById(req.params.id, req.user, req.db);
      if (existing && existing.image) {
        await deleteFrameVariantImageFile(existing.image);
      }

      const result = await this.service.delete(req.params.id, req.user, req.db);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FrameVariantController;
