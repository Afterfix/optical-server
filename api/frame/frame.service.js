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
    let tenantId;
    
    if (user.role === "super_admin") {
      if (!frameData.tenant_id) {
        throw Object.assign(new Error("Tenant ID required"), { statusCode: 400 });
      }
      const tenantExists = await this.tenantRepository.getById(db, frameData.tenant_id);
      if (!tenantExists) {
        throw Object.assign(new Error("Tenant not found"), { statusCode: 404 });
      }
      tenantId = frameData.tenant_id;
    } else {
      tenantId = user.tenant_id;
    }

    const dataToSave = { ...frameData, tenant_id: tenantId };
    const newFrame = await this.frameRepository.create(db, dataToSave);
    
    // Fetch complete record with joins (brand_name, etc.)
    const data = await this.frameRepository.getById(db, newFrame.id, tenantId);

    return {
      status: "success",
      data: data,
    };
  }

  async getById(id, user, db) {
    const tenantId = user.role === "super_admin" ? null : user.tenant_id;
    const frame = await this.frameRepository.getById(db, id, tenantId);
    if (!frame)
      throw Object.assign(new Error("Frame not found"), { statusCode: 404 });
    return frame;
  }

  async update(id, data, user, db) {
    const tenantId = user.role === "super_admin" ? null : user.tenant_id;
    
    // Check existence first
    const exists = await this.frameRepository.getById(db, id, tenantId);
    if (!exists) {
      throw Object.assign(new Error("Frame not found"), { statusCode: 404 });
    }

    await this.frameRepository.update(db, id, data, tenantId);
    const updatedData = await this.frameRepository.getById(db, id, tenantId);

    return {
      status: "success",
      data: updatedData,
    };
  }

  async delete(id, user, db) {
    const tenantId = user.role === "super_admin" ? null : user.tenant_id;
    const deleted = await this.frameRepository.delete(db, id, tenantId);
    
    if (!deleted) {
      throw Object.assign(new Error("Frame not found"), { statusCode: 404 });
    }

    return { 
      status: "success", 
      data: deleted 
    };
  }
}

module.exports = FrameService;