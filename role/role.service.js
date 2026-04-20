class RoleService {
  constructor(roleRepository, tenantRepository) {
    this.roleRepository = roleRepository
    this.tenantRepository = tenantRepository
  }

  async create(roleData, user, db) {
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
        db,
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
      db,
      roleData.name,
      tenantIdForNewRole
    )
    if (existingRole) {
      throw new Error('A role with this name already exists for this tenant.')
    }

    const dataToSave = { ...roleData, tenant_id: tenantIdForNewRole }
    return await this.roleRepository.create(db, dataToSave)
  }

  async getAll(user, query = {}, db) {
    if (user.role === 'super_admin') {
      const { tenant_id } = query
      if (!tenant_id) {
        const error = new Error(
          "Bad Request: Super admin must specify a 'tenant_id' in the query parameters."
        )
        error.statusCode = 400
        throw error
      }
      return await this.roleRepository.getAllByTenantId(db, tenant_id)
    } else {
      return await this.roleRepository.getAllByTenantId(db, user.tenant_id)
    }
  }

  async getById(id, user, db) {
    const role =
      user.role === 'super_admin'
        ? await this.roleRepository.getById(db, id)
        : await this.roleRepository.getById(db, id, user.tenant_id)

    if (!role) {
      throw new Error("Role not found or you don't have permission to view it.")
    }
    return role
  }

  async update(id, roleData, user, db) {
    // Find the role first to ensure it exists and to get its tenant_id
    const targetRole = await this.getById(id, user, db)

    const existingRole = await this.roleRepository.findByName(
      db,
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
        ? await this.roleRepository.update(db, id, roleData)
        : await this.roleRepository.update(db, id, roleData, user.tenant_id)

    if (!updatedRole) {
      throw new Error(
        "Role not found or you don't have permission to update it."
      )
    }
    return updatedRole
  }

  async delete(id, user, db) {
    const roleToDelete = await this.getById(id, user, db)

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
        ? await this.roleRepository.delete(db, id)
        : await this.roleRepository.delete(db, id, user.tenant_id)

    if (!deletedRole) {
      throw new Error(
        "Role not found or you don't have permission to delete it."
      )
    }
    return deletedRole
  }
}

module.exports = RoleService