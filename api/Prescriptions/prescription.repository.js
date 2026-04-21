class PrescriptionRepository {
  _buildQueryParts(tenantId, filters = {}) {
    const { sort, searchType, searchKey, start_date, end_date, ...otherFilters } = filters;

    let whereClause = "";
    const params = [];
    let paramIndex = 1;

    if (tenantId) {
      whereClause += ` WHERE p.tenant_id = $${paramIndex++}`;
      params.push(tenantId);
    }

    const filterConfig = {
      customer_id: { operator: "=", column: "p.customer_id" },
      doctor_name: { operator: "ILIKE", column: "p.doctor_name" },
      customer_name: { operator: "ILIKE", column: "c.name" },
    };

    let filterQuery = "";

    // Regular filters
    Object.keys(otherFilters).forEach((key) => {
      if (otherFilters[key] != null && otherFilters[key] !== "" && filterConfig[key]) {
        const { operator, column } = filterConfig[key];
        filterQuery += ` AND ${column} ${operator} $${paramIndex}`;
        const value = operator === "ILIKE" ? `%${otherFilters[key]}%` : otherFilters[key];
        params.push(value);
        paramIndex++;
      }
    });

    // Search logic
    if (searchType && searchKey != null && searchKey !== "" && filterConfig[searchType]) {
      const { operator, column } = filterConfig[searchType];
      filterQuery += ` AND ${column} ${operator} $${paramIndex}`;
      params.push(`%${searchKey}%`);
      paramIndex++;
    }

    // Date range logic
    if (start_date) {
      filterQuery += ` AND p.created_at >= $${paramIndex++}`;
      params.push(start_date);
    }
    if (end_date) {
      filterQuery += ` AND p.created_at <= $${paramIndex++}::date + interval '1 day'`;
      params.push(end_date);
    }

    if (filterQuery) {
      whereClause += whereClause.includes("WHERE") ? filterQuery : filterQuery.replace(/^ AND/, " WHERE");
    }

    let sortClause = "";
    const allowedSortColumns = {
      created_at: "p.created_at",
      doctor_name: "p.doctor_name",
      customer_name: "c.name",
    };

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      sortClause = ` ORDER BY ${dbColumn || "p.created_at"} ${direction}, p.id DESC`;
    } else {
      sortClause = " ORDER BY p.created_at DESC, p.id DESC";
    }

    return { whereClause, sortClause, params, paramIndex };
  }

  async getAllByTenantId(db, tenantId, filters = {}) {
    const { whereClause, sortClause, params } = this._buildQueryParts(tenantId, filters);
    const query = `
      SELECT p.*, c.name as customer_name, c.phone as customer_phone
      FROM prescription p
      LEFT JOIN party c ON p.customer_id = c.id
      ${whereClause} 
      ${sortClause}
    `;
    const { rows } = await db.query(query, params);
    return rows;
  }

  async getPaginatedByTenantId(db, tenantId, filters = {}) {
    const { page = 1, page_size = 10 } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const { whereClause, sortClause, params, paramIndex } = this._buildQueryParts(tenantId, filters);

    let query = `
      SELECT p.*, c.name as customer_name, COUNT(*) OVER() as total_count 
      FROM prescription p
      LEFT JOIN party c ON p.customer_id = c.id
      ${whereClause} 
      ${sortClause} 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const data = rows.map(({ total_count, ...rest }) => rest);

    return { data, totalCount };
  }

  async create(db, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");
    const columns = fields.join(", ");

    const query = `INSERT INTO prescription (${columns}) VALUES (${placeholders}) RETURNING *`;
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  async getById(db, id, tenantId = null) {
    let queryText = `
      SELECT p.*, c.name as customer_name, c.phone as customer_phone
      FROM prescription p
      LEFT JOIN party c ON p.customer_id = c.id
      WHERE p.id = $1
    `;
    const params = [id];

    if (tenantId) {
      queryText += " AND p.tenant_id = $2";
      params.push(tenantId);
    }

    const { rows } = await db.query(queryText, params);
    return rows[0];
  }

  async update(db, id, data, tenantId = null) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    if (fields.length === 0) return this.getById(db, id, tenantId);

    const setClause = fields.map((field, index) => `"${field}" = $${index + 1}`).join(", ");
    let query = `UPDATE prescription SET ${setClause} WHERE id = $${fields.length + 1}`;
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
    let query = "DELETE FROM prescription WHERE id = $1";
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

module.exports = PrescriptionRepository;