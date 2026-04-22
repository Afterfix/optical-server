class ModeOfPaymentRepository {
  async create(db, modeOfPaymentData) {
    const { tenant_id, name, done_by_id, cost_center_id, default_ledger_id } = modeOfPaymentData;
    const { rows } = await db.query(
      `INSERT INTO mode_of_payment (tenant_id, name, done_by_id, cost_center_id, default_ledger_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenant_id, name, done_by_id, cost_center_id, default_ledger_id || null],
    );
    return rows[0];
  }

  async getAll(db, tenantId, filters = {}) {
    const { sort, searchType, searchKey, ...otherFilters } = filters;

    let query = `
      SELECT 
        mop.*, 
        db.name as done_by_name, 
        cc.name as cost_center_name,
        l.name as default_ledger_name
      FROM mode_of_payment mop 
      LEFT JOIN "done_by" db ON mop.done_by_id = db.id 
      LEFT JOIN "cost_center" cc ON mop.cost_center_id = cc.id 
      LEFT JOIN "ledger" l ON mop.default_ledger_id = l.id
    `;

    const params = [];
    let paramIndex = 1;
    const whereClauses = [];

    if (tenantId) {
      whereClauses.push(`mop.tenant_id = $${paramIndex++}`);
      params.push(tenantId);
    }

    const filterConfig = {
      name: { operator: "ILIKE", column: "mop.name" },
      done_by_id: { operator: "=", column: "mop.done_by_id" },
      cost_center_id: { operator: "=", column: "mop.cost_center_id" },
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

    const searchConfig = {
      name: { operator: "ILIKE", column: "mop.name" },
      done_by_name: { operator: "ILIKE", column: "db.name" },
      cost_center_name: { operator: "ILIKE", column: "cc.name" },
    };

    if (
      searchType &&
      searchKey != null &&
      searchKey !== "" &&
      searchConfig[searchType]
    ) {
      const { operator } = searchConfig[searchType];
      let value = operator === "ILIKE" ? `%${searchKey}%` : searchKey;

      if (searchType === "name") {
        whereClauses.push(`
          (mop.name ILIKE $${paramIndex} OR db.name ILIKE $${paramIndex} OR cc.name ILIKE $${paramIndex})
        `);
        params.push(value);
        paramIndex++;
      } else {
        const { column } = searchConfig[searchType];
        whereClauses.push(`${column} ${operator} $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    let finalOrderBy = "mop.id ASC";
    if (sort) {
      const [field, direction] = sort.split(":");
      const sortDir = direction?.toLowerCase() === "desc" ? "DESC" : "ASC";

      const sortMap = {
        id: "mop.id",
        name: "mop.name",
        done_by: "db.name",
        cost_center: "cc.name",
        created_at: "mop.created_at",
      };

      if (sortMap[field]) {
        finalOrderBy = `${sortMap[field]} ${sortDir}`;
      }
    }

    query += ` ORDER BY ${finalOrderBy}`;

    const { rows } = await db.query(query, params);
    return rows;
  }

  async getById(db, id, tenantId) {
    const query = `SELECT mop.*, db.name as done_by_name, cc.name as cost_center_name, l.name as default_ledger_name FROM mode_of_payment mop LEFT JOIN "done_by" db ON mop.done_by_id = db.id LEFT JOIN "cost_center" cc ON mop.cost_center_id = cc.id LEFT JOIN "ledger" l ON mop.default_ledger_id = l.id WHERE mop.id = $1 AND mop.tenant_id = $2`;
    const { rows } = await db.query(query, [id, tenantId]);
    return rows[0];
  }

  async update(db, id, tenantId, data) {
    const fieldsToUpdate = {};
    if (data.name) fieldsToUpdate.name = data.name;
    if (data.done_by_id !== undefined)
      fieldsToUpdate.done_by_id = data.done_by_id;
    if (data.cost_center_id !== undefined)
      fieldsToUpdate.cost_center_id = data.cost_center_id;
    if (data.default_ledger_id !== undefined)
      fieldsToUpdate.default_ledger_id = data.default_ledger_id;

    const fields = Object.keys(fieldsToUpdate);
    if (fields.length === 0) return this.getById(db, id, tenantId);

    const values = Object.values(fieldsToUpdate);
    const setClause = fields
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");

    const query = `
        UPDATE mode_of_payment SET ${setClause}
        WHERE id = $${fields.length + 1} AND tenant_id = $${fields.length + 2}
        RETURNING *
    `;
    const { rows } = await db.query(query, [...values, id, tenantId]);
    return rows[0];
  }

  async delete(db, id, tenantId) {
    const { rows } = await db.query(
      "DELETE FROM mode_of_payment WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId],
    );
    return rows[0];
  }
}

module.exports = ModeOfPaymentRepository;
