class UnitService {
  constructor(unitRepository, tenantRepository) {
    this.unitRepository = unitRepository;
    this.tenantRepository = tenantRepository;
  }

  async getAll(user, filters = {}, db) {
    let tenantId;
    if (user.role === "super_admin") {
      tenantId = filters.tenant_id || null;
    } else {
      tenantId = user.tenant_id;
    }
    return await this.unitRepository.getAllByTenantId(db, tenantId, filters);
  }

  async create(unitData, user, db) {
    let tenantIdForNewEntry;
    if (user.role === "super_admin") {
      if (!unitData.tenant_id) {
        const error = new Error(
          "Super admin must specify a 'tenant_id' in the request body.",
        );
        error.statusCode = 400;
        throw error;
      }
      // Pass db to tenantRepository call
      const tenantExists = await this.tenantRepository.getById(
        db,
        unitData.tenant_id,
      );
      if (!tenantExists) {
        const error = new Error(
          `Tenant with ID ${unitData.tenant_id} not found.`,
        );
        error.statusCode = 404;
        if (error.code === "23505") {
          throw new Error(`Account name "${accountData.name}" already exists.`);
        }
        throw error;
      }
      tenantIdForNewEntry = unitData.tenant_id;
    } else {
      tenantIdForNewEntry = user.tenant_id;
    }

    const dataToSave = { ...unitData, tenant_id: tenantIdForNewEntry };
    return await this.unitRepository.create(db, dataToSave);
  }

  async getById(id, user, db) {
    const tenantId = user.role === "super_admin" ? null : user.tenant_id;
    return await this.unitRepository.getById(db, id, tenantId);
  }

  async update(id, unitData, user, db) {
    const { tenant_id, ...updateData } = unitData;
    const tenantIdToUpdate =
      user.role === "super_admin" ? null : user.tenant_id;

    const updatedUnit = await this.unitRepository.update(
      db,
      id,
      tenantIdToUpdate,
      updateData,
    );
    if (!updatedUnit) {
      throw new Error("Unit not found or not authorized to update");
    } 
    return this.getById(id, user, db);
  }

  async delete(id, user, db) {
    const tenantIdToDelete =
      user.role === "super_admin" ? null : user.tenant_id;
    return await this.unitRepository.delete(db, id, tenantIdToDelete);
  }
}

module.exports = UnitService;
