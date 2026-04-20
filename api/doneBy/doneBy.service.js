class DoneByService {
  constructor(doneByRepository, tenantRepository) { 
    this.doneByRepository = doneByRepository;
    this.tenantRepository = tenantRepository;
  }

  async getAll(user, query = {}, db) { 
    if (user.role === 'super_admin') {
      const { tenant_id } = query;
      if (!tenant_id) {
        const error = new Error("Bad Request: Super admin must specify a 'tenant_id' in the query parameters.");
        error.statusCode = 400;
        throw error;
      }
      return await this.doneByRepository.getAllByTenantId(db, tenant_id);
    } else {
      return await this.doneByRepository.getAllByTenantId(db, user.tenant_id);
    }
  }

  async create(data, user, db) { 
    let tenantIdForNewEntry;
    if (user.role === 'super_admin') {
      if (!data.tenant_id) {
        const error = new Error("Super admin must specify a 'tenant_id' in the request body.");
        error.statusCode = 400;
        throw error;
      }
      const tenantExists = await this.tenantRepository.getById(db, data.tenant_id);
      if (!tenantExists) {
          const error = new Error(`Tenant with ID ${data.tenant_id} not found.`);
          error.statusCode = 404;
          throw error;
      }
      tenantIdForNewEntry = data.tenant_id;
    } else {
      tenantIdForNewEntry = user.tenant_id;
    }
    const dataToSave = { ...data, tenant_id: tenantIdForNewEntry };
    data = await this.doneByRepository.create(db, dataToSave);
    return {
      status: 'success',
      data,
    };
  }

  async getById(id, user, db) { 
    const tenantId = user.role === 'super_admin' ? null : user.tenant_id;
    return await this.doneByRepository.getById(db, id, tenantId);
  }

  async update(id, data, user, db) { 
    const { tenant_id, ...updateData } = data; 
    const tenantIdToUpdate = user.role === 'super_admin' ? null : user.tenant_id;
    const result = await this.doneByRepository.update(db, id, tenantIdToUpdate, updateData);
    return {
      status: 'success',
      data: result,
    };
  }

  async delete(id, user, db) { 
    const tenantIdToDelete = user.role === 'super_admin' ? null : user.tenant_id;
    const data = await this.doneByRepository.delete(db, id, tenantIdToDelete);
    return {
      status: 'success',
      data,
    };
  }
}

module.exports = DoneByService;