class EmployeeRepository {
  
  async getAllByTenantId(db, tenantId) {
    const { rows } = await db.query(
      `SELECT e.*, ep.name AS position_name, db.name as done_by_name, cc.name as cost_center_name
       FROM employee e
       LEFT JOIN "employee_position" ep ON e.employee_position_id = ep.id
       LEFT JOIN "done_by" db ON e.done_by_id = db.id
       LEFT JOIN "cost_center" cc ON e.cost_center_id = cc.id
       WHERE e.tenant_id = $1 
       ORDER BY e.name ASC`,
      [tenantId]
    );
    return rows;
  }

  async getPaginatedByTenantId(db, tenantId, filters = {}) {
    const { page = 1, page_size = 10, sort, searchType, searchKey, ...otherFilters } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    let query = `
      SELECT e.*, ep.name as position_name, db.name as done_by_name, cc.name as cost_center_name, COUNT(*) OVER() AS total_count
      FROM employee e
      LEFT JOIN "employee_position" ep ON e.employee_position_id = ep.id
      LEFT JOIN "done_by" db ON e.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON e.cost_center_id = cc.id
      WHERE e.tenant_id = $1`;
    const params = [tenantId];
    let paramIndex = 2;

    const filterConfig = {
      name: { operator: "ILIKE", column: "e.name" },
      email: { operator: "=", column: "e.email" },
      phone: { operator: "=", column: "e.phone" },
      position: { operator: "ILIKE", column: "ep.name" }, // Filter by position name
      done_by_id: { operator: "=", column: "e.done_by_id" },
      cost_center_id: { operator: "=", column: "e.cost_center_id" },
      min_salary: { operator: ">=", column: "e.salary" },
      max_salary: { operator: "<=", column: "e.salary" },
      start_date: { operator: ">=", column: "e.hire_date" },
      end_date: { operator: "<=", column: "e.hire_date" },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== "" &&
        filterConfig[key]
      ) {
        const { operator, column } = filterConfig[key];
        let value = otherFilters[key];
        if (operator === "ILIKE") {
          value = `%${value}%`;
        }
        query += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    });

    // Search Logic
    const searchConfig = {
      name: { operator: "ILIKE", column: "e.name" },
      email: { operator: "ILIKE", column: "e.email" },
      phone: { operator: "ILIKE", column: "e.phone" },
      position: { operator: "ILIKE", column: "ep.name" }, // Search by position name
      address: { operator: "ILIKE", column: "e.address" },
      salary: { operator: "=", column: "e.salary", type: "decimal" },
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
        let value = operator === "ILIKE" ? `%${searchKey}%` : searchKey;
        query += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    // Sort Logic
    const allowedSortColumns = {
      name: "e.name",
      email: "e.email",
      phone: "e.phone",
      position: "ep.name", // Sort by position name
      salary: "e.salary",
      hire_date: "e.hire_date",
      done_by: "db.name",
      cost_center: "cc.name",
    };
    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) {
        query += ` ORDER BY ${dbColumn} ${direction}, e.id DESC`;
      } else {
        query += " ORDER BY e.created_at DESC, e.id DESC";
      }
    } else {
      query += " ORDER BY e.created_at DESC, e.id DESC";
    }


    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const employees = rows.map(({ total_count, ...rest }) => rest);
    return { employees, totalCount };
  }

  async getById(db, id, tenantId = null) {
    let query = `
      SELECT e.*, ep.name AS position_name, db.name as done_by_name, cc.name as cost_center_name
      FROM employee e
      LEFT JOIN "employee_position" ep ON e.employee_position_id = ep.id
      LEFT JOIN "done_by" db ON e.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON e.cost_center_id = cc.id
      WHERE e.id = $1`;
    const params = [id];

    if (tenantId) {
      query += " AND e.tenant_id = $2";
      params.push(tenantId);
    }

    const { rows } = await db.query(query, params);
    return rows[0];
  }

  async create(db, employeeData) {
    const { tenant_id, name, email, phone, employee_position_id, salary, hire_date, address, done_by_id, cost_center_id } = employeeData;
    const { rows } = await db.query(
      `INSERT INTO employee(tenant_id, name, email, phone, employee_position_id, salary, hire_date, address, done_by_id, cost_center_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [tenant_id, name, email, phone, employee_position_id, salary, hire_date, address, done_by_id, cost_center_id]
    );
    return rows[0];
  }

  async update(db, id, tenantId = null, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);

    if (fields.length === 0) {
      return this.getById(db, id, tenantId);
    }

    const setClause = fields.map((field, index) => `"${field}" = $${index + 1}`).join(", ");
    let query = `UPDATE employee SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1}`;
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
    let payrollQuery = "DELETE FROM payroll WHERE employee_id = $1";
    const payrollParams = [id];

    if (tenantId) {
      payrollQuery += " AND tenant_id = $2";
      payrollParams.push(tenantId);
    }
    await db.query(payrollQuery, payrollParams);

    let employeeQuery = "DELETE FROM employee WHERE id = $1";
    const employeeParams = [id];
    
    if (tenantId) {
      employeeQuery += " AND tenant_id = $2";
      employeeParams.push(tenantId);
    }

    employeeQuery += " RETURNING id";
    const { rows } = await db.query(employeeQuery, employeeParams);
    return rows[0];
  }
}

module.exports = EmployeeRepository;