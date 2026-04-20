class CostCenterService {
  constructor(costCenterRepository, tenantRepository) {  
    this.costCenterRepository = costCenterRepository;
    this.tenantRepository = tenantRepository;  
  }

  async getAll(user, query = {}) {  // ✅ Removed db
    if (user.role === 'super_admin') {
      const { tenant_id } = query;
      if (!tenant_id) {
        const error = new Error("Bad Request: Super admin must specify a 'tenant_id' in the query parameters.");
        error.statusCode = 400;
        throw error;
      }
      return await this.costCenterRepository.getAllByTenantId(tenant_id); // ✅ db removed
    } else {
      return await this.costCenterRepository.getAllByTenantId(user.tenant_id); // ✅ db removed
    }
  }

  async create(data, user) { // ✅ Removed db
    try {
      let tenantIdForNewEntry;

      if (user.role === 'super_admin') {
        if (!data.tenant_id) {
          const error = new Error("Super admin must specify a 'tenant_id' in the request body.");
          error.statusCode = 400;
          throw error;
        }

        const tenantExists = await this.tenantRepository.getById(data.tenant_id); // ✅ db removed
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
      const result = await this.costCenterRepository.create(dataToSave); // ✅ db removed

      return {
        status: 'success',
        data: result,
      };

    } catch (error) {
      return {
        status: 'failed',
        message: error.message || 'Something went wrong',
        statusCode: error.statusCode || 500,
      };
    }
  }

  async getById(id, user) {  // ✅ Removed db
    const tenantId = user.role === 'super_admin' ? null : user.tenant_id;
    return await this.costCenterRepository.getById(id, tenantId); // ✅ db removed
  }

  async update(id, data, user) { // ✅ Removed db
    try {
      const { tenant_id, ...updateData } = data;

      const tenantIdToUpdate =
        user.role === 'super_admin' ? null : user.tenant_id;

      const result = await this.costCenterRepository.update(
        id,
        tenantIdToUpdate,
        updateData
      ); // ✅ db removed

      if (!result) {
        const error = new Error('Cost center not found or not authorized to update.');
        error.statusCode = 404;
        throw error;
      }

      return {
        status: 'success',
        data: result,
      };

    } catch (error) {
      return {
        status: 'failed',
        message: error.message || 'Something went wrong',
        statusCode: error.statusCode || 500,
      };
    }
  }


  async delete(id, user) { // ✅ Removed db
    const tenantIdToDelete = user.role === 'super_admin' ? null : user.tenant_id;
    const data = await this.costCenterRepository.delete(id, tenantIdToDelete); // ✅ db removed
    return {
      status: 'success',
      data,
    };
  }
}

module.exports = CostCenterService;