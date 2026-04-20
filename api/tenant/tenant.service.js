class TenantService {
  constructor(
    tenantRepository,
    roleRepository,
    userRepository,
    userSettingsRepository,
    travelXLedgerRepository,
    gadgetXLedgerRepository,
    travelXPartyService,
    gadgetXPartyService,
  ) {
    this.tenantRepository = tenantRepository;
    this.roleRepository = roleRepository;
    this.userRepository = userRepository;
    this.userSettingsRepository = userSettingsRepository;
    this.travelXLedgerRepository = travelXLedgerRepository;
    this.gadgetXLedgerRepository = gadgetXLedgerRepository;
    this.travelXPartyService = travelXPartyService;
    this.gadgetXPartyService = gadgetXPartyService;
  }

  async create(tenantData, db) {
    // 1. Create the Tenant
    const tenant = await this.tenantRepository.create(db, tenantData);

    // 2. Create the Admin Role
    const role = await this.createAdminRuleForTenant(db, tenant.id);

    // 3. Create the User
    const { username, password } = tenantData;
    await this.userRepository.create(db, {
      username,
      password,
      tenant_id: tenant.id,
      role_id: role.id,
    });

    // --- NEW SECTION: Create Walking Customer based on Tenant Type ---
    try {
      if (tenant.type === "travelx") {
        await this.createWalkingCustomer(
          db,
          tenant.id,
          this.travelXPartyService,
        );
      } else if (tenant.type === "gadget") {
        await this.createWalkingCustomer(
          db,
          tenant.id,
          this.gadgetXPartyService,
        );
      }
    } catch (error) {
      console.warn(
        `⚠️ Failed to create Walking Customer for ${tenant.type}:`,
        error.message,
      );
    }
    // ----------------------------------------------------------------

    // 4. Create User Settings - ONLY IF VEHICLE
    if (tenant.type === "vehicle") {
      try {
        const settingsData = {
          permissions: tenantData.permissions || [],
          plan: tenant.plan,
          vehicle_info: tenantData.vehicle_info || {},
          company_logo: "",
          cost_center: "",
        };

        await this.userSettingsRepository.create(db, tenant.id, settingsData);
      } catch (error) {
        console.warn("⚠️ Failed to create user_settings.:", error.message);
      }
    }

    // 5. Create Default Ledgers (Cash in Hand & Cash in Bank)
    try {
      if (tenant.type === "travelx" && this.travelXLedgerRepository) {
        await this.createDefaultLedgers(
          db,
          tenant.id,
          this.travelXLedgerRepository,
        );
      } else if (tenant.type === "gadget" && this.gadgetXLedgerRepository) {
        await this.createDefaultLedgers(
          db,
          tenant.id,
          this.gadgetXLedgerRepository,
        );
      }
    } catch (error) {
      console.error("⚠️ Failed to create default ledgers:", error.message);
      throw error;
    }

    return await this.getById(tenant.id, db);
  }

  async createAdminRuleForTenant(db, tenant_id) {
    const roleData = { name: "admin", tenant_id, permissions: {} };
    return await this.roleRepository.create(db, roleData);
  }

  // --- ADDED: Helper method ---
  async createWalkingCustomer(db, tenantId, partyService) {
    const partyData = {
      name: "Walking Customer",
      type: "customer",
      email: "",
      phone: "",
      address: "",
      credit_limit: 0,
      outstanding_balance: 0,
    };

    // Mock user context as PartyService expects { tenant_id }
    const mockUserContext = { tenant_id: tenantId };

    // This calls the specific party service (TravelX or GadgetX)
    // which internally calls the specific ledger service.
    await partyService.create(partyData, mockUserContext, db);
  }
  // -----------------------------

  async createDefaultLedgers(db, tenantId, ledgerRepository) {
    const defaultLedgers = ["Cash in Hand", "Cash in Bank"];

    for (const name of defaultLedgers) {
      await ledgerRepository.create(db, {
        name,
        tenant_id: tenantId,
        type: "asset",
        opening_balance: 0,
        balance: 0,
      });
    }
  }

  async getAll(filters, db) {
    const tenants = await this.tenantRepository.getAllWithAdminUser(
      db,
      filters,
    );

    const tenantsWithSettings = await Promise.all(
      tenants.map(async (tenant) => {
        if (tenant.type === "vehicle") {
          try {
            const settings = await this.userSettingsRepository.getByTenantId(
              db,
              tenant.id,
            );
            if (settings) {
              return {
                ...tenant,
                vehicle_info: settings.vehicle_info,
                settings_permissions: settings.permissions,
              };
            }
          } catch (err) {}
        }
        return tenant;
      }),
    );

    return tenantsWithSettings;
  }

  async getById(id, db) {
    const tenant = await this.tenantRepository.getById(db, id);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (tenant.type === "vehicle") {
      try {
        const settings = await this.userSettingsRepository.getByTenantId(
          db,
          id,
        );
        if (settings) {
          tenant.vehicle_info = settings.vehicle_info;
          tenant.settings_permissions = settings.permissions;
        }
      } catch (err) {
        console.warn(
          `⚠️ Could not fetch settings for vehicle tenant ${id}:`,
          err.message,
        );
      }
    }

    return tenant;
  }

  async update(id, tenantData, db) {
    const tenant = await this.getById(id, db);

    await this.tenantRepository.update(db, id, tenantData);

    if (
      tenant.type === "vehicle" &&
      (tenantData.vehicle_info || tenantData.permissions)
    ) {
      try {
        const settingsUpdate = {
          vehicle_info: tenantData.vehicle_info,
          permissions: tenantData.permissions,
        };
        await this.userSettingsRepository.updateByTenantId(
          db,
          id,
          settingsUpdate,
        );
      } catch (error) {
        console.warn("⚠️ Failed to update user_settings:", error.message);
      }
    }

    return await this.getById(id, db);
  }

  async delete(id, db) {
    const tenant = await this.getById(id, db);
    await this.tenantRepository.delete(db, id);
    return tenant;
  }
}

module.exports = TenantService;
