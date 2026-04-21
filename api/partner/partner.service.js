class PartnerService {
  constructor(partnerRepository) {
    this.partnerRepository = partnerRepository;
  }

  async getAll(tenantId, filters, db) {
    return await this.partnerRepository.getAllByTenantId(db, tenantId, filters);
  }

  async create(partnerData, db) {
    try {
      await db.query("BEGIN");

      const newPartner = await this.partnerRepository.create(
        db,
        partnerData,
      );

      await db.query("COMMIT");
      return {
        status: "success",
        data: newPartner,
      };
    } catch (error) {
      await db.query("ROLLBACK");
      // Handle Unique Constraint (Postgres code 23505)
      if (error.code === "23505") {
        throw new Error(`Partner name "${partnerData.name}" already exists.`);
      }
      throw error;
    }
  }

  async getPaginatedByTenantId(tenantId, filters, db) {
    const { partners, totalCount } =
      await this.partnerRepository.getPaginatedByTenantId(
        db,
        tenantId,
        filters,
      );

    const pageSize = filters.page_size ? parseInt(filters.page_size, 10) : 10;
    const page_count = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

    return {
      data: partners,
      count: totalCount,
      page_count,
    };
  }

  async getById(id, tenantId, db) {
    const partner = await this.partnerRepository.getById(db, id, tenantId);
    if (!partner) {
      throw new Error("Partner not found or not authorized");
    }
    return partner;
  }

  async update(id, tenantId, partnerData, db) {
    try {
      const updatedPartner = await this.partnerRepository.update(
        db,
        id,
        tenantId,
        partnerData,
      );

      if (!updatedPartner) return null;

      return {
        status: "success",
        data: updatedPartner,
      };
    } catch (error) {
      // Handle Unique Constraint on update
      if (error.code === "23505") {
        throw new Error(`The name "${partnerData.name}" is already taken.`);
      }
      throw error;
    }
  }

  async delete(id, tenantId, db) {
    const data = await this.partnerRepository.delete(db, id, tenantId);
    return {
      status: "success",
      data,
    };
  }
}

module.exports = PartnerService;