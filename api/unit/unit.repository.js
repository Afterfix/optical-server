class UnitRepository {
  // constructor removed

  async getAllByTenantId(db, tenantId, filters = {}) {
    const { sort, searchType, searchKey, ...otherFilters } = filters;
    let query = `
      SELECT u.*, db.name as done_by_name, cc.name as cost_center_name
      FROM "unit" u
      LEFT JOIN "done_by" db ON u.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON u.cost_center_id = cc.id
    `;

    const params = [];
    let paramIndex = 1;
    const whereClauses = [];

    if (tenantId) {
      whereClauses.push(`u.tenant_id = $${paramIndex++}`);
      params.push(tenantId);
    }
    
    const filterConfig = {
      name: { operator: 'ILIKE', column: 'u.name' },
      symbol: { operator: 'ILIKE', column: 'u.symbol' },
      done_by_id: { operator: '=', column: 'u.done_by_id' },
      cost_center_id: { operator: '=', column: 'u.cost_center_id' },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== '' &&
        filterConfig[key]
      ) {
        const { operator, column } = filterConfig[key];
        let value = otherFilters[key];
        if (operator === 'ILIKE') {
          value = `%${value}%`;
        }
        whereClauses.push(`${column} ${operator} $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    // Search Logic
    const searchConfig = {
      name: { operator: 'ILIKE', column: 'u.name' },
      symbol: { operator: 'ILIKE', column: 'u.symbol' },
    };

    if (
      searchType &&
      searchKey != null &&
      searchKey !== '' &&
      searchConfig[searchType]
    ) {
      const { operator, column } = searchConfig[searchType];
      let value = operator === 'ILIKE' ? `%${searchKey}%` : searchKey;
      whereClauses.push(`${column} ${operator} $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    // Sort Logic
    const allowedSortColumns = {
      name: 'u.name',
      symbol: 'u.symbol',
      created_at: 'u.created_at',
      done_by: 'db.name',
      cost_center: 'cc.name',
    };
    if (sort) {
      const direction = sort.startsWith('-') ? 'DESC' : 'ASC';
      const columnKey = sort.startsWith('-') ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) {
        query += ` ORDER BY ${dbColumn} ${direction}, u.id DESC`;
      } else {
        query += ' ORDER BY u.created_at DESC, u.id DESC';
      }
    } else {
      query += ' ORDER BY u.created_at DESC, u.id DESC';
    }


    const { rows } = await db.query(query, params);
    return rows;
  }

  async create(db, unitData) {
    const { tenant_id, name, symbol, done_by_id, cost_center_id } = unitData;
    const { rows } = await db.query(
      `INSERT INTO "unit" (tenant_id, name, symbol, done_by_id, cost_center_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenant_id, name, symbol, done_by_id, cost_center_id]
    );
    return rows[0];
  }

  async getById(db, id, tenantId = null) {
    let query = `
       SELECT u.*, db.name as done_by_name, cc.name as cost_center_name
       FROM "unit" u
       LEFT JOIN "done_by" db ON u.done_by_id = db.id
       LEFT JOIN "cost_center" cc ON u.cost_center_id = cc.id
       WHERE u.id = $1`;
    const params = [id];
    
    if (tenantId) {
      query += " AND u.tenant_id = $2";
      params.push(tenantId);
    }
    
    const { rows } = await db.query(query, params);
    return rows[0];
  }

  async update(db, id, tenantId = null, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);

    if (fields.length === 0) {
      return this.getById(db, id, tenantId);
    }

    const setClause = fields
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");

    let query = `UPDATE "unit" SET ${setClause} WHERE id = $${fields.length + 1}`;
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
    let query = `DELETE FROM "unit" WHERE id = $1`;
    const params = [id];

    if (tenantId) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }
    
    query += " RETURNING id";

    const { rows } = await db.query(query, params);
    return rows[0];
  }
}

module.exports = UnitRepository;