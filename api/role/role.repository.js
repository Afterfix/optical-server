class RoleRepository {
  constructor(db) {
    this.db = db;
  }

  async create(roleData) {
    const { tenant_id, name, permissions } = roleData;
    const { rows } = await this.db.query(
      `INSERT INTO "role" (tenant_id, name, permissions)
       VALUES ($1, $2, $3)
       RETURNING id, name, permissions, tenant_id`,
      [tenant_id, name, JSON.stringify(permissions)]
    );
    return rows[0];
  }

  async getAllByTenantId(tenantId) {
    const { rows } = await this.db.query(
      'SELECT id, name, permissions FROM "role" WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    return rows;
  }

  async getById(id, tenantId = null) {
    let query = 'SELECT id, name, permissions, tenant_id FROM "role" WHERE id = $1';
    const params = [id];

    if (tenantId) {
      query += " AND tenant_id = $2";
      params.push(tenantId);
    }

    const { rows } = await this.db.query(query, params);
    return rows[0];
  }

  async update(id, data, tenantId = null) {
    const { name, permissions } = data;
    let query = `UPDATE "role" SET name = $1, permissions = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`;
    const params = [name, JSON.stringify(permissions), id];

    if (tenantId) {
      query += ` AND tenant_id = $4`;
      params.push(tenantId);
    }
    
    query += ` RETURNING id, name, permissions`;

    const { rows } = await this.db.query(query, params);
    return rows[0];
  }

  async delete(id, tenantId = null) {
    let query = 'DELETE FROM "role" WHERE id = $1';
    const params = [id];

    if (tenantId) {
      query += " AND tenant_id = $2";
      params.push(tenantId);
    }
    
    query += " RETURNING id";

    const { rows } = await this.db.query(query, params);
    return rows[0];
  }

  async findByName(name, tenantId = null) {
    let query = 'SELECT id, name FROM "role" WHERE name = $1';
    const params = [name];
    
    if (tenantId) {
        query += ' AND tenant_id = $2';
        params.push(tenantId);
    } else if (tenantId === null) {
        query += ' AND tenant_id IS NULL';
    }

    const { rows } = await this.db.query(query, params);
    return rows[0];
  }
}

module.exports = RoleRepository;