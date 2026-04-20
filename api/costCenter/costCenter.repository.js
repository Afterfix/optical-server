class CostCenterRepository {


  async getAllByTenantId(db, tenantId) {
    const { rows } = await db.query(
      `SELECT * FROM "cost_center" WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return rows;
  }

  async create(db, costCenterData) {
    const { tenant_id, name } = costCenterData;
    const { rows } = await db.query(
      `INSERT INTO "cost_center" (tenant_id, name) VALUES ($1, $2) RETURNING *`,
      [tenant_id, name]
    );
    return rows[0];
  }

  // MODIFIED to handle optional tenantId
  async getById(db, id, tenantId = null) {
    let query = `SELECT * FROM "cost_center" WHERE id = $1`;
    const params = [id];

    if (tenantId) {
      query += " AND tenant_id = $2";
      params.push(tenantId);
    }

    const { rows } = await db.query(query, params);
    return rows[0];
  }

  // MODIFIED to handle optional tenantId
  async update(db, id, tenantId = null, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);

    if (fields.length === 0) {
      return this.getById(id, tenantId);
    }

    const setClause = fields.map((field, index) => `"${field}" = $${index + 1}`).join(", ");
    let query = `UPDATE "cost_center" SET ${setClause} WHERE id = $${fields.length + 1}`;
    const params = [...values, id];

    if (tenantId) {
      query += ` AND tenant_id = $${fields.length + 2}`;
      params.push(tenantId);
    }
    
    query += " RETURNING *";

    const { rows } = await db.query(query, params);
    return rows[0];
  }

  async delete(db, id, tenantId = null) {
    let query = `DELETE FROM "cost_center" WHERE id = $1`;
    const params = [id];

    if (tenantId) {
      query += " AND tenant_id = $2";
      params.push(tenantId);
    }
    
    query += " RETURNING id";

    const { rows } = await db.query(query, params);
    return rows[0];
  }
}

module.exports = CostCenterRepository;