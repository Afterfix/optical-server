class ServicesRepository {
  constructor(db) {
    this.db = db;
  }

  _buildQueryParts(tenantId, filters = {}) {
    const { sort, searchType, searchKey, ...otherFilters } = filters;

    let whereClause = "";
    const params = [];
    let paramIndex = 1;

    if (tenantId) {
      whereClause += ` WHERE s.tenant_id = $${paramIndex++}`;
      params.push(tenantId);
    }

    const filterConfig = {
      status: { operator: "=", column: "s.status" },
      customer_id: { operator: "=", column: "s.customer_id" },
      customer_name: { operator: "ILIKE", column: "p.name" },
      description: { operator: "ILIKE", column: "s.description" },
    };

    let filterQuery = "";
    Object.keys(otherFilters).forEach((key) => {
      if (otherFilters[key] != null && otherFilters[key] !== "" && filterConfig[key]) {
        const { operator, column } = filterConfig[key];
        filterQuery += ` AND ${column} ${operator} $${paramIndex}`;
        const value = operator === "ILIKE" ? `%${otherFilters[key]}%` : otherFilters[key];
        params.push(value);
        paramIndex++;
      }
    });

    if (searchType && searchKey != null && searchKey !== "" && filterConfig[searchType]) {
      const { operator, column } = filterConfig[searchType];
      filterQuery += ` AND ${column} ${operator} $${paramIndex}`;
      params.push(`%${searchKey}%`);
      paramIndex++;
    }

    if (filterQuery) {
      whereClause += whereClause.includes("WHERE") ? filterQuery : filterQuery.replace(/^ AND/, " WHERE");
    }

    let sortClause = "";
    const allowedSortColumns = {
      created_at: "s.created_at",
      cost: "s.cost",
      delivery_date: "s.delivery_date",
      customer_name: "p.name",
      status: "s.status",
    };

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      sortClause = ` ORDER BY ${dbColumn || "s.created_at"} ${direction}, s.id DESC`;
    } else {
      sortClause = " ORDER BY s.created_at DESC, s.id DESC";
    }

    return { whereClause, sortClause, params, paramIndex };
  }

  async getAllByTenantId(tenantId, filters = {}) {
    const { whereClause, sortClause, params } = this._buildQueryParts(tenantId, filters);
    const query = `
      SELECT s.*, p.name as customer_name, p.phone as customer_phone
      FROM services s
      LEFT JOIN party p ON s.customer_id = p.id
      ${whereClause} 
      ${sortClause}
    `;
    const { rows } = await this.db.query(query, params);
    return rows;
  }

  async getPaginatedByTenantId(tenantId, filters = {}) {
    const { page = 1, page_size = 10 } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const { whereClause, sortClause, params, paramIndex } = this._buildQueryParts(tenantId, filters);

    let query = `
      SELECT s.*, p.name as customer_name, COUNT(*) OVER() as total_count 
      FROM services s
      LEFT JOIN party p ON s.customer_id = p.id
      ${whereClause} 
      ${sortClause} 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const { rows } = await this.db.query(query, params);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const services = rows.map(({ total_count, ...rest }) => rest);

    return { services, totalCount };
  }

  async create(dbOrClient, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const columns = fields.map(f => `"${f}"`).join(", ");
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");

    const query = `INSERT INTO services (${columns}) VALUES (${placeholders}) RETURNING *`;
    const executor = dbOrClient || this.db;
    const { rows } = await executor.query(query, values);
    return rows[0];
  }

  async getById(dbOrClient, id, tenantId = null) {
    const executor = dbOrClient && typeof dbOrClient.query === 'function' ? dbOrClient : this.db;
    const targetId = typeof dbOrClient === 'number' || typeof dbOrClient === 'string' ? dbOrClient : id;
    const actualTenantId = typeof dbOrClient === 'number' || typeof dbOrClient === 'string' ? id : tenantId;

    let queryText = `
      SELECT s.*, p.name as customer_name, p.phone as customer_phone
      FROM services s
      LEFT JOIN party p ON s.customer_id = p.id
      WHERE s.id = $1
    `;
    const params = [targetId];

    if (actualTenantId) {
      queryText += " AND s.tenant_id = $2";
      params.push(actualTenantId);
    }

    const { rows } = await executor.query(queryText, params);
    return rows[0];
  }

  async update(dbOrClient, id, data, tenantId = null) {
    const executor = dbOrClient && typeof dbOrClient.query === 'function' ? dbOrClient : this.db;
    const targetId = typeof dbOrClient === 'number' || typeof dbOrClient === 'string' ? dbOrClient : id;
    const actualData = typeof dbOrClient === 'number' || typeof dbOrClient === 'string' ? id : data;
    const actualTenantId = typeof dbOrClient === 'number' || typeof dbOrClient === 'string' ? data : tenantId;

    const fields = Object.keys(actualData);
    const values = Object.values(actualData);
    if (fields.length === 0) return this.getById(executor, targetId, actualTenantId);

    const setClause = fields.map((field, index) => `"${field}" = $${index + 1}`).join(", ");
    let query = `UPDATE services SET ${setClause} WHERE id = $${fields.length + 1}`;
    const params = [...values, targetId];

    if (actualTenantId) {
      query += ` AND tenant_id = $${fields.length + 2}`;
      params.push(actualTenantId);
    }
    query += " RETURNING *";

    const { rows } = await executor.query(query, params);
    return rows[0];
  }

  async delete(id, tenantId = null) {
    let query = "DELETE FROM services WHERE id = $1";
    const params = [id];
    if (tenantId) {
      query += " AND tenant_id = $2";
      params.push(tenantId);
    }
    query += " RETURNING id";
    const { rows } = await this.db.query(query, params);
    return rows[0];
  }
}

module.exports = ServicesRepository;