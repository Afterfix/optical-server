class ServicesService {
  constructor(servicesRepository, tenantRepository, db) {
    this.servicesRepository = servicesRepository;
    this.tenantRepository = tenantRepository;
    this.db = db;
  }

  async getAll(user, filters) {
    const tenantId = user.role === "super_admin" ? filters.tenant_id || null : user.tenant_id;
    return await this.servicesRepository.getAllByTenantId(tenantId, filters);
  }

  async getAllPaginated(user, filters) {
    const tenantId = user.role === "super_admin" ? filters.tenant_id || null : user.tenant_id;
    const { services, totalCount } = await this.servicesRepository.getPaginatedByTenantId(tenantId, filters);

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return { data: services, count: totalCount, page_count };
  }

  async create(serviceData, user) {
    const client = await this.db.pool.connect();
    try {
      await client.query("BEGIN");

      let tenantId = user.role === "super_admin" ? serviceData.tenant_id : user.tenant_id;
      if (user.role === "super_admin" && !tenantId) {
        const error = new Error("Super admin must specify a 'tenant_id'.");
        error.statusCode = 400;
        throw error;
      }

      const dataToSave = { ...serviceData, tenant_id: tenantId };
      const newService = await this.servicesRepository.create(client, dataToSave);

      await client.query("COMMIT");
      const dataResponse = await this.servicesRepository.getById(client, newService.id, tenantId);

      return { status: "success", data: dataResponse };
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status: "failed",
        data: null,
        error: { message: error.message, statusCode: error.statusCode || 500 },
      };
    } finally {
      client.release();
    }
  }

  async getById(id, user) {
    const tenantId = user.role === "super_admin" ? null : user.tenant_id;
    return await this.servicesRepository.getById(id, tenantId);
  }

  async update(id, data, user) {
    const client = await this.db.pool.connect();
    try {
      await client.query("BEGIN");
      const tenantId = user.role === "super_admin" ? null : user.tenant_id;

      const exists = await this.servicesRepository.getById(client, id, tenantId);
      if (!exists) {
        const err = new Error("Service not found or not authorized to update");
        err.statusCode = 404;
        throw err;
      }

      const updated = await this.servicesRepository.update(client, id, data, tenantId);
      await client.query("COMMIT");

      return { status: "success", data: updated };
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status: "failed",
        data: null,
        error: { message: error.message, statusCode: error.statusCode || 500 },
      };
    } finally {
      client.release();
    }
  }

  async delete(id, user) {
    const client = await this.db.pool.connect();
    try {
      await client.query("BEGIN");
      const tenantId = user.role === "super_admin" ? null : user.tenant_id;

      const exists = await this.servicesRepository.getById(client, id, tenantId);
      if (!exists) {
        throw { message: "Service not found or unauthorized", statusCode: 404 };
      }

      const deleted = await this.servicesRepository.delete(id, tenantId);
      await client.query("COMMIT");
      return { status: "success", data: deleted };
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status: "failed",
        data: null,
        error: { message: error.message, statusCode: error.statusCode || 500 },
      };
    } finally {
      client.release();
    }
  }
}

module.exports = ServicesService;