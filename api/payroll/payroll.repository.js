class PayrollRepository {
  // REMOVED: constructor(db)

  _buildQuery(baseQuery, tenantId, filters = {}) {
    const { sort, searchType, searchKey, ...otherFilters } = filters;

    let query = baseQuery;
    const params = [tenantId];
    let paramIndex = 2;

    const filterConfig = {
      employee_id: { operator: "=", column: "p.employee_id" },
      ledger_id: { operator: "=", column: "p.ledger_id" },
      cost_center_id: { operator: "=", column: "p.cost_center_id" },
      done_by_id: { operator: "=", column: "p.done_by_id" },
      min_salary: { operator: ">=", column: "p.salary" },
      max_salary: { operator: "<=", column: "p.salary" },
      start_date: { operator: ">=", column: "p.pay_date" },
      end_date: { operator: "<=", column: "p.pay_date" },
      employee_name: { operator: "ILIKE", column: "e.name", isString: true },
      ledger_name: { operator: "ILIKE", column: "l.name", isString: true },
      salary: { operator: "=", column: "p.salary" },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== "" &&
        filterConfig[key]
      ) {
        const { operator, column, isString } = filterConfig[key];
        let value = otherFilters[key];
        if (isString) {
          value = `%${value}%`;
        }
        query += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    });

    const searchConfig = {
      employee_name: { column: "e.name", operator: "ILIKE" },
      salary: { column: "p.salary", operator: "=", type: "decimal" },
      cost_center_name: { column: "cc.name", operator: "ILIKE" },
      ledger_name: { column: "l.name", operator: "ILIKE" },
      done_by_name: { column: "d.name", operator: "ILIKE" },
    };

    if (
      searchType &&
      searchKey != null &&
      searchKey !== "" &&
      searchConfig[searchType]
    ) {
      const { operator, column, type } = searchConfig[searchType];
      if (type === "decimal" && !isNaN(searchKey)) {
        query += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(Number(searchKey));
        paramIndex++;
      } else if (type !== "decimal") {
        const value = operator === "ILIKE" ? `%${searchKey}%` : searchKey;
        query += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    const allowedSortColumns = {
      employee_name: "e.name",
      salary: "p.salary",
      pay_date: "p.pay_date",
      cost_center: "cc.name",
      ledger: "l.name",
      done_by: "d.name",
      created_at: "p.created_at",
    };

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) {
        query += ` ORDER BY ${dbColumn} ${direction}, p.id DESC`;
      } else {
        query += " ORDER BY p.pay_date DESC, p.id DESC";
      }
    } else {
      query += " ORDER BY p.pay_date DESC, p.id DESC";
    }

    return { query, params, paramIndex };
  }

  // ADDED: db param
  async getAllByUser(db, tenantId, filters = {}) {
    const baseQuery = `
      SELECT p.*, 
        e.name AS employee_name,
        cc.name AS cost_center_name,
        l.name AS ledger_name,
        d.name AS done_by_name
      FROM payroll p
      LEFT JOIN employee e ON p.employee_id = e.id
      LEFT JOIN ledger l ON p.ledger_id = l.id
      LEFT JOIN cost_center cc ON p.cost_center_id = cc.id
      LEFT JOIN done_by d ON p.done_by_id = d.id
      WHERE p.tenant_id = $1`;
    const { query, params } = this._buildQuery(baseQuery, tenantId, filters);
    const { rows } = await db.query(query, params);
    return rows;
  }

  // ADDED: db param
  async getPaginatedByTenantId(db, tenantId, filters = {}) {
    const { page = 1, page_size = 10 } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    const baseQuery = `
      SELECT p.*, 
        e.name AS employee_name,
        cc.name AS cost_center_name,
        l.name AS ledger_name,
        d.name AS done_by_name,
        COUNT(*) OVER() as total_count
      FROM payroll p
      LEFT JOIN employee e ON p.employee_id = e.id
      LEFT JOIN ledger l ON p.ledger_id = l.id
      LEFT JOIN cost_center cc ON p.cost_center_id = cc.id
      LEFT JOIN done_by d ON p.done_by_id = d.id
      WHERE p.tenant_id = $1`;

    let { query, params, paramIndex } = this._buildQuery(baseQuery, tenantId, filters);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const payrollRecords = rows.map(({ total_count, ...rest }) => rest);
    return { payrollRecords, totalCount };
  }

  // ADDED: db param
  async getById(db, id, tenantId = null) {
    let query = `
      SELECT p.*, 
        e.name AS employee_name,
        cc.name AS cost_center_name,
        l.name AS ledger_name,
        d.name AS done_by_name
      FROM payroll p
      LEFT JOIN employee e ON p.employee_id = e.id
      LEFT JOIN ledger l ON p.ledger_id = l.id
      LEFT JOIN cost_center cc ON p.cost_center_id = cc.id
      LEFT JOIN done_by d ON p.done_by_id = d.id
      WHERE p.id = $1`;
    const params = [id];

    if (tenantId) {
      query += " AND p.tenant_id = $2";
      params.push(tenantId);
    }
    const { rows } = await db.query(query, params);
    return rows[0];
  }

  // ADDED: db param
  async create(db, payrollData) {
    const { tenant_id, employee_id, ledger_id, salary, pay_date, cost_center_id, done_by_id } = payrollData;
    const { rows } = await db.query(
      `INSERT INTO payroll(tenant_id, employee_id, ledger_id, salary, pay_date, cost_center_id, done_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [tenant_id, employee_id, ledger_id, salary, pay_date, cost_center_id, done_by_id]
    );
    return rows[0];
  }

  // ADDED: db param
  async createBulk(db, bulkPayrollData, tenantId) {
    if (!bulkPayrollData || bulkPayrollData.length === 0) return [];
    const values = [];
    const queryParams = [];
    let paramIndex = 1;

    bulkPayrollData.forEach((item) => {
      const valueGroup = `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`;
      values.push(valueGroup);
      queryParams.push(
        tenantId,
        item.employee_id,
        item.ledger_id,
        item.salary,
        item.pay_date,
        item.cost_center_id,
        item.done_by_id
      );
    });
    const query = `
            INSERT INTO payroll(tenant_id, employee_id, ledger_id, salary, pay_date, cost_center_id, done_by_id)
            VALUES ${values.join(", ")} RETURNING *`;
    const { rows } = await db.query(query, queryParams);
    return rows;
  }

  // ADDED: db param
  async update(db, id, tenantId = null, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);

    if (fields.length === 0) {
      return this.getById(db, id, tenantId); // Pass db recursively
    }

    const setClause = fields.map((field, index) => `"${field}" = $${index + 1}`).join(", ");
    let query = `UPDATE payroll SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1}`;
    const params = [...values, id];

    if (tenantId) {
      query += ` AND tenant_id = $${fields.length + 2}`;
      params.push(tenantId);
    }
    
    query += " RETURNING *";
    const { rows } = await db.query(query, params);
    return rows[0];
  }

  // ADDED: db param
  async delete(db, id, tenantId = null) {
    let query = "DELETE FROM payroll WHERE id = $1";
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

module.exports = PayrollRepository;