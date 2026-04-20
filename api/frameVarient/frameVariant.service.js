class FrameVariantService {
  constructor(frameVariantRepository, tenantRepository, frameRepository) {
    this.repository = frameVariantRepository;
    this.tenantRepository = tenantRepository;
    this.frameRepository = frameRepository; // Needed to verify frame ownership
  }

  async getAll(user, filters, db) {
    const tenantId =
      user.role === "super_admin" ? filters.tenant_id || null : user.tenant_id;
    return await this.repository.getAllByTenantId(db, tenantId, filters);
  }

  async getAllPaginated(user, filters, db) {
    const tenantId =
      user.role === "super_admin" ? filters.tenant_id || null : user.tenant_id;
    const { variants, totalCount } =
      await this.repository.getPaginatedByTenantId(db, tenantId, filters);

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return { data: variants, count: totalCount, page_count };
  }

  async create(data, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const tenantId =
        user.role === "super_admin" ? data.tenant_id : user.tenant_id;
      if (!tenantId)
        throw Object.assign(new Error("Tenant ID required"), {
          statusCode: 400,
        });

      // 1. Verify SKU uniqueness
      const existingSku = await this.repository.getBySku(client, data.sku);
      if (existingSku)
        throw Object.assign(new Error(`SKU ${data.sku} already exists`), {
          statusCode: 400,
        });

      // 2. Verify Frame belongs to this tenant
      const frame = await this.frameRepository.getById(
        client,
        data.frame_id,
        tenantId,
      );
      if (!frame)
        throw Object.assign(new Error("Invalid frame_id for this tenant"), {
          statusCode: 404,
        });

      const newVariant = await this.repository.create(client, {
        ...data,
        tenant_id: tenantId,
      });
      await client.query("COMMIT");

      return {
        status: "success",
        data: await this.repository.getById(client, newVariant.id, tenantId),
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
    const variant = await this.repository.getById(db, id, tenantId);
    if (!variant)
      throw Object.assign(new Error("Variant not found"), { statusCode: 404 });
    return variant;
  }

  async update(id, data, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const tenantId = user.role === "super_admin" ? null : user.tenant_id;

      const exists = await this.repository.getById(client, id, tenantId);
      if (!exists)
        throw Object.assign(new Error("Variant not found"), {
          statusCode: 404,
        });

      if (data.sku && data.sku !== exists.sku) {
        const existingSku = await this.repository.getBySku(client, data.sku);
        if (existingSku)
          throw Object.assign(new Error("SKU already in use"), {
            statusCode: 400,
          });
      }

      await this.repository.update(client, id, data, tenantId);
      await client.query("COMMIT");
      return {
        status: "success",
        data: await this.repository.getById(client, id, tenantId),
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
      const deleted = await this.repository.delete(client, id, tenantId);
      if (!deleted)
        throw Object.assign(new Error("Variant not found"), {
          statusCode: 404,
        });
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

module.exports = FrameVariantService;
