class PrescriptionService {
  constructor(prescriptionRepository, tenantRepository) {
    this.prescriptionRepository = prescriptionRepository;
    this.tenantRepository = tenantRepository;
  }

  async getAll(user, filters, db) {
    const tenantId = user.role === "super_admin" ? filters.tenant_id || null : user.tenant_id;
    return await this.prescriptionRepository.getAllByTenantId(db, tenantId, filters);
  }

  async getAllPaginated(user, filters, db) {
    const tenantId = user.role === "super_admin" ? filters.tenant_id || null : user.tenant_id;
    const { data, totalCount } = await this.prescriptionRepository.getPaginatedByTenantId(db, tenantId, filters);

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return { data, count: totalCount, page_count };
  }

  async create(prescriptionData, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      let tenantId = user.role === "super_admin" ? prescriptionData.tenant_id : user.tenant_id;
      if (user.role === "super_admin" && !tenantId) {
        throw { message: "Super admin must specify a 'tenant_id'.", statusCode: 400 };
      }

      const dataToSave = { ...prescriptionData, tenant_id: tenantId };
      const newPrescription = await this.prescriptionRepository.create(client, dataToSave);

      await client.query("COMMIT");
      const result = await this.prescriptionRepository.getById(client, newPrescription.id, tenantId);

      return { status: "success", data: result };
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

  async getById(id, user, db) {
    const tenantId = user.role === "super_admin" ? null : user.tenant_id;
    return await this.prescriptionRepository.getById(db, id, tenantId);
  }

  async update(id, data, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const tenantId = user.role === "super_admin" ? null : user.tenant_id;

      const exists = await this.prescriptionRepository.getById(client, id, tenantId);
      if (!exists) throw { message: "Prescription not found or unauthorized", statusCode: 404 };

      const updated = await this.prescriptionRepository.update(client, id, data, tenantId);
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

  async delete(id, user, db) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const tenantId = user.role === "super_admin" ? null : user.tenant_id;

      const exists = await this.prescriptionRepository.getById(client, id, tenantId);
      if (!exists) throw { message: "Prescription not found or unauthorized", statusCode: 404 };

      const deleted = await this.prescriptionRepository.delete(client, id, tenantId);
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

module.exports = PrescriptionService;