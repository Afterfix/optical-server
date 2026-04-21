class PartnerRepository {
  constructor(accountRepository) {
    this.accountRepository = accountRepository;
  }

  async getAllByTenantId(db, tenantId, filters = {}) {
    let query = `
            SELECT p.*, db.name as done_by_name, cc.name as cost_center_name
            FROM partner p
            LEFT JOIN "done_by" db ON p.done_by_id = db.id
            LEFT JOIN "cost_center" cc ON p.cost_center_id = cc.id
        `;
    const params = [];

    if (tenantId) {
      query += " WHERE p.tenant_id = $1";
      params.push(tenantId);
    }

    const { rows } = await db.query(query, params);
    return rows;
  }

  async create(db, partnerData) {
    const {
      tenant_id,
      name,
      phone,
      address,
      addAccount,
      accounts,
      done_by_id,
      cost_center_id,
    } = partnerData;

    // Fixed: Removed db.connect() and internal BEGIN/COMMIT.
    // The transaction is handled by the PartnerService.
    const partnerRes = await db.query(
      `INSERT INTO partner (tenant_id, name, phone, address, done_by_id, cost_center_id)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING *`,
      [tenant_id, name, phone, address, done_by_id, cost_center_id]
    );
    const newPartner = partnerRes.rows[0];

    if (addAccount && accounts && accounts.length > 0) {
      await Promise.all(
        accounts.map((account) => {
          const accountData = {
            ...account,
            tenant_id,
            partner_id: newPartner.id,
          };
          // Pass db directly to accountRepository.create
          return this.accountRepository.create(db, accountData);
        })
      );
    }

    return newPartner;
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

    let query = `
            SELECT p.*, db.name as done_by_name, cc.name as cost_center_name, COUNT(*) OVER() as total_count
            FROM partner p
            LEFT JOIN "done_by" db ON p.done_by_id = db.id
            LEFT JOIN "cost_center" cc ON p.cost_center_id = cc.id
        `;
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (tenantId) {
      conditions.push(`p.tenant_id = $${paramIndex++}`);
      params.push(tenantId);
    }

    const filterConfig = {
      name: { operator: "ILIKE", column: "p.name" },
      phone: { operator: "ILIKE", column: "p.phone" },
      address: { operator: "ILIKE", column: "p.address" },
      done_by_id: { operator: "=", column: "p.done_by_id" },
      cost_center_id: { operator: "=", column: "p.cost_center_id" },
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
        conditions.push(`${column} ${operator} $${paramIndex++}`);
        params.push(value);
      }
    });

    if (
      searchType &&
      searchKey != null &&
      searchKey !== "" &&
      filterConfig[searchType]
    ) {
      const { operator, column } = filterConfig[searchType];
      conditions.push(`${column} ${operator} $${paramIndex++}`);
      params.push(`%${searchKey}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const allowedSortColumns = {
      name: "p.name",
      phone: "p.phone",
      created_at: "p.created_at",
      done_by: "db.name",
      cost_center: "cc.name",
    };
    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) {
        query += ` ORDER BY ${dbColumn} ${direction}, p.id DESC`;
      } else {
        query += " ORDER BY p.name ASC, p.id DESC";
      }
    } else {
      query += " ORDER BY p.name ASC, p.id DESC";
    }

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const { rows } = await db.query(query, params);

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const partners = rows.map(({ total_count, ...rest }) => rest);

    return { partners, totalCount };
  }

  async getById(db, id, tenantId) {
    const query = `
            SELECT
                p.*,
                db.name as done_by_name,
                cc.name as cost_center_name,
                COALESCE(
                    (SELECT json_agg(
                        json_build_object(
                            'id', a.id, 
                            'name', a.name, 
                            'type', a.type,
                            'description', a.description, 
                            'created_at', a.created_at, 
                            'balance', (
                                SELECT COALESCE(SUM(credit) - SUM(debit), 0) 
                                FROM transaction_ledger tl 
                                WHERE tl.account_id = a.id
                            )
                        ) ORDER BY a.created_at DESC
                    ) FROM account a WHERE a.partner_id = p.id), '[]'::json
                ) AS accounts
            FROM partner p
            LEFT JOIN "done_by" db ON p.done_by_id = db.id
            LEFT JOIN "cost_center" cc ON p.cost_center_id = cc.id
            WHERE p.id = $1 AND p.tenant_id = $2;
        `;
    const { rows } = await db.query(query, [id, tenantId]);
    return rows[0];
  }

  async update(db, id, tenantId, data) {
    const allowedUpdates = [
      "name",
      "phone",
      "address",
      "done_by_id",
      "cost_center_id",
    ];
    const fieldsToUpdate = {};

    allowedUpdates.forEach((key) => {
      if (data[key] !== undefined) {
        fieldsToUpdate[key] = data[key];
      }
    });

    const fields = Object.keys(fieldsToUpdate);
    if (fields.length === 0) {
      return this.getById(db, id, tenantId);
    }

    const values = Object.values(fieldsToUpdate);
    const setClause = fields
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");

    const query = `
            UPDATE partner SET ${setClause}
            WHERE id = $${fields.length + 1} AND tenant_id = $${
      fields.length + 2
    }
            RETURNING *
        `;
    const queryValues = [...values, id, tenantId];

    const { rows } = await db.query(query, queryValues);
    return rows[0];
  }

  async delete(db, id, tenantId) {
    const { rows } = await db.query(
      "DELETE FROM partner WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId]
    );
    return rows[0];
  }
}

module.exports = PartnerRepository;