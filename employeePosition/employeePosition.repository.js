class EmployeePositionRepository {
  async getAllByTenantId(db, tenantId, filters = {}) {
    const { sort, searchType, searchKey, ...otherFilters } = filters;
    let query = `
      SELECT ep.*, db.name as done_by_name, cc.name as cost_center_name
      FROM "employee_position" ep
      LEFT JOIN "done_by" db ON ep.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON ep.cost_center_id = cc.id
    `;
    const params = [];
    let paramIndex = 1;
    const whereClauses = [];

    if (tenantId) {
      whereClauses.push(`ep.tenant_id = $${paramIndex++}`);
      params.push(tenantId);
    }

    const filterConfig = {
      name: { operator: "ILIKE", column: "ep.name" },
      done_by_id: { operator: "=", column: "ep.done_by_id" },
      cost_center_id: { operator: "=", column: "ep.cost_center_id" },
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
        whereClauses.push(`${column} ${operator} $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    const searchConfig = {
      name: { operator: "ILIKE", column: "ep.name" },
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
      let value = operator === "ILIKE" ? `%${searchKey}%` : searchKey;
      whereClauses.push(`${column} ${operator} $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    const allowedSortColumns = {
      name: "ep.name",
      created_at: "ep.created_at",
      done_by: "db.name",
      cost_center: "cc.name",
    };

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) {
        query += ` ORDER BY ${dbColumn} ${direction}, ep.id DESC`;
      } else {
        query += " ORDER BY ep.created_at DESC, ep.id DESC";
      }
    } else {
      query += " ORDER BY ep.name ASC";
    }

    const { rows } = await db.query(query, params);
    return rows;
  }

  async create(db, employeePositionData) {
    const { tenant_id, name, done_by_id, cost_center_id } =
      employeePositionData;
    const { rows } = await db.query(
      `INSERT INTO "employee_position" (tenant_id, name, done_by_id, cost_center_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tenant_id, name, done_by_id, cost_center_id]
    );
    return rows[0];
  }

  async getById(db, id, tenantId = null) {
    let query = `
      SELECT ep.*, db.name as done_by_name, cc.name as cost_center_name
      FROM "employee_position" ep
      LEFT JOIN "done_by" db ON ep.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON ep.cost_center_id = cc.id
      WHERE ep.id = $1`;
    const params = [id];

    if (tenantId) {
      query += " AND ep.tenant_id = $2";
      params.push(tenantId);
    }

    const { rows } = await db.query(query, params);
    return rows[0];
  }

  async update(db, id, tenantId = null, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);

    if (fields.length === 0) {
      return this.getById(db, id, tenantId);
    }

    const setClause = fields
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");
    let query = `UPDATE "employee_position" SET ${setClause} WHERE id = $${
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
    let query = `DELETE FROM "employee_position" WHERE id = $1`;
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

module.exports = EmployeePositionRepository;
