class FrameService {
  constructor(frameRepository, tenantRepository) {
    this.frameRepository = frameRepository;
    this.tenantRepository = tenantRepository;
  }

  async getAll(user, filters, db) {
    const tenantId =
      user.role === "super_admin" ? filters.tenant_id || null : user.tenant_id;
    return await this.frameRepository.getAllByTenantId(db, tenantId, filters);
  }

  async getAllPaginated(user, filters, db) {
    const tenantId =
      user.role === "super_admin" ? filters.tenant_id || null : user.tenant_id;
    const { frames, totalCount } =
      await this.frameRepository.getPaginatedByTenantId(db, tenantId, filters);

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return { data: frames, count: totalCount, page_count };
  }

  async create(frameData, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      let tenantId =
        user.role === "super_admin" ? frameData.tenant_id : user.tenant_id;

      if (user.role === "super_admin") {
        if (!tenantId)
          throw Object.assign(new Error("Tenant ID required"), {
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

      const dataToSave = { ...frameData, tenant_id: tenantId };
      const newFrame = await this.frameRepository.create(client, dataToSave);
      await client.query("COMMIT");

      return {
        status: "success",
        data: await this.frameRepository.getById(client, newFrame.id, tenantId),
      };
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
    const frame = await this.frameRepository.getById(db, id, tenantId);
    if (!frame)
      throw Object.assign(new Error("Frame not found"), { statusCode: 404 });
    return frame;
  }

  async update(id, data, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const tenantId = user.role === "super_admin" ? null : user.tenant_id;
      const exists = await this.frameRepository.getById(client, id, tenantId);
      if (!exists)
        throw Object.assign(new Error("Frame not found"), { statusCode: 404 });

      await this.frameRepository.update(client, id, data, tenantId);
      await client.query("COMMIT");
      return {
        status: "success",
        data: await this.frameRepository.getById(client, id, tenantId),
      };
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
      const deleted = await this.frameRepository.delete(client, id, tenantId);
      if (!deleted)
        throw Object.assign(new Error("Frame not found"), { statusCode: 404 });
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

module.exports = FrameService;
