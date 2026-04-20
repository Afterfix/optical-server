class RoleController {
  constructor(roleService) {
    this.service = roleService;
  }

  async create(req, res, next) {
    try {
      const newRole = await this.service.create(req.body, req.user);
      res.status(201).json(newRole);
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const roles = await this.service.getAll(req.user, req.query);
      res.json(roles);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const role = await this.service.getById(req.params.id, req.user);
      res.json(role);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async update(req, res, next) {
    try {
      const updatedRole = await this.service.update(
        req.params.id,
        req.body,
        req.user
      );
      res.json(updatedRole);
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.service.delete(req.params.id, req.user);
      res.status(200).json({ message: "Role deleted successfully" });
    } catch (error) {
      if (error.statusCode === 403) {
        return res.status(403).json({ message: error.message });
      }
      res.status(404).json({ message: error.message });
    }
  }
}

module.exports = RoleController;