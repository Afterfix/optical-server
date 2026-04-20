class EmployeeService {
  constructor(employeeRepository, tenantRepository) {
    this.repository = employeeRepository;
    this.tenantRepository = tenantRepository;
  }

  async getAll(user, filters, db) {
    let tenantId;
    if (user.role === "super_admin") {
      if (!filters.tenant_id) {
        const error = new Error(
          "Bad Request: Super admin must specify a 'tenant_id' in the query parameters.",
        );
        error.statusCode = 400;
        throw error;
      }
      tenantId = filters.tenant_id;
    } else {
      tenantId = user.tenant_id;
    }
    return await this.repository.getAllByTenantId(db, tenantId, filters);
  }

  async getAllPaginated(user, filters, db) {
    let tenantId =
      user.role === "super_admin" ? filters.tenant_id : user.tenant_id;

    if (user.role === "super_admin" && !tenantId) {
      const error = new Error(
        "Bad Request: Super admin must specify a 'tenant_id' in the query parameters.",
      );
      error.statusCode = 400;
      throw error;
    }

    const { employees, totalCount } =
      await this.repository.getPaginatedByTenantId(db, tenantId, filters);
    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return { data: employees, count: totalCount, page_count };
  }

  async getById(id, user, db) {
    const tenantId = user.role === "super_admin" ? null : user.tenant_id;
    const employee = await this.repository.getById(db, id, tenantId);
    if (!employee) {
      throw new Error("Employee not found or not authorized");
    }
    return employee;
  }

  async create(employeeData, user, db) {
    try {
      let tenantIdForNewEntry;
      if (user.role === "super_admin") {
        if (!employeeData.tenant_id) {
          const error = new Error(
            "Super admin must specify a 'tenant_id' in the request body.",
          );
          error.statusCode = 400;
          throw error;
        }
        const tenantExists = await this.tenantRepository.getById(
          db,
          employeeData.tenant_id,
        );
        if (!tenantExists) {
          const error = new Error(
            `Tenant with ID ${employeeData.tenant_id} not found.`,
          );
          error.statusCode = 404;
          throw error;
        }
        tenantIdForNewEntry = employeeData.tenant_id;
      } else {
        tenantIdForNewEntry = user.tenant_id;
      }

      const dataToSave = { ...employeeData, tenant_id: tenantIdForNewEntry };
      const newEmployee = await this.repository.create(db, dataToSave);
      const data = await this.getById(newEmployee.id, user, db);

      return { status: "success", data };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(
          `An employee with this identifier/email already exists.`,
        );
      }
      throw error;
    }
  }

  async update(id, employeeData, user, db) {
    try {
      const { tenant_id, ...updateData } = employeeData;
      const tenantIdToUpdate =
        user.role === "super_admin" ? null : user.tenant_id;

      const updatedEmployee = await this.repository.update(
        db,
        id,
        tenantIdToUpdate,
        updateData,
      );
      if (!updatedEmployee) {
        throw new Error("Employee not found or not authorized to update");
      }

      const data = await this.getById(id, user, db);
      return { status: "success", data };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(`The provided identifier/email is already in use.`);
      }
      throw error;
    }
  }

  async delete(id, user, db) {
    const tenantIdToDelete =
      user.role === "super_admin" ? null : user.tenant_id;
    const deleted = await this.repository.delete(db, id, tenantIdToDelete);
    if (!deleted) {
      throw new Error("Employee not found or not authorized to delete");
    }
    return {
      status: "success",
      data: deleted,
    };
  }
}

module.exports = EmployeeService;
