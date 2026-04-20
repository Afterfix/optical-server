class ItemController {
  constructor(itemService) {
    this.service = itemService;
  }

  async create(req, res, next) {
    try {
      const itemData = {
        ...req.body,
        tenant_id: req.user.tenant_id,
      };
    
      if (req.file) {
        itemData.imageFile = req.file;
      }
      
      // Pass req.db
      const newItem = await this.service.create(itemData, req.db);
      res.status(201).json(newItem);
    } catch (error) {
      if (req.file) {
        try {
            const fs = require('fs').promises;
            await fs.unlink(req.file.path);
        } catch (cleanupError) {
            console.error("Failed to clean up temporary file on create error:", cleanupError);
        }
      }
      if (error.statusCode === 409) {
        return res.status(409).json({ error: error.message });
      }
       if (error.message.includes('already exists')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updateData = { ...req.body };
      if (req.file) {
        updateData.imageFile = req.file;
      }
      // Pass req.db
      const updatedItem = await this.service.update(
        req.params.id,
        req.user.tenant_id,
        updateData,
        req.db
      );
      if (!updatedItem) {
        if (req.file) {
          try {
            const fs = require('fs').promises;
            await fs.unlink(req.file.path);
          } catch (e) {}
        }
        return res
          .status(404)
          .json({ message: "Item not found or not authorized to update" });
      }
      res.json(updatedItem);
    } catch (error) {
      if (req.file) {
        try {
            const fs = require('fs').promises;
            await fs.unlink(req.file.path);
        } catch (cleanupError) {
            console.error("Failed to clean up temporary file on update error:", cleanupError);
        }
      }
      if (error.statusCode === 409) {
        return res.status(409).json({ error: error.message });
      }
       if (error.message.includes('already exists')) {
        return res.status(400).json({ status: "failed", error: error.message });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      // Pass req.db
      const result = await this.service.delete(req.params.id, req.user.tenant_id, req.db); 
      if (!result) {
        return res
          .status(404)
          .json({ message: "Item not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Item deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      // Pass req.db
      const item = await this.service.getById(req.params.id, req.user.tenant_id, req.db); 
      if (!item) {
        return res
          .status(404)
          .json({ message: "Item not found or not authorized" });
      }
      res.json(item);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const filters = req.query;
      // Pass req.db
      const items = await this.service.getAll(req.user.tenant_id, filters, req.db); 
      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      const filters = req.query;
      // Pass req.db
      const data = await this.service.getPaginatedByTenantId(
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

module.exports = ItemController;