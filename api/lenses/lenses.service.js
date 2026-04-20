class LensesService {
  constructor(lensesRepository, tenantRepository) {
    this.repository = lensesRepository;
    this.tenantRepository = tenantRepository;
  }

  async getAll(user, filters, db) {
    const tenantId =
      user.role === "super_admin" ? filters.tenant_id || null : user.tenant_id;
    return await this.repository.getAllByTenantId(db, tenantId, filters);
  }

  async getAllPaginated(user, filters, db) {
    const tenantId =
      user.role === "super_admin" ? filters.tenant_id || null : user.tenant_id;
    const { lenses, totalCount } = await this.repository.getPaginatedByTenantId(
      db,
      tenantId,
      filters,
    );

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return { data: lenses, count: totalCount, page_count };
  }

  async create(data, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      let tenantId =
        user.role === "super_admin" ? data.tenant_id : user.tenant_id;

      if (user.role === "super_admin") {
        if (!tenantId)
          throw Object.assign(new Error("tenant_id is required"), {
            statusCode: 400,
          });
        const tenantExists = await this.tenantRepository.getById(
          client,
          tenantId,
        );
        if (!tenantExists)
          throw Object.assign(new Error("Tenant not found"), {
            statusCode: 404,
          });
      }

      const newLens = await this.repository.create(client, {
        ...data,
        tenant_id: tenantId,
      });
      await client.query("COMMIT");
      return { status: "success", data: newLens };
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status: "failed",
        error: { message: error.message, statusCode: error.statusCode || 500 },
      };
    } finally {
      client.release();
    }
  }

  async getById(id, user, db) {
    const tenantId = user.role === "super_admin" ? null : user.tenant_id;
    const lens = await this.repository.getById(db, id, tenantId);
    if (!lens)
      throw Object.assign(new Error("Lens not found"), { statusCode: 404 });
    return lens;
  }

  async update(id, data, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const tenantId = user.role === "super_admin" ? null : user.tenant_id;
      const exists = await this.repository.getById(client, id, tenantId);
      if (!exists)
        throw Object.assign(new Error("Lens not found"), { statusCode: 404 });

      const updated = await this.repository.update(client, id, data, tenantId);
      await client.query("COMMIT");
      return { status: "success", data: updated };
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status: "failed",
        error: { message: error.message, statusCode: error.statusCode || 500 },
      };
    } finally {
      client.release();
    }
  }

  async delete(id, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const tenantId = user.role === "super_admin" ? null : user.tenant_id;
      const deleted = await this.repository.delete(client, id, tenantId);
      if (!deleted)
        throw Object.assign(new Error("Lens not found"), { statusCode: 404 });
      await client.query("COMMIT");
      return { status: "success", data: deleted };
    } catch (error) {
      await client.query("ROLLBACK");
      return {
        status: "failed",
        error: { message: error.message, statusCode: error.statusCode || 500 },
      };
    } finally {
      client.release();
    }
  }
}

module.exports = LensesService;
