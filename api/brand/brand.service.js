class BrandService {
  constructor(brandRepository, tenantRepository) {
    this.brandRepository = brandRepository;
    this.tenantRepository = tenantRepository;
  }

  async getAll(user, filters = {}, db) {
    let tenantId =
      user.role === "super_admin" ? filters.tenant_id || null : user.tenant_id;
    return await this.brandRepository.getAllByTenantId(db, tenantId, filters);
  }

  async create(brandData, user, db) {
    try {
      let tenantIdForNewEntry;
      if (user.role === "super_admin") {
        if (!brandData.tenant_id) {
          const error = new Error(
            "Super admin must specify a 'tenant_id' in the request body.",
          );
          error.statusCode = 400;
          throw error;
        }
        const tenantExists = await this.tenantRepository.getById(
          db,
          brandData.tenant_id,
        );
        if (!tenantExists) {
          const error = new Error(
            `Tenant with ID ${brandData.tenant_id} not found.`,
          );
          error.statusCode = 404;
          throw error;
        }
        tenantIdForNewEntry = brandData.tenant_id;
      } else {
        tenantIdForNewEntry = user.tenant_id;
      }

      const dataToSave = { ...brandData, tenant_id: tenantIdForNewEntry };
      const data = await this.brandRepository.create(db, dataToSave);

      return {
        status: "success",
        data,
      };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(
          `A brand named "${brandData.name}" already exists for this tenant.`,
        );
      }
      throw error;
    }
  }

  async getById(id, user, db) {
    const tenantId = user.role === "super_admin" ? null : user.tenant_id;
    const brand = await this.brandRepository.getById(db, id, tenantId);
    if (!brand) {
      throw new Error("Brand not found or not authorized");
    }
    return brand;
  }

  async update(id, brandData, user, db) {
    try {
      const { tenant_id, ...updateData } = brandData;
      const tenantIdToUpdate =
        user.role === "super_admin" ? null : user.tenant_id;

      const updatedBrand = await this.brandRepository.update(
        db,
        id,
        tenantIdToUpdate,
        updateData,
      );

      if (!updatedBrand) {
        throw new Error("Brand not found or not authorized to update");
      }

      return {
        status: "success",
        data: updatedBrand,
      };
    } catch (error) {
      if (error.code === "23505") {
        throw new Error(`The name "${brandData.name}" is already taken.`);
      }
      throw error;
    }
  }

  async delete(id, user, db) {
    const tenantIdToDelete =
      user.role === "super_admin" ? null : user.tenant_id;
    const data = await this.brandRepository.delete(db, id, tenantIdToDelete);

    if (!data) {
      throw new Error("Brand not found or not authorized to delete");
    }

    return {
      status: "success",
      data: data,
    };
  }
}

module.exports = BrandService;
