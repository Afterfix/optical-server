class CostCenterRepository {
  constructor(db) {
    this.db = db; // ✅ Accept db via constructor
  }

  async getAllByTenantId(tenantId) { // ✅ Removed db param
    const { rows } = await this.db.query( // ✅ Used this.db.query
      `SELECT * FROM "cost_center" WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return rows;
  }

  async create(costCenterData) { // ✅ Removed db param
    const { tenant_id, name } = costCenterData;
    const { rows } = await this.db.query( // ✅ Used this.db.query
      `INSERT INTO "cost_center" (tenant_id, name) VALUES ($1, $2) RETURNING *`,
      [tenant_id, name]
    );
    return rows[0];
  }

  async getById(id, tenantId = null) { // ✅ Removed db param
    let query = `SELECT * FROM "cost_center" WHERE id = $1`;
    const params = [id];

    if (tenantId) {
      query += " AND tenant_id = $2";
      params.push(tenantId);
    }

    const { rows } = await this.db.query(query, params); // ✅ Used this.db.query
    return rows[0];
  }

  async update(id, tenantId = null, data) { // ✅ Removed db param
    const fields = Object.keys(data);
    const values = Object.values(data);

    if (fields.length === 0) {
      return this.getById(id, tenantId); // ✅ Removed db param
    }

    const setClause = fields.map((field, index) => `"${field}" = $${index + 1}`).join(", ");
    let query = `UPDATE "cost_center" SET ${setClause} WHERE id = $${fields.length + 1}`;
    const params = [...values, id];

    if (tenantId) {
      query += ` AND tenant_id = $${fields.length + 2}`;
      params.push(tenantId);
    }
    
    query += " RETURNING *";

    const { rows } = await this.db.query(query, params); // ✅ Used this.db.query
    return rows[0];
  }

  async delete(id, tenantId = null) { // ✅ Removed db param
    let query = `DELETE FROM "cost_center" WHERE id = $1`;
    const params = [id];

    if (tenantId) {
      query += " AND tenant_id = $2";
      params.push(tenantId);
    }
    
    query += " RETURNING id";

    const { rows } = await this.db.query(query, params); // ✅ Used this.db.query
    return rows[0];
  }
}

module.exports = CostCenterRepository;