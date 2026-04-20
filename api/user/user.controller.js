
class UserController {
  constructor(service) {
    this.service = service;
  }

  // ... (getProfile, updateProfile, etc. are unchanged)
  async getProfile(req, res, next) {
    try {
      const user = await this.service.getById(req.user.id);
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
      });

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
      await this.service.deleteUser(req.user.id);
      res.json({ message: "User profile deleted successfully." });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const newUser = await this.service.createUserByAdmin(req.user, req.body);
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
      // This is updated
      const user = await this.service.getAllUsers(req.user);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  async getAllPaginated(req, res, next) {
    try {
      // This is updated - Pass the full user object to the service
      const result = await this.service.getPaginatedUsers(req.query, req.user);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ... (getById, updateUserById, etc. are unchanged)
  async getById(req, res, next) {
    try {
      const user = await this.service.getById(req.params.id);
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
        req.body
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
      await this.service.deleteUser(req.params.id);
      res.json({ message: "User deleted successfully." });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;