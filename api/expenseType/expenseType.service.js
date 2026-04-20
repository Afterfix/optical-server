class ExpenseTypeService {
  constructor(expenseTypeRepository, tenantRepository) {
    this.expenseTypeRepository = expenseTypeRepository;
    this.tenantRepository = tenantRepository;
  }

  async getAll(user, filters, db) {
    let tenantId =
      user.role === "super_admin" ? filters.tenant_id || null : user.tenant_id;
    return await this.expenseTypeRepository.getAllByTenantId(
      db,
      tenantId,
      filters,
    );
  }

  async create(expenseTypeData, user, db) {
    try {
      let tenantId;
      if (user.role === "super_admin") {
        if (!expenseTypeData.tenant_id) {
          const error = new Error(
            "Super admin must specify a 'tenant_id' in the request body.",
          );
          error.statusCode = 400;
          throw error;
        }

        const tenantExists = await this.tenantRepository.getById(
          db,
          expenseTypeData.tenant_id,
        );
        if (!tenantExists) {
          const error = new Error(
            `Tenant with ID ${expenseTypeData.tenant_id} not found.`,
          );
          error.statusCode = 404;
          throw error;
        }
        tenantId = expenseTypeData.tenant_id;
      } else {
        tenantId = user.tenant_id;
      }

      const dataToSave = { ...expenseTypeData, tenant_id: tenantId };
      const newType = await this.expenseTypeRepository.create(db, dataToSave);

      return {
        status: "success",
        data: newType,
      };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(
          `Expense type "${expenseTypeData.name}" already exists for this tenant.`,
        );
      }
      throw error;
    }
  }

  async getById(id, user, db) {
    if (user.role === "super_admin") {
      return await this.expenseTypeRepository.getById(db, id);
    } else {
      return await this.expenseTypeRepository.getById(db, id, user.tenant_id);
    }
  }

  async update(id, data, user, db) {
    try {
      const { tenant_id, ...updateData } = data;
      let updatedType;

      if (user.role === "super_admin") {
        updatedType = await this.expenseTypeRepository.update(
          db,
          id,
          updateData,
        );
      } else {
        updatedType = await this.expenseTypeRepository.update(
          db,
          id,
          updateData,
          user.tenant_id,
        );
      }

      if (!updatedType) return null;

      return {
        status: "success",
        data: updatedType,
      };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(`The name "${data.name}" is already taken.`);
      }
      throw error;
    }
  }

  async delete(id, user, db) {
    let data;
    if (user.role === "super_admin") {
      data = await this.expenseTypeRepository.delete(db, id);
    } else {
      data = await this.expenseTypeRepository.delete(db, id, user.tenant_id);
    }

    return {
      status: "success",
      data: data,
    };
  }
}

module.exports = ExpenseTypeService;
