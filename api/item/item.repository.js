class ItemRepository {
  
  _buildQuery(baseQuery, tenantId, filters = {}) {
    const { page, page_size, sort, searchType, searchKey, ...otherFilters } =
      filters;

    let query = baseQuery;
    const params = [tenantId];
    let paramIndex = 2;

    const filterConfig = {
      name: { operator: "ILIKE", column: "i.name", isString: true },
      category: { operator: "ILIKE", column: "c.name", isString: true },
      sku: { operator: "ILIKE", column: "i.sku", isString: true },
      brand: { operator: "ILIKE", column: "b.name", isString: true },
      bar_code: { operator: "ILIKE", column: "i.bar_code", isString: true },
      selling_price: { operator: "=", column: "i.selling_price" },
      stock_quantity: { operator: "=", column: "i.stock_quantity" },
      tax: { operator: "=", column: "i.tax" },
      start_date: { operator: ">=", column: "i.created_at" },
      end_date: { operator: "<=", column: "i.created_at" },
      done_by_id: { operator: "=", column: "i.done_by_id" },
      cost_center_id: { operator: "=", column: "i.cost_center_id" },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== "" &&
        filterConfig[key]
      ) {
        const { operator, column, isString } = filterConfig[key];
        const value = isString ? `%${otherFilters[key]}%` : otherFilters[key];
        query += ` AND ${column} ${operator} $${paramIndex++}`;
        params.push(value);
      }
    });

    if (
      searchType &&
      searchKey != null &&
      searchKey !== "" &&
      filterConfig[searchType]
    ) {
      const { operator, column, isString } = filterConfig[searchType];
      const value = isString ? `%${searchKey}%` : searchKey;
      query += ` AND ${column} ${operator} $${paramIndex++}`;
      params.push(value);
    }

    // Sorting logic
    const allowedSortColumns = {
      name: "i.name",
      category: "c.name",
      brand: "b.name",
      stock_quantity: "i.stock_quantity",
      selling_price: "i.selling_price",
      done_by: "db.name",
      cost_center: "cc.name",
      created_at: "i.created_at",
    };
    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) {
        query += ` ORDER BY ${dbColumn} ${direction}, i.id DESC`;
      } else {
        query += " ORDER BY i.name ASC, i.id DESC";
      }
    } else {
      query += " ORDER BY i.name ASC, i.id DESC";
    }

    return { query, params, paramIndex };
  }

  async findByBarcode(db, barcode, tenantId, excludeItemId = null) {
    let query = `SELECT id FROM item WHERE bar_code = $1 AND tenant_id = $2`;
    const params = [barcode, tenantId];
    if (excludeItemId) {
      query += ` AND id != $3`;
      params.push(excludeItemId);
    }
    const { rows } = await db.query(query, params);
    return rows[0];
  }

  async create(db, itemData) {
    const {
      tenant_id,
      name,
      description,
      category_id,
      sku,
      brand_id,
      bar_code,
      stock_quantity,
      purchase_price,
      selling_price,
      tax,
      min_stock_level,
      party_id,
      image,
      done_by_id,
      cost_center_id,
      selling_price_with_tax,
    } = itemData;
    const { rows } = await db.query(
      `INSERT INTO item (
        tenant_id, name, description, category_id, sku, brand_id, bar_code, 
        stock_quantity, purchase_price, selling_price, tax, min_stock_level, 
        party_id, image, done_by_id, cost_center_id, selling_price_with_tax
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        tenant_id,
        name,
        description,
        category_id,
        sku,
        brand_id,
        bar_code,
        stock_quantity,
        purchase_price,
        selling_price,
        tax,
        min_stock_level,
        party_id,
        image,
        done_by_id || null,
        cost_center_id || null,
        selling_price_with_tax,
      ]
    );
    return rows[0];
  }

  async update(db, id, tenantId, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");

    if (fields.length === 0) {
      return this.getById(db, id, tenantId);
    }

    const query = `
      UPDATE item SET ${setClause}
      WHERE id = $${fields.length + 1} AND tenant_id = $${fields.length + 2}
      RETURNING *`;
    const queryValues = [...values, id, tenantId];

    const { rows } = await db.query(query, queryValues);
    return rows[0];
  }

  async delete(db, id, tenantId) {
    const { rows } = await db.query(
      "DELETE FROM item WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId]
    );
    return rows[0];
  }

  async getById(db, id, tenantId) {
    const query = `
        SELECT
            i.*,
            p.name as party_name, p.phone as party_phone,
            c.name as category_name, b.name as brand_name,
            db.name as done_by_name, cc.name as cost_center_name,
            (
              SELECT COALESCE(json_agg(json_build_object(
                'field_id', cf.id,
                'label', cf.label,
                'type', cf.type,
                'is_required', cf.is_required,
                'value', icfv.value
              )), '[]'::json)
              FROM category_custom_fields cf
              LEFT JOIN item_custom_field_values icfv 
                ON cf.id = icfv.field_id AND icfv.item_id = i.id
              WHERE cf.category_id = i.category_id
            ) AS "ItemCustomFields"
        FROM item i
        LEFT JOIN party p ON i.party_id = p.id 
        LEFT JOIN category c ON i.category_id = c.id
        LEFT JOIN brand b ON i.brand_id = b.id
        LEFT JOIN "done_by" db ON i.done_by_id = db.id
        LEFT JOIN "cost_center" cc ON i.cost_center_id = cc.id
        WHERE i.id = $1 AND i.tenant_id = $2;
    `;
    const { rows } = await db.query(query, [id, tenantId]);
    return rows[0];
  }

  async getAllByTenantId(db, tenantId, filters = {}) {
    const baseQuery = `
      SELECT 
        i.*, c.name as category_name, b.name as brand_name,
        db.name as done_by_name, cc.name as cost_center_name,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'field_id', cf.id,
            'label', cf.label,
            'type', cf.type,
            'is_required', cf.is_required,
            'value', icfv.value
          )), '[]'::json)
          FROM category_custom_fields cf
          LEFT JOIN item_custom_field_values icfv 
            ON cf.id = icfv.field_id AND icfv.item_id = i.id
          WHERE cf.category_id = i.category_id
        ) AS "ItemCustomFields"
      FROM item i
      LEFT JOIN category c ON i.category_id = c.id
      LEFT JOIN brand b ON i.brand_id = b.id
      LEFT JOIN "done_by" db ON i.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON i.cost_center_id = cc.id
      WHERE i.tenant_id = $1`;

    const { query, params } = this._buildQuery(baseQuery, tenantId, filters);
    const { rows } = await db.query(query, params);
    return rows;
  }

  async getPaginatedTenantId(db, tenantId, filters = {}) {
    const { page = 1, page_size = 10 } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const baseQuery = `
      SELECT 
        i.*, p.name as party_name, c.name as category_name, b.name as brand_name, 
        db.name as done_by_name, cc.name as cost_center_name,
        COUNT(*) OVER() as total_count,
        (
          SELECT COALESCE(json_agg(json_build_object(
            'field_id', cf.id,
            'label', cf.label,
            'type', cf.type,
            'is_required', cf.is_required,
            'value', icfv.value
          )), '[]'::json)
          FROM category_custom_fields cf
          LEFT JOIN item_custom_field_values icfv 
            ON cf.id = icfv.field_id AND icfv.item_id = i.id
          WHERE cf.category_id = i.category_id
        ) AS "ItemCustomFields"
      FROM item i
      LEFT JOIN party p ON i.party_id = p.id 
      LEFT JOIN category c ON i.category_id = c.id
      LEFT JOIN brand b ON i.brand_id = b.id
      LEFT JOIN "done_by" db ON i.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON i.cost_center_id = cc.id
      WHERE i.tenant_id = $1
    `;

    let { query, params, paramIndex } = this._buildQuery(
      baseQuery,
      tenantId,
      filters
    );

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const items = rows.map(({ total_count, ...rest }) => rest);
    return { items, totalCount };
  }

  async getByIds(db, itemIds, tenantId) {
    const { rows } = await db.query(
      `SELECT * FROM item WHERE id = ANY($1::int[]) AND tenant_id = $2`,
      [itemIds, tenantId]
    );
    return rows;
  }

  async updateStock(db, itemId, quantityChange) {
    const { rows } = await db.query(
      `UPDATE item SET stock_quantity = stock_quantity + $1 WHERE id = $2 RETURNING *`,
      [quantityChange, itemId]
    );
    return rows[0];
  }
}

module.exports = ItemRepository;