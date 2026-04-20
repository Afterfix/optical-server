class PartnershipRepository {
  // REMOVED: constructor(db)

  // ADDED: db param
  async getAllByTenantId(db, tenantId, filters = {}) {
    const { page, page_size, sort, searchType, searchKey, ...otherFilters } =
      filters;

    let query = `
      SELECT
        ps.*,
        p.name as partner_name,
        p.phone as partner_phone,
        db.name AS done_by_name,
        cc.name AS cost_center_name
      FROM partnership ps
      LEFT JOIN partner p ON ps.partner_id = p.id
      LEFT JOIN "done_by" db ON ps.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON ps.cost_center_id = cc.id
      WHERE ps.tenant_id = $1
    `;

    const params = [tenantId];
    let paramIndex = 2;

    const filterConfig = {
      partner_name: { operator: "ILIKE", column: "p.name", isString: true },
      from_account: { operator: "=", column: "ps.from_account" },
      contribution_payment_status: {
        operator: "=",
        column: "ps.contribution_payment_status",
      },
      profit_share_payment_status: {
        operator: "ILIKE",
        column: "ps.profit_share_payment_status",
        isString: true,
      },
      partner_id: { operator: "=", column: "ps.partner_id" },
      contribution: { operator: "=", column: "ps.contribution" },
      contribution_payment_paid: {
        operator: "=",
        column: "ps.contribution_payment_paid",
      },
      profit_share: { operator: "=", column: "ps.profit_share" },
      min_contribution: { operator: ">=", column: "ps.contribution" },
      max_contribution: { operator: "<=", column: "ps.contribution" },
      min_profit_share: { operator: ">=", column: "ps.profit_share" },
      max_profit_share: { operator: "<=", column: "ps.profit_share" },
      done_by_id: { operator: "=", column: "ps.done_by_id" },
      cost_center_id: { operator: "=", column: "ps.cost_center_id" },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== "" &&
        filterConfig[key]
      ) {
        const { operator, column, isString } = filterConfig[key];
        let value = otherFilters[key];
        if (isString) value = `%${value}%`;
        query += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    });

    if (searchType && searchKey != null && searchKey !== "") {
      const searchConfig = {
        partner_name: { operator: "ILIKE", column: "p.name" },
      };
      if (searchConfig[searchType]) {
        const { operator, column } = searchConfig[searchType];
        query += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(`%${searchKey}%`);
        paramIndex++;
      }
    }

    const allowedSortColumns = {
      created_at: "ps.created_at",
      contribution: "ps.contribution",
      contribution_payment_paid: "ps.contribution_payment_paid",
      contribution_payment_status: "ps.contribution_payment_status",
      profit_share: "ps.profit_share",
      partner_name: "p.name",
      done_by: "db.name",
      cost_center: "cc.name",
    };

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) {
        query += ` ORDER BY ${dbColumn} ${direction}, ps.id DESC`;
      } else {
        query += " ORDER BY ps.created_at DESC, ps.id DESC";
      }
    } else {
      query += " ORDER BY ps.created_at DESC, ps.id DESC";
    }

    const { rows } = await db.query(query, params);
    return rows;
  }

  // ADDED: db param
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

    const fromAndJoins = `
        FROM partnership ps
        LEFT JOIN partner p ON ps.partner_id = p.id
        LEFT JOIN "done_by" db ON ps.done_by_id = db.id
        LEFT JOIN "cost_center" cc ON ps.cost_center_id = cc.id
    `;
    let whereClause = ` WHERE ps.tenant_id = $1 `;
    const params = [tenantId];
    let paramIndex = 2;

    const filterConfig = {
      partner_name: { operator: "ILIKE", column: "p.name", isString: true },
      from_account: { operator: "=", column: "ps.from_account" },
      contribution_payment_status: {
        operator: "=",
        column: "ps.contribution_payment_status",
      },
      profit_share_payment_status: {
        operator: "ILIKE",
        column: "ps.profit_share_payment_status",
        isString: true,
      },
      partner_id: { operator: "=", column: "ps.partner_id" },
      contribution: { operator: "=", column: "ps.contribution" },
      contribution_payment_paid: {
        operator: "=",
        column: "ps.contribution_payment_paid",
      },
      profit_share: { operator: "=", column: "ps.profit_share" },
      min_contribution: { operator: ">=", column: "ps.contribution" },
      max_contribution: { operator: "<=", column: "ps.contribution" },
      min_profit_share: { operator: ">=", column: "ps.profit_share" },
      max_profit_share: { operator: "<=", column: "ps.profit_share" },
      done_by_id: { operator: "=", column: "ps.done_by_id" },
      cost_center_id: { operator: "=", column: "ps.cost_center_id" },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (
        otherFilters[key] != null &&
        otherFilters[key] !== "" &&
        filterConfig[key]
      ) {
        const { operator, column, isString } = filterConfig[key];
        let value = otherFilters[key];
        if (isString) value = `%${value}%`;
        whereClause += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    });

    if (searchType && searchKey != null && searchKey !== "") {
      const searchConfig = {
        partner_name: { operator: "ILIKE", column: "p.name" },
      };
      if (searchConfig[searchType]) {
        const { operator, column } = searchConfig[searchType];
        whereClause += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(`%${searchKey}%`);
        paramIndex++;
      }
    }

    const aggregationQuery = `SELECT COALESCE(SUM(ps.contribution), 0) as total_contribution, COALESCE(SUM(ps.contribution_payment_paid), 0) as total_contribution_paid ${fromAndJoins} ${whereClause}`;
    let mainQuery = `SELECT ps.*, p.name as partner_name, p.phone as partner_phone, db.name AS done_by_name, cc.name AS cost_center_name, COUNT(*) OVER() as total_count ${fromAndJoins} ${whereClause}`;

    const allowedSortColumns = {
      created_at: "ps.created_at",
      contribution: "ps.contribution",
      contribution_payment_paid: "ps.contribution_payment_paid",
      contribution_payment_status: "ps.contribution_payment_status",
      profit_share: "ps.profit_share",
      partner_name: "p.name",
      done_by: "db.name",
      cost_center: "cc.name",
    };

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) {
        mainQuery += ` ORDER BY ${dbColumn} ${direction}, ps.id DESC`;
      } else {
        mainQuery += " ORDER BY ps.created_at DESC, ps.id DESC";
      }
    } else {
      mainQuery += " ORDER BY ps.created_at DESC, ps.id DESC";
    }

    mainQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const mainQueryParams = [...params, limit, offset];

    const [mainResult, aggregationResult] = await Promise.all([
      db.query(mainQuery, mainQueryParams),
      db.query(aggregationQuery, params),
    ]);

    const { rows } = mainResult;
    const aggregationData = aggregationResult.rows[0];

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const partnerships = rows.map(({ total_count, ...rest }) => rest);

    return {
      partnerships,
      totalCount,
      total_contribution: aggregationData.total_contribution,
      total_contribution_paid: aggregationData.total_contribution_paid,
    };
  }

  // ADDED: db param
  async getById(db, id, tenantId) {
    const { rows } = await db.query(
      `
      SELECT 
        ps.*,
        p.name AS partner_name,
        p.phone AS partner_phone,
        db.name AS done_by_name,
        cc.name AS cost_center_name
      FROM partnership ps
      LEFT JOIN partner p ON ps.partner_id = p.id
      LEFT JOIN "done_by" db ON ps.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON ps.cost_center_id = cc.id
      WHERE ps.id = $1 AND ps.tenant_id = $2
    `,
      [id, tenantId]
    );
    return rows[0];
  }

  // ADDED: db param
  async create(db, data) {
    const {
      tenant_id,
      partner_id,
      contribution,
      profit_share,
      from_account,
      contribution_payment_status,
      contribution_payment_paid,
      profit_share_payment_status,
      done_by_id,
      cost_center_id,
    } = data;
    const query = `
      INSERT INTO partnership (
        tenant_id, partner_id, contribution, profit_share, from_account, 
        contribution_payment_status, contribution_payment_paid, 
        profit_share_payment_status, done_by_id, cost_center_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const { rows } = await db.query(query, [
      tenant_id,
      partner_id,
      contribution,
      profit_share,
      from_account,
      contribution_payment_status,
      contribution_payment_paid,
      profit_share_payment_status,
      done_by_id,
      cost_center_id,
    ]);
    return rows[0];
  }

  // ADDED: db param
  async update(db, id, tenantId, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");

    if (fields.length === 0) return this.getById(db, id, tenantId);

    const query = `
      UPDATE partnership SET ${setClause}
      WHERE id = $${fields.length + 1} AND tenant_id = $${fields.length + 2}
      RETURNING *
    `;
    const queryValues = [...values, id, tenantId];

    const { rows } = await db.query(query, queryValues);
    return rows[0];
  }

  // ADDED: db param
  async delete(db, id, tenantId) {
    const { rows } = await db.query(
      "DELETE FROM partnership WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId]
    );
    return rows[0];
  }
}

module.exports = PartnershipRepository;