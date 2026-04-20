class EmployeePositionService {
  constructor(employeePositionRepository, tenantRepository) {
    this.employeePositionRepository = employeePositionRepository;
    this.tenantRepository = tenantRepository;
  }

  async getAll(user, filters = {}, db) {
    let tenantId;
    if (user.role === "super_admin") {
      tenantId = filters.tenant_id || null;
      if (!tenantId) {
        const error = new Error(
          "Bad Request: Super admin must specify a 'tenant_id' in the query parameters.",
        );
        error.statusCode = 400;
        throw error;
      }
    } else {
      tenantId = user.tenant_id;
    }
    return await this.employeePositionRepository.getAllByTenantId(
      db,
      tenantId,
      filters,
    );
  }

  async create(data, user, db) {
    try {
      let tenantIdForNewEntry;
      if (user.role === "super_admin") {
        if (!data.tenant_id) {
          const error = new Error(
            "Super admin must specify a 'tenant_id' in the request body.",
          );
          error.statusCode = 400;
          throw error;
        }
        const tenantExists = await this.tenantRepository.getById(
          db,
          data.tenant_id,
        );
        if (!tenantExists) {
          const error = new Error(
            `Tenant with ID ${data.tenant_id} not found.`,
          );
          error.statusCode = 404;
          throw error;
        }
        tenantIdForNewEntry = data.tenant_id;
      } else {
        tenantIdForNewEntry = user.tenant_id;
      }

      const dataToSave = { ...data, tenant_id: tenantIdForNewEntry };
      const result = await this.employeePositionRepository.create(
        db,
        dataToSave,
      );

      return {
        status: "success",
        data: result,
      };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(`A position named "${data.name}" already exists.`);
      }
      throw error;
    }
  }

  async getById(id, user, db) {
    const tenantId = user.role === "super_admin" ? null : user.tenant_id;
    const position = await this.employeePositionRepository.getById(
      db,
      id,
      tenantId,
    );
    if (!position) {
      throw new Error("Employee Position not found or not authorized");
    }
    return position;
  }

  async update(id, data, user, db) {
    try {
      const { name, done_by_id, cost_center_id } = data;
      const updatePayload = { name, done_by_id, cost_center_id };
      const tenantIdToUpdate =
        user.role === "super_admin" ? null : user.tenant_id;

      const updatedPosition = await this.employeePositionRepository.update(
        db,
        id,
        tenantIdToUpdate,
        updatePayload,
      );

      if (!updatedPosition) {
        throw new Error(
          "Employee Position not found or not authorized to update",
        );
      }

      return {
        status: "success",
        data: updatedPosition,
      };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(`The name "${data.name}" is already taken.`);
      }
      throw error;
    }
  }

  async delete(id, user, db) {
    const tenantIdToDelete =
      user.role === "super_admin" ? null : user.tenant_id;
    const data = await this.employeePositionRepository.delete(
      db,
      id,
      tenantIdToDelete,
    );

    return {
      status: "success",
      data,
    };
  }
}

module.exports = EmployeePositionService;
