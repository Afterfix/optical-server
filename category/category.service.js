class CategoryService {
  constructor(categoryRepository, tenantRepository) {
    this.categoryRepository = categoryRepository;
    this.tenantRepository = tenantRepository;
  }

  // ADDED: db param
  async getAll(user, filters = {}, db) {
    let tenantId;
    if (user.role === 'super_admin') {
      tenantId = filters.tenant_id || null;
    } else {
      tenantId = user.tenant_id;
    }
    // Pass db to repo
    return await this.categoryRepository.getAllByTenantId(db, tenantId, filters);
  }

  // ADDED: db param
  async create(categoryData, user, db) {
    let tenantIdForNewEntry;
    if (user.role === 'super_admin') {
      if (!categoryData.tenant_id) {
        const error = new Error("Super admin must specify a 'tenant_id' in the request body.");
        error.statusCode = 400;
        throw error;
      }
      // Pass db to tenantRepo
      const tenantExists = await this.tenantRepository.getById(db, categoryData.tenant_id);
      if (!tenantExists) {
        const error = new Error(`Tenant with ID ${categoryData.tenant_id} not found.`);
        error.statusCode = 404;
        throw error;
      }
      tenantIdForNewEntry = categoryData.tenant_id;
    } else {
      tenantIdForNewEntry = user.tenant_id;
    }

    const dataToSave = { ...categoryData, tenant_id: tenantIdForNewEntry };
    // Pass db to repo
    const data = await this.categoryRepository.create(db, dataToSave);
    return {
      status: 'success',
      data,
    };
  }

  async getById(id, user, db) {
    const tenantId = user.role === 'super_admin' ? null : user.tenant_id;
    return await this.categoryRepository.getById(db, id, tenantId);
  }

  async update(id, categoryData, user, db) {
    const { tenant_id, ...updateData } = categoryData;
    const tenantIdToUpdate = user.role === 'super_admin' ? null : user.tenant_id;

    const updatedCategory = await this.categoryRepository.update(db, id, tenantIdToUpdate, updateData);
    if (!updatedCategory) {
        throw new Error("Category not found or not authorized to update");
    }
    const data = await this.getById(id, user, db);
    return {
      status: 'success',
      data,
    };
  }

  async delete(id, user, db) {
    const tenantIdToDelete = user.role === 'super_admin' ? null : user.tenant_id;
    const data = await this.categoryRepository.delete(db, id, tenantIdToDelete);
    return {
      status: 'success',
      data: data,
    };
  }
}

module.exports = CategoryService;