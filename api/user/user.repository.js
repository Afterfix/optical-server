const bcrypt = require("bcrypt");

class UserRepository {

  async countAll(db) {
    const result = await db.query(`SELECT COUNT(*) FROM "user"`);
    return parseInt(result.rows[0].count, 10);
  }

  async getOrCreateSuperAdminRole(db) {
    const existing = await db.query(
      `SELECT * FROM "role" WHERE name = 'super_admin'`
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const result = await db.query(
      `INSERT INTO "role" (tenant_id, name, permissions)
     VALUES (NULL, 'super_admin', '{"full_access": true}')
     RETURNING *`
    );

    console.log("✅ Super Admin role created automatically.");
    return result.rows[0];
  }

  async getAll(db, adminUser) {
    let whereClause = '';
    const queryParams = [];
    if (adminUser && adminUser.tenant_id) {
      queryParams.push(adminUser.tenant_id);
      whereClause = `WHERE u.tenant_id = $1`;
    }

    const { rows } = await db.query(`
      SELECT 
        u.id, u.username, u.active, u.created_at, 
        r.name AS role_name, 
        t.name AS tenant_name, t.type AS tenant_type
      FROM "user" u
      LEFT JOIN "role" r ON u.role_id = r.id
      LEFT JOIN "tenant" t ON u.tenant_id = t.id
      ${whereClause}
      ORDER BY u.created_at DESC
    `, queryParams);
    return rows;
  }

  async getPaginated(db, filters = {}, adminUser = null) {
    const { page = 1, page_size = 10 } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const queryParams = [];
    let whereClause = '';

    if (adminUser && adminUser.tenant_id) {
      queryParams.push(adminUser.tenant_id);
      whereClause = `WHERE u.tenant_id = $1`;
    }

    const dataQuery = `
      SELECT 
        u.id, u.username, u.active, u.created_at,
        r.name AS role_name, 
        t.name AS tenant_name, t.type AS tenant_type
      FROM "user" u
      LEFT JOIN "role" r ON u.role_id = r.id
      LEFT JOIN "tenant" t ON u.tenant_id = t.id
      ${whereClause}
      ORDER BY u.id
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const dataResult = await db.query(dataQuery, [...queryParams, limit, offset]);

    const countQuery = `SELECT COUNT(*) FROM "user" u ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    return { user: dataResult.rows, totalCount };
  }

  async getByName(db, username) { 
    const { rows } = await db.query(
      `
      SELECT 
        u.*, 
        r.name AS role_name, 
        t.name AS tenant_name, t.type AS tenant_type
      FROM "user" u
      LEFT JOIN "role" r ON u.role_id = r.id
      LEFT JOIN "tenant" t ON u.tenant_id = t.id
      WHERE u.username = $1
    `, 
      [username]
    );
    return rows[0];
  }

  async getById(db, id) {
    const { rows } = await db.query(
      `
      SELECT 
        u.*, 
        r.name AS role_name, 
        t.name AS tenant_name, t.type AS tenant_type
      FROM "user" u
      LEFT JOIN "role" r ON u.role_id = r.id
      LEFT JOIN "tenant" t ON u.tenant_id = t.id
      WHERE u.id = $1
    `,
      [id]
    );
    return rows[0];
  }

  async create(db, { username, password, tenant_id, role_id }) { 
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!role_id) {
      const superAdminRole = await this.getOrCreateSuperAdminRole(db);
      role_id = superAdminRole.id;
      tenant_id = null;
    }

    const { rows } = await db.query(
      `
      INSERT INTO "user" (username, password, tenant_id, role_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, role_id, tenant_id
    `,
      [username, hashedPassword, tenant_id, role_id]
    );
    return rows[0];
  }

  async update(db, id, { username, password }) { 
    let queryParts = [];
    const params = [];
    let paramIndex = 1;

    if (username) { 
      queryParts.push(`username = $${paramIndex++}`); 
      params.push(username);
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      queryParts.push(`password = $${paramIndex++}`);
      params.push(hashed);
    }

    if (queryParts.length === 0) return this.getById(db, id);

    queryParts.push(`updated_at = CURRENT_TIMESTAMP`);
    const query = `UPDATE "user" SET ${queryParts.join(
      ", "
    )} WHERE id = $${paramIndex} RETURNING id`; 
    params.push(id);
    
    const { rows } = await db.query(query, params);
    
    if(rows[0]) {
        return this.getById(db, rows[0].id);
    }
    return null;
  }

  async updateByAdmin(db, id, { username, role_id, active }) { 
    const queryParts = [];
    const params = [];
    let paramIndex = 1;

    if (username) { 
      queryParts.push(`username = $${paramIndex++}`); 
      params.push(username);
    }
    if (role_id) {
      queryParts.push(`role_id = $${paramIndex++}`);
      params.push(role_id);
    }
    if (active !== undefined) {
      queryParts.push(`active = $${paramIndex++}`);
      params.push(active);
    }

    if (queryParts.length === 0) return this.getById(db, id);

    queryParts.push(`updated_at = CURRENT_TIMESTAMP`);
    const query = `UPDATE "user" SET ${queryParts.join(
      ", "
    )} WHERE id = $${paramIndex} RETURNING id`;
    params.push(id);
    
    const { rows } = await db.query(query, params);
    
    if(rows[0]) {
        return this.getById(db, rows[0].id);
    }
    return null;
  }

  async delete(db, id) {
    const userToDelete = await this.getById(db, id);
    await db.query(
      `DELETE FROM "user" WHERE id = $1`,
      [id]
    );
    return userToDelete;
  }

  async comparePasswords(candidate, hashed) {
    return bcrypt.compare(candidate, hashed);
  }
}

module.exports = UserRepository;