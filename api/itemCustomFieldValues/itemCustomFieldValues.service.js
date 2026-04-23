class ItemCustomFieldValuesService {
  constructor(repository) {
    this.repository = repository;
  }

  async getByItemId(itemId, user, db) {
    const tenantId = user.tenant_id;

    return await this.repository.getByItemId(
      db,
      itemId,
      tenantId
    );
  }

  async save(itemId, fields, user, db) {
    const tenantId = user.tenant_id;

    if (!Array.isArray(fields)) {
      throw new Error("fields must be an array");
    }

    // 🔒 Validate
    for (const f of fields) {
      if (!f.field_id) {
        throw new Error("field_id is required");
      }
    }

    // 🧹 Remove old values
    await this.repository.deleteByItemId(db, itemId);

    // ➕ Insert new values
    const payload = fields.map(f => ({
      tenant_id: tenantId,
      item_id: itemId,
      field_id: f.field_id,
      value: f.value || null
    }));

    return {
      status: "success",
      data: await this.repository.bulkInsert(db, payload)
    };
  }
}

module.exports = ItemCustomFieldValuesService;