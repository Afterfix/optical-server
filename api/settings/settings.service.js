class SettingsService {
  constructor(repository, userRepository) {
    this.repository = repository;
    this.userRepository = userRepository; // This is updated
  }

  async getSettings(user, db) {
    const settings = await this.repository.getByUserId(db, user.id);
    if (settings) {
      return settings;
    }

    return {
      user_id: user.id,
      tenant_id: user.tenant_id,
      app_name: "accountX",
      logo: null,
      country: null,
      sidebar_labels: {
        dashboard: "Dashboard",
        sales: "Sales",
        sale_return: "Sale Return",
        employees: "Employees",
        expenses: "Expenses",
        partnerships: "Partnerships",
        purchase: "Purchase",
        purchase_return: "Purchase Return",
        daily_summary: "Daily Summary",
        monthly_summary: "Monthly Summary",
        reports: "Reports",
        lists: "Lists",
      },
      user_settings: {},
    };
  }

  async updateSettings(user, partialSettingsData, db) {
    return this.repository.createOrUpdate(
      db,
      user.id,
      user.tenant_id,
      partialSettingsData
    );
  }

  // This is updated - New method for admin
  async getSettingsByUserId(userId, db) {
    const settings = await this.repository.getByUserId(db, userId);
    if (settings) {
      return settings;
    }
    // If no settings exist, fetch the user to create a default object
    const user = await this.userRepository.getById(db, userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    return this.getSettings(user, db); // Reuse existing default logic
  }

  // This is updated - New method for admin
  async updateSettingsByUserId(userId, partialSettingsData, db) {
    const user = await this.userRepository.getById(db, userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    return this.repository.createOrUpdate(
      db,
      user.id,
      user.tenant_id,
      partialSettingsData
    );
  }
}

module.exports = SettingsService;