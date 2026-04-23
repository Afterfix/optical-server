class CategoryCustomFieldsService {
  constructor(repository) {
    this.repository = repository;
  }

  async getAll(categoryId, user, db) {
    const tenantId = user.role === 'super_admin'
      ? user.tenant_id
      : user.tenant_id;

    return await this.repository.getAllByCategoryId(
      db,
      categoryId,
      tenantId
    );
  }

  async create(data, user, db) {
    const tenantId = user.role === 'super_admin'
      ? data.tenant_id
      : user.tenant_id;

    const payload = {
      ...data,
      tenant_id: tenantId
    };

    return {
      status: 'success',
      data: await this.repository.create(db, payload)
    };
  }

  async delete(id, user, db) {
    const tenantId = user.role === 'super_admin'
      ? user.tenant_id
      : user.tenant_id;

    return {
      status: 'success',
      data: await this.repository.delete(db, id, tenantId)
    };
  }
}

module.exports = CategoryCustomFieldsService;