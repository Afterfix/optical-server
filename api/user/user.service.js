class UserService {
  constructor(repository, tokenService, tenantRepository, userSettingsRepository) {
    this.repository = repository;
    this.tokenService = tokenService;
    this.tenantRepository = tenantRepository;
    this.userSettingsRepository = userSettingsRepository;
  }

  async createUserByAdmin(creatingAdmin, userData, db) {
    const { username, password, role_id } = userData;

    if (!username || !password || !role_id) {
      const error = new Error("Username, password, and role_id are required.");
      error.statusCode = 400;
      throw error;
    }

    const existingUser = await this.repository.getByName(db, username);
    if (existingUser) {
      const error = new Error("A user with this username already exists.");
      error.statusCode = 409;
      throw error;
    }

    const tenant_id = creatingAdmin.tenant_id;

    const newUser = {
      username,
      password,
      role_id,
      tenant_id,
    };
    
    const createdUser = await this.repository.create(db, newUser);

    // --- CHECK FOR VEHICLE TENANT AND CREATE SETTINGS ---
    if (tenant_id) {
      const tenant = await this.tenantRepository.getById(db, tenant_id);
      
      if (tenant && tenant.type === 'vehicle') {
        const existingSettings = await this.userSettingsRepository.getByTenantId(db, tenant_id);
        
        if (!existingSettings) {
          console.log(`ℹ️ Tenant type is 'vehicle'. Creating default user_settings for tenant ${tenant_id}.`);
          
          try {
            await this.userSettingsRepository.create(db, tenant_id, {
                permissions: [],
                plan: tenant.plan,
                vehicle_info: {}, 
                company_logo: '',
                cost_center: ''
            });
          } catch(err) {
             console.warn("Could not create user settings (table might be missing):", err.message);
          }
        }
      }
    }

    return this.getById(createdUser.id, db);
  }

  async getAllUsers(adminUser, db) {
    const users = await this.repository.getAll(db, adminUser);
    return this.attachSettingsToUsers(users, db);
  }

  async getPaginatedUsers(filters, adminUser, db) {
    const { user, totalCount } = await this.repository.getPaginated(
      db,
      filters,
      adminUser
    );
    
    const usersWithSettings = await this.attachSettingsToUsers(user, db);

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return {
      data: usersWithSettings,
      count: totalCount,
      page_count,
    };
  }

  // Helper to attach settings conditionally
  async attachSettingsToUsers(users, db) {
    return Promise.all(users.map(async (u) => {
        if (u.tenant_type === 'vehicle' && u.tenant_id) {
            try {
                const settings = await this.userSettingsRepository.getByTenantId(db, u.tenant_id);
                if (settings) {
                    return {
                        ...u,
                        vehicle_info: settings.vehicle_info,
                        company_logo: settings.company_logo,
                        settings_plan: settings.plan
                    };
                }
            } catch (err) {
                // Safely ignore if table doesn't exist
            }
        }
        return u;
    }));
  }

  async getById(id, db) {
    const user = await this.repository.getById(db, id);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    // Attach Settings if Vehicle
    if (user.tenant_type === 'vehicle' && user.tenant_id) {
        try {
            const settings = await this.userSettingsRepository.getByTenantId(db, user.tenant_id);
            if (settings) {
                user.settings_id = settings.id;
                user.vehicle_info = settings.vehicle_info;
                user.company_logo = settings.company_logo;
                user.settings_plan = settings.plan;
                user.cost_center = settings.cost_center;
            }
        } catch (err) {
            console.warn(`⚠️ Could not fetch user settings for user ${id}:`, err.message);
        }
    }

    return user;
  }

  async updateUserProfile(id, { username, currentPassword, newPassword }, db) {
    if (newPassword) {
      if (!currentPassword) {
        const error = new Error(
          "Current password is required to change the password."
        );
        error.statusCode = 400;
        throw error;
      }

      const user = await this.repository.getById(db, id);
      if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
      }

      const isPasswordValid = await this.repository.comparePasswords(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        const error = new Error("Incorrect current password.");
        error.statusCode = 401;
        throw error;
      }
    }

    return this.repository.update(db, id, { username, password: newPassword });
  }

  async updateUserByAdmin(id, data, db) {
    const existingUser = await this.getById(id, db);
    if (!existingUser) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (existingUser.role_name === "super_admin" && data.role_id) {
      const error = new Error(
        "You cannot modify the Super Admin role assignment."
      );
      error.statusCode = 403;
      throw error;
    }

    return this.repository.updateByAdmin(db, id, data);
  }

  async deleteUser(id, db) {
    const user = await this.getById(id, db);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (user.role_name === "super_admin") {
      const error = new Error("Cannot delete the Super Admin account.");
      error.statusCode = 403;
      throw error;
    }

    await this.tokenService.removeAllRefreshTokensForUser(id, db);
    return this.repository.delete(db, id);
  }
}

module.exports = UserService;