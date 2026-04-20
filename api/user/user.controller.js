class UserController {
  constructor(service) {
    this.service = service;
  }

  async getProfile(req, res, next) {
    try {
      const user = await this.service.getById(req.user.id, req.db);
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { username, currentPassword, newPassword } = req.body;
      const updatedUser = await this.service.updateUserProfile(req.user.id, {
        username,
        currentPassword,
        newPassword,
      }, req.db);

      const { password, ...cleanUser } = updatedUser;
      res.json({
        message: "Profile updated successfully",
        user: cleanUser,
      });
    } catch (error) {
      next(error);
    }
  }
  

  async deleteProfile(req, res, next) {
    try {
      await this.service.deleteUser(req.user.id, req.db);
      res.json({ message: "User profile deleted successfully." });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const newUser = await this.service.createUserByAdmin(req.user, req.body, req.db);
      res.status(201).json({
        message: 'User created successfully',
        user: newUser,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const user = await this.service.getAllUsers(req.user, req.db);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      const result = await this.service.getPaginatedUsers(req.query, req.user, req.db);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const user = await this.service.getById(req.params.id, req.db);
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  }

  async updateUserById(req, res, next) {
    try {
      const updatedUser = await this.service.updateUserByAdmin(
        req.params.id,
        req.body,
        req.db
      );

      const { password, ...cleanUser } = updatedUser;
      res.json({
        message: "User updated successfully",
        user: cleanUser,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUserById(req, res, next) {
    try {
      await this.service.deleteUser(req.params.id, req.db);
      res.json({ message: "User deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;