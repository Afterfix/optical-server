class ExpenseRepository {
  async create(db, expenseData) {
    const {
      tenant_id,
      description,
      amount,
      expense_type_id,
      date,
      ledger_id,
      amount_paid,
      done_by_id,
      cost_center_id,
    } = expenseData;

    const { rows } = await db.query(
      `INSERT INTO expenses (
        tenant_id, description, amount, expense_type_id, date, 
        ledger_id, amount_paid, done_by_id, cost_center_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        tenant_id,
        description,
        amount,
        expense_type_id,
        date || new Date(),
        ledger_id,
        amount_paid || 0,
        done_by_id,
        cost_center_id,
      ]
    );
    return rows[0];
  }

  async updatePaymentAndStatus(client, id, amount) {
    const query = `
      UPDATE expenses 
      SET amount_paid = amount_paid + $1 
      WHERE id = $2
      RETURNING *;
    `;
    const { rows } = await client.query(query, [amount, id]);
    return rows[0];
  }

  async getAllByTenantId(db, tenantId, filters = {}) {
    const { sort, searchType, searchKey, ...otherFilters } = filters;

    let query = `
            SELECT 
                e.*, 
                et.name as category, 
                l.name as ledger_name,
                db.name as done_by_name,
                cc.name as cost_center_name
            FROM expenses e
            LEFT JOIN "expense_type" et ON e.expense_type_id = et.id
            LEFT JOIN ledger l ON e.ledger_id = l.id
            LEFT JOIN "done_by" db ON e.done_by_id = db.id
            LEFT JOIN "cost_center" cc ON e.cost_center_id = cc.id
        `;
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (tenantId) {
      conditions.push(`e.tenant_id = $${paramIndex++}`);
      params.push(tenantId);
    }

    const filterConfig = {
      category: { operator: "=", column: "et.name" },
      ledger_id: { operator: "=", column: "e.ledger_id" },
      done_by_id: { operator: "=", column: "e.done_by_id" },
      cost_center_id: { operator: "=", column: "e.cost_center_id" },
      amount: { operator: "=", column: "e.amount" },
      amount_paid: { operator: "=", column: "e.amount_paid" },
      min_amount: { operator: ">=", column: "e.amount" },
      max_amount: { operator: "<=", column: "e.amount" },
      start_date: { operator: ">=", column: "e.date" },
      end_date: { operator: "<=", column: "e.date" },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== "" &&
        filterConfig[key]
      ) {
        conditions.push(
          ` ${filterConfig[key].column} ${
            filterConfig[key].operator
          } $${paramIndex++}`
        );
        params.push(otherFilters[key]);
      }
    });

    const searchConfig = {
      description: { operator: "ILIKE", column: "e.description" },
      category: { operator: "ILIKE", column: "et.name" },
      amount: { operator: "=", column: "e.amount" },
      amount_paid: { operator: "=", column: "e.amount_paid" },
      ledger_name: { operator: "ILIKE", column: "l.name" },
      done_by_name: { operator: "ILIKE", column: "db.name" },
      cost_center_name: { operator: "ILIKE", column: "cc.name" },
    };

    if (
      searchType &&
      searchKey != null &&
      searchKey !== "" &&
      searchConfig[searchType]
    ) {
      const { operator, column } = searchConfig[searchType];
      conditions.push(` ${column} ${operator} $${paramIndex++}`);
      params.push(operator === "ILIKE" ? `%${searchKey}%` : searchKey);
    }

    if (conditions.length > 0) query += ` WHERE ` + conditions.join(" AND ");

    const allowedSortColumns = {
      description: "e.description",
      amount: "e.amount",
      amount_paid: "e.amount_paid",
      category: "et.name",
      date: "e.date",
      ledger_name: "l.name",
      done_by: "db.name",
      cost_center: "cc.name",
    };

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      query += dbColumn
        ? ` ORDER BY ${dbColumn} ${direction}, e.id DESC`
        : " ORDER BY e.date DESC, e.id DESC";
    } else {
      query += " ORDER BY e.date DESC, e.id DESC";
    }

    const { rows } = await db.query(query, params);
    return rows;
  }

  async getPaginatedByTenantId(db, tenantId, filters = {}) {
    const {
      page = 1,
      page_size = 10,
      sort,
      searchType,
      searchKey,
      ...otherFilters
    } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const fromClause = `FROM expenses e 
                        LEFT JOIN "expense_type" et ON e.expense_type_id = et.id
                        LEFT JOIN ledger l ON e.ledger_id = l.id
                        LEFT JOIN "done_by" db ON e.done_by_id = db.id
                        LEFT JOIN "cost_center" cc ON e.cost_center_id = cc.id`;

    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (tenantId) {
      conditions.push(`e.tenant_id = $${paramIndex++}`);
      params.push(tenantId);
    }

    const filterConfig = {
      category: { operator: "=", column: "et.name" },
      ledger_id: { operator: "=", column: "e.ledger_id" },
      done_by_id: { operator: "=", column: "e.done_by_id" },
      cost_center_id: { operator: "=", column: "e.cost_center_id" },
      amount: { operator: "=", column: "e.amount" },
      amount_paid: { operator: "=", column: "e.amount_paid" },
      min_amount: { operator: ">=", column: "e.amount" },
      max_amount: { operator: "<=", column: "e.amount" },
      start_date: { operator: ">=", column: "e.date" },
      end_date: { operator: "<=", column: "e.date" },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== "" &&
        filterConfig[key]
      ) {
        conditions.push(
          ` ${filterConfig[key].column} ${
            filterConfig[key].operator
          } $${paramIndex++}`
        );
        params.push(otherFilters[key]);
      }
    });

    // --- RESTORED searchConfig section ---
    const searchConfig = {
      description: { operator: "ILIKE", column: "e.description" },
      category: { operator: "ILIKE", column: "et.name" },
      amount: { operator: "=", column: "e.amount" },
      amount_paid: { operator: "=", column: "e.amount_paid" },
      ledger_name: { operator: "ILIKE", column: "l.name" },
      done_by_name: { operator: "ILIKE", column: "db.name" },
      cost_center_name: { operator: "ILIKE", column: "cc.name" },
    };

    if (
      searchType &&
      searchKey != null &&
      searchKey !== "" &&
      searchConfig[searchType]
    ) {
      const { operator, column } = searchConfig[searchType];
      conditions.push(` ${column} ${operator} $${paramIndex++}`);
      params.push(operator === "ILIKE" ? `%${searchKey}%` : searchKey);
    }
    // ------------------------------------

    const whereClause =
      conditions.length > 0 ? ` WHERE ` + conditions.join(" AND ") : "";

    const aggregationQuery = `SELECT COALESCE(SUM(e.amount), 0) as total_amount, COALESCE(SUM(e.amount_paid), 0) as total_amount_paid ${fromClause}${whereClause}`;
    let mainQuery = `SELECT e.*, et.name as category, l.name as ledger_name, db.name as done_by_name, cc.name as cost_center_name, COUNT(*) OVER() as total_count ${fromClause}${whereClause}`;

    const allowedSortColumns = {
      description: "e.description",
      amount: "e.amount",
      amount_paid: "e.amount_paid",
      category: "et.name",
      date: "e.date",
      ledger_name: "l.name",
      done_by: "db.name",
      cost_center: "cc.name",
    };

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      mainQuery += dbColumn
        ? ` ORDER BY ${dbColumn} ${direction}, e.id DESC`
        : " ORDER BY e.date DESC, e.id DESC";
    } else {
      mainQuery += " ORDER BY e.date DESC, e.id DESC";
    }

    mainQuery += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    const mainQueryParams = [...params, limit, offset];

    const [mainResult, aggregationResult] = await Promise.all([
      db.query(mainQuery, mainQueryParams),
      db.query(aggregationQuery, params),
    ]);

    const { rows } = mainResult;
    return {
      expenses: rows.map(({ total_count, ...rest }) => rest),
      totalCount: rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0,
      total_amount: aggregationResult.rows[0].total_amount,
      total_amount_paid: aggregationResult.rows[0].total_amount_paid,
    };
  }

  async getById(db, id, tenantId) {
    const { rows } = await db.query(
      `SELECT e.*, et.name as category, l.name as ledger_name, db.name as done_by_name, cc.name as cost_center_name 
       FROM expenses e 
       LEFT JOIN "expense_type" et ON e.expense_type_id = et.id 
       LEFT JOIN ledger l ON e.ledger_id = l.id 
       LEFT JOIN "done_by" db ON e.done_by_id = db.id 
       LEFT JOIN "cost_center" cc ON e.cost_center_id = cc.id 
       WHERE e.id = $1 AND e.tenant_id = $2`,
      [id, tenantId]
    );
    return rows[0];
  }

  async update(db, id, tenantId, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    if (fields.length === 0) return this.getById(db, id, tenantId);
    const setClause = fields.map((f, i) => `"${f}" = $${i + 1}`).join(", ");
    const query = `UPDATE expenses SET ${setClause} WHERE id = $${
      fields.length + 1
    } AND tenant_id = $${fields.length + 2} RETURNING *`;
    const { rows } = await db.query(query, [...values, id, tenantId]);
    return rows[0];
  }

  async delete(db, id, tenantId) {
    const { rows } = await db.query(
      "DELETE FROM expenses WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId]
    );
    return rows[0];
  }
}

module.exports = ExpenseRepository;
