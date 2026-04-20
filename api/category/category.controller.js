class CategoryController {
  constructor(categoryService) {
    this.service = categoryService;
  }

  async create(req, res, next) {
    try {
      // Pass req.db
      const newCategory = await this.service.create(req.body, req.user, req.db);
      res.status(201).json(newCategory);
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
      const category = await this.service.getById(req.params.id, req.user, req.db);
      if (!category) {
        return res
          .status(404)
          .json({ message: "Category not found or not authorized" });
      }
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      // Pass req.db
      const updatedCategory = await this.service.update(
        req.params.id,
        req.body, 
        req.user,
        req.db
      );
      if (!updatedCategory) {
        return res
          .status(404)
          .json({ message: "Category not found or not authorized to update" });
      }
      res.json(updatedCategory);
    } catch (error) {
      if (error.message.includes('already exists')) {
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
          .json({ message: "Category not found or not authorized to delete" });
      }
      res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CategoryController;