class TenantService {
  constructor(tenantRepository, roleRepository, userRepository) {
    this.tenantRepository = tenantRepository
    this.roleRepository = roleRepository // Injected RoleRepository
    this.userRepository = userRepository // Injected RoleRepository
  }

  async create(tenantData) {
    const tenant = await this.tenantRepository.create(tenantData)
    const role = await this.createAdminRuleForTenant(tenant.id)
    const { username, password } = tenantData
    const user = await this.userRepository.create({
      username,
      password,
      tenant_id: tenant.id,
      role_id: role.id,
    })
    return tenant
  }

  async createAdminRuleForTenant(tenant_id) {
    const roleData = { name: 'admin', tenant_id, permissions: {} }
    return await this.roleRepository.create(roleData)
  }

  async getAll(filters) {
    return await this.tenantRepository.getAll(filters)
  }

  async getById(id) {
    const tenant = await this.tenantRepository.getById(id)
    if (!tenant) {
      throw new Error('Tenant not found')
    }
    return tenant
  }

  async update(id, tenantData) {
    await this.getById(id)
    const updatedTenant = await this.tenantRepository.update(id, tenantData)
    return updatedTenant
  }

  async delete(id) {
    return await this.tenantRepository.delete(id)
  }
}

module.exports = TenantService
