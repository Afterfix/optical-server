class FrameVariantRepository {
  _buildQueryParts(tenantId, filters = {}) {
    const { sort, searchType, searchKey, ...otherFilters } = filters;

    let whereClause = "";
    const params = [];
    let paramIndex = 1;

    if (tenantId) {
      whereClause += ` WHERE fv.tenant_id = $${paramIndex++}`;
      params.push(tenantId);
    }

    const filterConfig = {
      color: { operator: "ILIKE", column: "fv.color" },
      size: { operator: "ILIKE", column: "fv.size" },
      sku: { operator: "ILIKE", column: "fv.sku" },
      frame_id: { operator: "=", column: "fv.frame_id" },
      frame_name: { operator: "ILIKE", column: "f.name" },
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
      sku: "fv.sku",
      color: "fv.color",
      stock_qty: "fv.stock_qty",
      created_at: "fv.created_at",
      frame_name: "f.name",
    };

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey] || "fv.created_at";
      sortClause = ` ORDER BY ${dbColumn} ${direction}, fv.id DESC`;
    } else {
      sortClause = " ORDER BY fv.created_at DESC, fv.id DESC";
    }

    return { whereClause, sortClause, params, paramIndex };
  }

  async getAllByTenantId(db, tenantId, filters = {}) {
    const { whereClause, sortClause, params } = this._buildQueryParts(
      tenantId,
      filters,
    );
    const query = `
      SELECT fv.*, f.name as frame_name, f.model_no as frame_model_no, f.selling_price as price
      FROM frame_variants fv
      LEFT JOIN frame f ON fv.frame_id = f.id
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

    const { whereClause, sortClause, params, paramIndex } =
      this._buildQueryParts(tenantId, filters);

    let query = `
      SELECT fv.*, f.name as frame_name, f.model_no as frame_model_no, f.selling_price as price, COUNT(*) OVER() as total_count 
      FROM frame_variants fv
      LEFT JOIN frame f ON fv.frame_id = f.id
      ${whereClause} 
      ${sortClause} 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const variants = rows.map(({ total_count, ...rest }) => rest);

    return { variants, totalCount };
  }

  async create(db, data) {
    const { tenant_id, frame_id, color, size, sku, barcode, stock_qty, image } = data;
    const { rows } = await db.query(
      `INSERT INTO frame_variants (tenant_id, frame_id, color, size, sku, barcode, stock_qty, image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [tenant_id, frame_id, color, size, sku, barcode || null, stock_qty ?? 0, image ?? null],
    );
    return rows[0];
  }

  async getById(db, id, tenantId = null) {
    let queryText = `
      SELECT fv.*, f.name as frame_name, f.model_no as frame_model_no, f.selling_price as price
      FROM frame_variants fv
      LEFT JOIN frame f ON fv.frame_id = f.id
      WHERE fv.id = $1
    `;
    const params = [id];
    if (tenantId) {
      queryText += " AND fv.tenant_id = $2";
      params.push(tenantId);
    }
    const { rows } = await db.query(queryText, params);
    return rows[0];
  }

  async getBySku(db, sku) {
    const { rows } = await db.query(
      `SELECT * FROM frame_variants WHERE sku = $1`,
      [sku],
    );
    return rows[0];
  }

  async update(db, id, data, tenantId = null) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    if (fields.length === 0) return this.getById(db, id, tenantId);

    const setClause = fields
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");
    let query = `UPDATE frame_variants SET ${setClause} WHERE id = $${fields.length + 1}`;
    const params = [...values, id];

    if (tenantId) {
      query += ` AND tenant_id = $${fields.length + 2}`;
      params.push(tenantId);
    }
    query += " RETURNING *";
    const { rows } = await db.query(query, params);
    return rows[0];
  }

  async updateStock(client, id, quantityChange) {
    const query = `
      UPDATE frame_variants 
      SET stock_qty = stock_qty + $1 
      WHERE id = $2 
      RETURNING *;
    `;
    const { rows } = await client.query(query, [quantityChange, id]);
    if (rows.length === 0) {
      throw new Error(`Frame variant with ID ${id} not found.`);
    }
    return rows[0];
  }

  async delete(db, id, tenantId = null) {
    let query = "DELETE FROM frame_variants WHERE id = $1";
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

module.exports = FrameVariantRepository;
