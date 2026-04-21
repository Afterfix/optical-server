class TransactionFieldPermissionsRepository {
  async getByUserId(db, userId, tenantId) {
    const query = `SELECT * FROM transaction_field_permissions WHERE user_id = $1 AND tenant_id = $2;`;
    const { rows } = await db.query(query, [userId, tenantId]);
    return rows[0];
  }

  async getById(db, id, tenantId) {
    const query = `SELECT * FROM transaction_field_permissions WHERE id = $1 AND tenant_id = $2;`;
    const { rows } = await db.query(query, [id, tenantId]);
    return rows[0];
  }

  async create(db, data) {
    const { user_id, tenant_id, ...fields } = data;
    const columns = ["user_id", "tenant_id"];
    const values = [user_id, tenant_id];
    const placeholders = ["$1", "$2"];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        columns.push(key);
        values.push(value);
        placeholders.push(`$${paramIndex++}`);
      }
    }

    const query = `INSERT INTO transaction_field_permissions (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *;`;
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  async update(db, id, tenantId, data) {
    const {
      id: dId,
      user_id,
      tenant_id,
      created_at,
      updated_at,
      ...fieldsToUpdate
    } = data;
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      setClauses.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }

    if (setClauses.length === 0) return this.getById(db, id, tenantId);

    const query = `UPDATE transaction_field_permissions SET ${setClauses.join(", ")} WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++} RETURNING *;`;
    const { rows } = await db.query(query, [...values, id, tenantId]);
    return rows[0];
  }
}

module.exports = TransactionFieldPermissionsRepository;
