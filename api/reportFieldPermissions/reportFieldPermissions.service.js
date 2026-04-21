class ReportFieldPermissionsService {
  constructor(repository) {
    this.repository = repository;
  }

  async getForCurrentUser(user, db) {
    const permissions = await this.repository.getByUserId(
      db,
      user.id,
      user.tenant_id,
    );
     if (!permissions) {
      const defaultPayload = {
        user_id: user.id,
        tenant_id: user.tenant_id,
      };
       permissions = await this.repository.create(db, defaultPayload);
    }
    return permissions;
  }

  async create(user, data, db) {
    const { user_id } = data;
    if (!user_id) {
      throw new Error('user_id is a required field.');
    }

    const existingPermissions = await this.repository.getByUserId(
      db,
      user_id,
      user.tenant_id,
    );
    if (existingPermissions) {
      throw new Error(`Permissions for user ID ${user_id} already exist.`);
    }

    const payload = {
      ...data,
      tenant_id: user.tenant_id,
    };

    return await this.repository.create(db, payload);
  }

  async update(id, user, data, db) {
    const existingRecord = await this.repository.getById(
      db,
      id,
      user.tenant_id,
    );
    if (!existingRecord) {
      throw new Error(
        `Permissions record with ID ${id} not found or you do not have permission to edit it.`,
      );
    }

    const { user_id, tenant_id, ...updateData } = data;

    const updatedPermissions = await this.repository.update(
      db,
      id,
      user.tenant_id,
      updateData,
    );
    if (!updatedPermissions) {
      throw new Error('Failed to update permissions.');
    }

    return updatedPermissions;
  }
}

module.exports = ReportFieldPermissionsService;