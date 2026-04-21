class TransactionFieldPermissionsService {
  constructor(repository) {
    this.repository = repository;
  }

  async getForCurrentUser(user, db) {
    let permissions = await this.repository.getByUserId(
      db,
      user.id,
      user.tenant_id,
    );
    if (!permissions) {
      const defaultPayload = { user_id: user.id, tenant_id: user.tenant_id };
      permissions = await this.repository.create(db, defaultPayload);
    }
    return permissions;
  }

  async update(id, user, data, db) {
    const existing = await this.repository.getById(db, id, user.tenant_id);
    if (!existing) throw new Error(`Permissions record not found.`);

    const { user_id, tenant_id, ...updateData } = data;
    return await this.repository.update(db, id, user.tenant_id, updateData);
  }
}

module.exports = TransactionFieldPermissionsService;
