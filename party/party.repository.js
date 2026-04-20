class PartyRepository {

  _buildFilterQuery(baseQuery, tenantId, filters = {}) {
    const { sort, page, page_size, searchKey, searchType, ...otherFilters } =
      filters;

    let query = baseQuery;
    const params = [tenantId];
    let paramIndex = 2;

    const filterConfig = {
      name: { operator: "ILIKE", column: "p.name", isString: true },
      email: { operator: "ILIKE", column: "p.email", isString: true },
      phone: { operator: "ILIKE", column: "p.phone", isString: true },
      address: { operator: "ILIKE", column: "p.address", isString: true },
      payment_terms: {
        operator: "ILIKE",
        column: "p.payment_terms",
        isString: true,
      },
      type: { operator: "=", column: "p.type" },
      done_by_id: { operator: "=", column: "p.done_by_id" },
      cost_center_id: { operator: "=", column: "p.cost_center_id" },
      ledger_id: { operator: "=", column: "p.ledger_id" }, // <<< ADDED
    };

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== "" &&
        filterConfig[key]
      ) {
        const { operator, column, isString } = filterConfig[key];
        const value = isString ? `%${otherFilters[key]}%` : otherFilters[key];
        query += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    });

    if (searchKey && searchType && filterConfig[searchType]) {
        const { operator, column, isString } = filterConfig[searchType];
        const value = isString ? `%${searchKey}%` : searchKey;
        query += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(value);
        paramIndex++;
    }


    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const column = sort.replace("-", "");
      const allowedColumns = ["name", "email", "created_at"]; // Whitelist columns
      if (allowedColumns.includes(column)) {
        query += ` ORDER BY p.${column} ${direction}`;
      } else {
        query += " ORDER BY p.name ASC, p.id DESC";
      }
    } else {
      query += " ORDER BY p.name ASC, p.id DESC";
    }

    return { query, params, paramIndex };
  }

  // ADDED: db param
  async create(db, partyData) {
    const {
      tenant_id,
      name,
      type,
      email,
      phone,
      address,
      credit_limit,
      outstanding_balance,
      payment_terms,
      done_by_id,
      cost_center_id,
      ledger_id, 
    } = partyData;
    const { rows } = await db.query(
      `INSERT INTO party (tenant_id, name, type, email, phone, address, credit_limit, outstanding_balance, payment_terms, done_by_id, cost_center_id, ledger_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        tenant_id,
        name,
        type,
        email || null,
        phone || null,
        address || null,
        credit_limit || 0.0,
        outstanding_balance || 0.0,
        payment_terms || null,
        done_by_id || null,
        cost_center_id || null,
        ledger_id || null,
      ]
    );
    return rows[0];
  }

  // ADDED: db param
  async getByTenantId(db, tenantId, filters = {}) {
    const baseQuery = `
        SELECT p.*, db.name as done_by_name, cc.name as cost_center_name, l.name as ledger_name
        FROM party p
        LEFT JOIN "done_by" db ON p.done_by_id = db.id
        LEFT JOIN "cost_center" cc ON p.cost_center_id = cc.id
        LEFT JOIN "ledger" l ON p.ledger_id = l.id
        WHERE p.tenant_id IS NOT DISTINCT FROM $1
    `;
    const { query, params } = this._buildFilterQuery(
      baseQuery,
      tenantId,
      filters
    );
    const { rows } = await db.query(query, params);
    return rows;
  }

  // ADDED: db param
  async getPaginatedByTenantId(db, tenantId, filters = {}) {
    const { page = 1, page_size = 10 } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const baseQuery = `
        SELECT p.*, db.name as done_by_name, cc.name as cost_center_name, l.name as ledger_name, COUNT(*) OVER() as total_count
        FROM party p
        LEFT JOIN "done_by" db ON p.done_by_id = db.id
        LEFT JOIN "cost_center" cc ON p.cost_center_id = cc.id
        LEFT JOIN "ledger" l ON p.ledger_id = l.id
        WHERE p.tenant_id IS NOT DISTINCT FROM $1 
    `;
    let { query, params, paramIndex } = this._buildFilterQuery(
      baseQuery,
      tenantId,
      filters
    );

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const parties = rows.map(({ total_count, ...rest }) => rest);

    return { parties, totalCount };
  }

  // ADDED: db param
  async getById(db, id, tenantId) {
    const query = `
        SELECT p.*, db.name as done_by_name, cc.name as cost_center_name, l.name as ledger_name
        FROM party p
        LEFT JOIN "done_by" db ON p.done_by_id = db.id
        LEFT JOIN "cost_center" cc ON p.cost_center_id = cc.id
        LEFT JOIN "ledger" l ON p.ledger_id = l.id
        WHERE p.id = $1 AND p.tenant_id IS NOT DISTINCT FROM $2;
    `;
    const { rows } = await db.query(query, [id, tenantId]);
    return rows[0];
  }

  // ADDED: db param
  async update(db, id, tenantId, data) {
    const allowedUpdates = [
      "name",
      "email",
      "phone",
      "address",
      "credit_limit",
      "outstanding_balance",
      "payment_terms",
      "done_by_id",
      "cost_center_id",
      "ledger_id", 
    ];
    const fieldsToUpdate = {};
    allowedUpdates.forEach((key) => {
      if (data[key] !== undefined) fieldsToUpdate[key] = data[key];
    });
    const fields = Object.keys(fieldsToUpdate);
    if (fields.length === 0) return this.getById(db, id, tenantId);
    const values = Object.values(fieldsToUpdate);
    const setClause = fields
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");

    const query = `
        UPDATE party SET ${setClause}
        WHERE id = $${fields.length + 1} AND tenant_id IS NOT DISTINCT FROM $${
      fields.length + 2
    }
        RETURNING *
    `;
    const { rows } = await db.query(query, [...values, id, tenantId]);
    return rows[0];
  }

  // ADDED: db param
  async delete(db, id, tenantId) {
    const { rows } = await db.query(
      "DELETE FROM party WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2 RETURNING id",
      [id, tenantId]
    );
    return rows[0];
  }
}

module.exports = PartyRepository;