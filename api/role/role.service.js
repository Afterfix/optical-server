class RoleService {
  constructor(roleRepository, tenantRepository) {
    this.roleRepository = roleRepository
    this.tenantRepository = tenantRepository
  }

  async create(roleData, user) {
    let tenantIdForNewRole

    if (user.role === 'super_admin') {
      if (!roleData.tenant_id) {
        const error = new Error(
          "Super admin must specify a 'tenant_id' in the request body."
        )
        error.statusCode = 400
        throw error
      }
      const tenantExists = await this.tenantRepository.getById(
        roleData.tenant_id
      )
      if (!tenantExists) {
        const error = new Error(
          `Tenant with ID ${roleData.tenant_id} not found.`
        )
        error.statusCode = 404
        throw error
      }
      tenantIdForNewRole = roleData.tenant_id
    } else {
      tenantIdForNewRole = user.tenant_id
    }

    const existingRole = await this.roleRepository.findByName(
      roleData.name,
      tenantIdForNewRole
    )
    if (existingRole) {
      throw new Error('A role with this name already exists for this tenant.')
    }

    const dataToSave = { ...roleData, tenant_id: tenantIdForNewRole }
    return await this.roleRepository.create(dataToSave)
  }

  async getAll(user, query = {}) {
    if (user.role === 'super_admin') {
      const { tenant_id } = query
      if (!tenant_id) {
        const error = new Error(
          "Bad Request: Super admin must specify a 'tenant_id' in the query parameters."
        )
        error.statusCode = 400
        throw error
      }
      return await this.roleRepository.getAllByTenantId(tenant_id)
    } else {
      return await this.roleRepository.getAllByTenantId(user.tenant_id)
    }
  }

  async getById(id, user) {
    const role =
      user.role === 'super_admin'
        ? await this.roleRepository.getById(id)
        : await this.roleRepository.getById(id, user.tenant_id)

    if (!role) {
      throw new Error("Role not found or you don't have permission to view it.")
    }
    return role
  }

  async update(id, roleData, user) {
    // Find the role first to ensure it exists and to get its tenant_id
    const targetRole = await this.getById(id, user)

    const existingRole = await this.roleRepository.findByName(
      roleData.name,
      targetRole.tenant_id
    )
    if (existingRole && existingRole.id !== parseInt(id, 10)) {
      throw new Error(
        'Another role with this name already exists for this tenant.'
      )
    }

    const updatedRole =
      user.role === 'super_admin'
        ? await this.roleRepository.update(id, roleData)
        : await this.roleRepository.update(id, roleData, user.tenant_id)

    if (!updatedRole) {
      throw new Error(
        "Role not found or you don't have permission to update it."
      )
    }
    return updatedRole
  }

  async delete(id, user) {
    const roleToDelete = await this.getById(id, user)

    // Safeguard: prevent deletion of the super_admin role
    if (
      roleToDelete.name === 'super_admin' &&
      roleToDelete.tenant_id === null
    ) {
      const error = new Error("The 'super_admin' role cannot be deleted.")
      error.statusCode = 403 // Forbidden
      throw error
    }

    const deletedRole =
      user.role === 'super_admin'
        ? await this.roleRepository.delete(id)
        : await this.roleRepository.delete(id, user.tenant_id)

    if (!deletedRole) {
      throw new Error(
        "Role not found or you don't have permission to delete it."
      )
    }
    return deletedRole
  }
}

module.exports = RoleService
