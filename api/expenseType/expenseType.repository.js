class ExpenseTypeRepository {
  // Removed constructor

  async getAllByTenantId(db, tenantId, filters = {}) {
    const { sort, searchType, searchKey, ...otherFilters } = filters;
    let query = `
      SELECT
          et.*,
          db.name as done_by_name,
          cc.name as cost_center_name
        FROM "expense_type" et
        LEFT JOIN "done_by" db ON et.done_by_id = db.id
        LEFT JOIN "cost_center" cc ON et.cost_center_id = cc.id
    `;
    const params = [];
    let paramIndex = 1;
    const whereClauses = [];

    if (tenantId) {
      whereClauses.push(`et.tenant_id = $${paramIndex++}`);
      params.push(tenantId);
    }

    const filterConfig = {
      name: { operator: "ILIKE", column: "et.name" },
      done_by_id: { operator: "=", column: "et.done_by_id" },
      cost_center_id: { operator: "=", column: "et.cost_center_id" },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== "" &&
        filterConfig[key]
      ) {
        const { operator, column } = filterConfig[key];
        const value =
          operator === "ILIKE" ? `%${otherFilters[key]}%` : otherFilters[key];
        whereClauses.push(`${column} ${operator} $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    // --- MODIFIED searchConfig START ---
    const searchConfig = {
      name: { operator: "ILIKE", column: "et.name" },
      done_by_name: { operator: "ILIKE", column: "db.name" },
      cost_center_name: { operator: "ILIKE", column: "cc.name" },
    };
    // --- MODIFIED searchConfig END ---


    if (
      searchType &&
      searchKey != null &&
      searchKey !== "" &&
      searchConfig[searchType]
    ) {
      // Get the config based on searchType
      const { operator, column } = searchConfig[searchType];
      let value = operator === "ILIKE" ? `%${searchKey}%` : searchKey;

      // --- MODIFIED LOGIC START: Handle multi-column search OR single-column search ---
      
      // Case 1: Multi-column search for 'name' (searches all three fields for flexibility)
      if (searchType === 'name') {
        // Use the ILIKE value for the multi-column OR search
        whereClauses.push(`
          (et.name ILIKE $${paramIndex} OR db.name ILIKE $${paramIndex} OR cc.name ILIKE $${paramIndex})
        `);
        params.push(value);
        paramIndex++;
      } 
      // Case 2 & 3: Single-column search for 'done_by_name' or 'cost_center_name'
      else {
        // Use the original logic for single-column search
        whereClauses.push(`${column} ${operator} $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
      // --- MODIFIED LOGIC END ---
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    const allowedSortColumns = {
      name: "et.name",
      done_by: "db.name",
      cost_center: "cc.name",
      created_at: "et.created_at",
    };
    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) {
        query += ` ORDER BY ${dbColumn} ${direction}, et.id DESC`;
      } else {
        query += ` ORDER BY et.created_at DESC, et.id DESC`;
      }
    } else {
      query += ` ORDER BY et.created_at DESC, et.id DESC`;
    }

    const { rows } = await db.query(query, params);
    return rows;
  }

  async create(db, expenseTypeData) {
    const { tenant_id, name, done_by_id, cost_center_id } = expenseTypeData;
    const query = `INSERT INTO "expense_type" (tenant_id, name, done_by_id, cost_center_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`;
    const values = [
      tenant_id,
      name,
      done_by_id || null,
      cost_center_id || null,
    ];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  async getById(db, id, tenantId = null) {
    let query = `SELECT et.*, db.name as done_by_name, cc.name as cost_center_name
       FROM "expense_type" et
       LEFT JOIN "done_by" db ON et.done_by_id = db.id
       LEFT JOIN "cost_center" cc ON et.cost_center_id = cc.id
       WHERE et.id = $1`;
    const params = [id];
    if (tenantId) {
      query += " AND et.tenant_id = $2";
      params.push(tenantId);
    }
    const { rows } = await db.query(query, params);
    return rows[0];
  }

  async update(db, id, data, tenantId = null) {
    const validColumns = ['name', 'done_by_id', 'cost_center_id'];
    const cleanData = {};

    Object.keys(data).forEach((key) => {
      if (validColumns.includes(key)) {
        cleanData[key] = data[key];
      }
    });

    const fields = Object.keys(cleanData);
    const values = Object.values(cleanData);
    
    if (fields.length === 0) {
      return this.getById(db, id, tenantId);
    }

    const setClause = fields
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");
    
    let query = `UPDATE "expense_type" SET ${setClause} WHERE id = $${
      fields.length + 1
    }`;
    
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
    let query = `DELETE FROM "expense_type" WHERE id = $1`;
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

module.exports = ExpenseTypeRepository;