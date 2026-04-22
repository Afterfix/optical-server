class LensAddonsRepository {
  _buildQueryParts(tenantId, filters = {}) {
    const { sort, searchType, searchKey, ...otherFilters } = filters;

    let whereClause = "";
    const params = [];
    let paramIndex = 1;

    if (tenantId) {
      whereClause += ` WHERE la.tenant_id = $${paramIndex++}`;
      params.push(tenantId);
    }

    const filterConfig = {
      name: { operator: "ILIKE", column: "la.name" },
      price: { operator: "=", column: "la.price" },
    };

    let filterQuery = "";
    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== "" &&
        filterConfig[key]
      ) {
        const { operator, column } = filterConfig[key];
        filterQuery += ` AND ${column} ${operator} $${paramIndex}`;
        const value =
          operator === "ILIKE" ? `%${otherFilters[key]}%` : otherFilters[key];
        params.push(value);
        paramIndex++;
      }
    });

    if (
      searchType &&
      searchKey != null &&
      searchKey !== "" &&
      filterConfig[searchType]
    ) {
      const { operator, column } = filterConfig[searchType];
      filterQuery += ` AND ${column} ${operator} $${paramIndex}`;
      params.push(`%${searchKey}%`);
      paramIndex++;
    }

    if (filterQuery) {
      whereClause += whereClause.includes("WHERE")
        ? filterQuery
        : filterQuery.replace(/^ AND/, " WHERE");
    }

    let sortClause = "";
    const allowedSortColumns = {
      name: "la.name",
      price: "la.price",
      created_at: "la.created_at",
    };

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey] || "la.name";
      sortClause = ` ORDER BY ${dbColumn} ${direction}, la.id DESC`;
    } else {
      sortClause = " ORDER BY la.name ASC, la.id DESC";
    }

    return { whereClause, sortClause, params, paramIndex };
  }

  async getAllByTenantId(db, tenantId, filters = {}) {
    const { whereClause, sortClause, params } = this._buildQueryParts(
      tenantId,
      filters,
    );
    const query = `SELECT la.* FROM lens_addons la ${whereClause} ${sortClause}`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  async getPaginatedByTenantId(db, tenantId, filters = {}) {
    const { page = 1, page_size = 10 } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const { whereClause, sortClause, params, paramIndex } =
      this._buildQueryParts(tenantId, filters);

    let query = `
      SELECT la.*, COUNT(*) OVER() as total_count 
      FROM lens_addons la
      ${whereClause} 
      ${sortClause} 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const addons = rows.map(({ total_count, ...rest }) => rest);

    return { addons, totalCount };
  }

  async create(db, data) {
    const { tenant_id, name, price, stock = 0 } = data;
    const { rows } = await db.query(
      `INSERT INTO lens_addons (tenant_id, name, price, stock)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tenant_id, name, price, stock],
    );
    return rows[0];
  }

  async getById(db, id, tenantId = null) {
    let queryText = `SELECT * FROM lens_addons WHERE id = $1`;
    const params = [id];
    if (tenantId) {
      queryText += " AND tenant_id = $2";
      params.push(tenantId);
    }
    const { rows } = await db.query(queryText, params);
    return rows[0];
  }

  async update(db, id, data, tenantId = null) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    if (fields.length === 0) return this.getById(db, id, tenantId);

    const setClause = fields.map((f, i) => `"${f}" = $${i + 1}`).join(", ");
    let query = `UPDATE lens_addons SET ${setClause} WHERE id = $${fields.length + 1}`;
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
    let query = "DELETE FROM lens_addons WHERE id = $1";
    const params = [id];
    if (tenantId) {
      query += " AND tenant_id = $2";
      params.push(tenantId);
    }
    query += " RETURNING id";
    const { rows } = await db.query(query, params);
    return rows[0];
  }

  async updateStock(db, id, quantityChange) {
    const query = `
      UPDATE lens_addons 
      SET stock = stock + $1 
      WHERE id = $2 
      RETURNING id, stock;
    `;
    const { rows } = await db.query(query, [quantityChange, id]);
    return rows[0];
  }
}

module.exports = LensAddonsRepository;
