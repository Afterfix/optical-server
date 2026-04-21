class LedgerRepository {
  _buildQuery(baseQuery, tenantId, filters = {}) {
    const { page, page_size, sort, searchType, searchKey, ...otherFilters } =
      filters;
    let query = baseQuery;
    const params = [tenantId];
    let paramIndex = 2;

    const filterConfig = {
      name: { operator: "ILIKE", column: "l.name", isString: true },
      balance: { operator: "=", column: "l.balance" },
      start_date: { operator: ">=", column: "l.created_at" },
      end_date: { operator: "<=", column: "l.created_at" },
      done_by_id: { operator: "=", column: "l.done_by_id" },
      cost_center_id: { operator: "=", column: "l.cost_center_id" },
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

    const allowedSortColumns = {
      name: "l.name",
      balance: "l.balance",
      done_by: "db.name",
      cost_center: "cc.name",
      created_at: "l.created_at",
    };

    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) {
        query += ` ORDER BY ${dbColumn} ${direction}, l.id DESC`;
      } else {
        query += " ORDER BY l.name ASC, l.id DESC";
      }
    } else {
      query += " ORDER BY l.name ASC, l.id DESC";
    }

    return { query, params, paramIndex };
  }

  async linkToParty(db, ledgerId, partyId, tenantId) {
    const query = `UPDATE party SET ledger_id = $1 WHERE id = $2 AND tenant_id = $3 RETURNING id;`;
    const { rows } = await db.query(query, [ledgerId, partyId, tenantId]);
    return rows[0];
  }

  // --- CRUD Operations (Keep existing) ---
  async adjustBalance(db, ledgerId, tenantId, amount) {
    const query = `UPDATE ledger SET balance = balance + $1 WHERE id = $2 AND tenant_id = $3 RETURNING id, balance;`;
    const { rows } = await db.query(query, [amount, ledgerId, tenantId]);
    return rows[0];
  }

  async create(db, ledgerData) {
    const { tenant_id, name, balance, done_by_id, cost_center_id } = ledgerData;
    const { rows } = await db.query(
      `INSERT INTO ledger (tenant_id, name, balance, done_by_id, cost_center_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenant_id, name, balance || 0, done_by_id || null, cost_center_id || null]
    );
    return rows[0];
  }

  async update(db, id, tenantId, data) {
    data.updated_at = new Date();
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields
      .map((field, index) => `"${field}" = $${index + 1}`)
      .join(", ");
    if (fields.length === 0) return this.getById(db, id, tenantId);
    const query = `UPDATE ledger SET ${setClause} WHERE id = $${
      fields.length + 1
    } AND tenant_id = $${fields.length + 2} RETURNING *`;
    const queryValues = [...values, id, tenantId];
    const { rows } = await db.query(query, queryValues);
    return rows[0];
  }

  async delete(db, id, tenantId) {
    const { rows } = await db.query(
      "DELETE FROM ledger WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId]
    );
    return rows[0];
  }

  async getById(db, id, tenantId) {
    const query = `
        SELECT l.*, db.name as done_by_name, cc.name as cost_center_name,
               p.type as party_type, p.created_at as party_created_at, p.id as party_id
        FROM ledger l
        LEFT JOIN "done_by" db ON l.done_by_id = db.id
        LEFT JOIN "cost_center" cc ON l.cost_center_id = cc.id
        LEFT JOIN "party" p ON l.id = p.ledger_id
        WHERE l.id = $1 AND l.tenant_id = $2;
    `;
    const { rows } = await db.query(query, [id, tenantId]);
    return rows[0];
  }

  async getAllByTenantId(db, tenantId, filters = {}) {
    const baseQuery = `
      SELECT l.*, db.name as done_by_name, cc.name as cost_center_name,
             p.type as party_type, p.created_at as party_created_at, p.id as party_id
      FROM ledger l
      LEFT JOIN "done_by" db ON l.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON l.cost_center_id = cc.id
      LEFT JOIN "party" p ON l.id = p.ledger_id
      WHERE l.tenant_id = $1`;
    const { query, params } = this._buildQuery(baseQuery, tenantId, filters);
    const { rows } = await db.query(query, params);
    return rows;
  }

  async getPaginatedTenantId(db, tenantId, filters = {}) {
    const { page = 1, page_size = 10 } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;
    const baseQuery = `
      SELECT l.*, db.name as done_by_name, cc.name as cost_center_name, 
             p.type as party_type, p.created_at as party_created_at, p.id as party_id,
             COUNT(*) OVER() as total_count 
      FROM ledger l
      LEFT JOIN "done_by" db ON l.done_by_id = db.id
      LEFT JOIN "cost_center" cc ON l.cost_center_id = cc.id
      LEFT JOIN "party" p ON l.id = p.ledger_id
      WHERE l.tenant_id = $1
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

  // --- Helpers ---
  _hasLedgerId(id) {
    return id && id !== "null" && id !== "undefined" && id !== "";
  }

  _buildVoucherFilters(
    baseQuery,
    params,
    filters,
    paramIndex,
    isSpecific = false
  ) {
    let query = baseQuery;

    // **MODIFIED**: Handle combined filter for voucher_type and invoice_type
    if (filters.voucher_type != null && filters.voucher_type !== "") {
      const typeValue = filters.voucher_type;

      // Check if it's a numeric type (0 for Payment, 1 for Receipt)
      if (typeValue === "0" || typeValue === "1") {
        // This filters regular vouchers and ensures no invoice-based vouchers are included
        query += ` AND v.voucher_type = $${paramIndex++} AND NOT EXISTS (SELECT 1 FROM voucher_transactions vt WHERE vt.voucher_id = v.id)`;
        params.push(typeValue);
      } else {
        // It's a string type (SALE, PURCHASE, etc.), so filter on the transactions table
        query += ` AND EXISTS (SELECT 1 FROM voucher_transactions vt WHERE vt.voucher_id = v.id AND vt.invoice_type = $${paramIndex++})`;
        params.push(typeValue);
      }
    }

    const filterConfig = {
      voucher_no: { operator: "ILIKE", column: "v.voucher_no", isString: true },
      description: {
        operator: "ILIKE",
        column: "v.description",
        isString: true,
      },
      amount: { operator: "=", column: "v.amount" },
      from_ledger_name: {
        operator: "ILIKE",
        column: "fl.name",
        isString: true,
      },
      to_ledger_name: { operator: "ILIKE", column: "tl.name", isString: true },
    };

    Object.keys(filters).forEach((key) => {
      // **MODIFIED**: Added 'voucher_type' to skip list as it's handled above
      if (
        [
          "page",
          "page_size",
          "sort",
          "start_date",
          "end_date",
          "ledger_id",
          "ledgerId",
          "voucher_type",
        ].includes(key)
      )
        return;

      if (filters[key] != null && filters[key] !== "" && filterConfig[key]) {
        if (
          isSpecific &&
          (key === "from_ledger_name" || key === "to_ledger_name")
        )
          return;

        const { operator, column, isString } = filterConfig[key];
        let value = filters[key];
        if (isString) {
          value = `%${value}%`;
        }
        query += ` AND ${column} ${operator} $${paramIndex++}`;
        params.push(value);
      }
    });

    return { query, paramIndex };
  }

  _appendVoucherSort(sql, sort) {
    if (!sort) return sql + ` ORDER BY v.date DESC, v.id DESC`;

    const direction = sort.startsWith("-") ? "DESC" : "ASC";
    const key = sort.startsWith("-") ? sort.substring(1) : sort;

    const sortMap = {
      amount: "v.amount",
      date: "v.date",
      voucher_no: "v.voucher_no",
      // **MODIFIED**: Sort by the text-based `invoice_type` alias for better user experience
      voucher_type: "invoice_type",
      description: "v.description",
      from_ledger_name: "fl.name",
      to_ledger_name: "tl.name",
    };

    if (sortMap[key]) {
      return (
        sql + ` ORDER BY ${sortMap[key]} ${direction} NULLS LAST, v.id DESC`
      );
    }

    return sql + ` ORDER BY v.date DESC, v.id DESC`;
  }

  // ==========================================
  //      TRANSACTIONAL REPORT METHODS
  // ==========================================

  // 1. Get All Vouchers (General View)
  async getAllVouchers(db, tenantId, filters = {}) {
    const { start_date, end_date, sort, page = 1, page_size = 10 } = filters;

    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    let baseQuery = `
        FROM voucher v
        LEFT JOIN ledger fl ON v.from_ledger_id = fl.id
        LEFT JOIN ledger tl ON v.to_ledger_id = tl.id
        LEFT JOIN "done_by" db ON v.done_by_id = db.id
        LEFT JOIN "cost_center" cc ON v.cost_center_id = cc.id
        WHERE v.tenant_id = $1
    `;

    const params = [tenantId];
    let paramIndex = 2;

    if (start_date && start_date !== "null") {
      baseQuery += ` AND v.date >= $${paramIndex++}`;
      params.push(start_date);
    }
    if (end_date && end_date !== "null") {
      baseQuery += ` AND v.date <= $${paramIndex++}`;
      params.push(end_date);
    }

    const built = this._buildVoucherFilters(
      baseQuery,
      params,
      filters,
      paramIndex,
      false
    );
    baseQuery = built.query;
    paramIndex = built.paramIndex;

    let query = `
        SELECT 
            v.id, v.date, v.voucher_no, v.voucher_type, v.amount, v.description,
            fl.name as from_ledger_name,
            tl.name as to_ledger_name,
            db.name as done_by_name,
            cc.name as cost_center_name,
            (SELECT STRING_AGG(DISTINCT invoice_type, ', ') FROM voucher_transactions WHERE voucher_id = v.id) as invoice_type,
            (SELECT STRING_AGG(DISTINCT invoice_id::text, ', ') FROM voucher_transactions WHERE voucher_id = v.id) as invoice_no
        ${baseQuery}
    `;

    query = this._appendVoucherSort(query, sort);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const queryParams = [...params, limit, offset];

    const countQuery = `SELECT COUNT(*) as total_count ${baseQuery}`;

    const [dataRes, countRes] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, params),
    ]);

    return {
      opening_balance: 0,
      data: dataRes.rows,
      total_count: parseInt(countRes.rows[0].total_count, 10),
    };
  }

  // 2. Get Specific Ledger Report (Detailed View)
  async getSpecificLedgerReport(db, tenantId, filters = {}) {
    const { ledger_id, start_date, end_date, sort } = filters;

    let openingBalanceQuery = `
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN to_ledger_id = $1 THEN amount 
            WHEN from_ledger_id = $1 THEN -amount 
            ELSE 0 
          END
        ), 0) as opening_balance
      FROM voucher
      WHERE tenant_id = $2 
      AND (to_ledger_id = $1 OR from_ledger_id = $1)
    `;

    const openingParams = [ledger_id, tenantId];
    if (start_date && start_date !== "null") {
      openingBalanceQuery += ` AND date < $3`;
      openingParams.push(start_date);
    }

    const openingRes = await db.query(openingBalanceQuery, openingParams);
    const openingBalance = parseFloat(openingRes.rows[0].opening_balance);

    let baseQuery = `
      FROM voucher v
      LEFT JOIN ledger fl ON v.from_ledger_id = fl.id
      LEFT JOIN ledger tl ON v.to_ledger_id = tl.id
      WHERE v.tenant_id = $2
      AND (v.to_ledger_id = $1 OR v.from_ledger_id = $1)
    `;

    const params = [ledger_id, tenantId];
    let paramIndex = 3;

    if (start_date && start_date !== "null") {
      baseQuery += ` AND v.date >= $${paramIndex++}`;
      params.push(start_date);
    }
    if (end_date && end_date !== "null") {
      baseQuery += ` AND v.date <= $${paramIndex++}`;
      params.push(end_date);
    }

    const built = this._buildVoucherFilters(
      baseQuery,
      params,
      filters,
      paramIndex,
      true
    );
    baseQuery = built.query;
    paramIndex = built.paramIndex;

    if (filters.particular_name) {
      baseQuery += ` AND (
         CASE 
            WHEN v.to_ledger_id = $1 THEN fl.name 
            ELSE tl.name 
         END
       ) ILIKE $${paramIndex++}`;
      params.push(`%${filters.particular_name}%`);
    }

    let query = `
      SELECT 
          v.id, v.date, v.voucher_no, v.voucher_type, v.amount, v.description,
          CASE WHEN v.to_ledger_id = $1 THEN v.amount ELSE 0 END as debit,
          CASE WHEN v.from_ledger_id = $1 THEN v.amount ELSE 0 END as credit,
          CASE 
            WHEN v.to_ledger_id = $1 THEN fl.name 
            ELSE tl.name 
          END as particular_name,
          (SELECT STRING_AGG(DISTINCT invoice_type, ', ') FROM voucher_transactions WHERE voucher_id = v.id) as invoice_type,
          (SELECT STRING_AGG(DISTINCT invoice_id::text, ', ') FROM voucher_transactions WHERE voucher_id = v.id) as invoice_no,
          (
            SELECT
                CASE
                    WHEN vt.invoice_type = 'SALE' THEN s.total_amount - s.paid_amount
                    WHEN vt.invoice_type = 'PURCHASE' THEN p.total_amount - p.paid_amount
                    WHEN vt.invoice_type = 'SALERETURN' THEN sr.total_refund_amount - sr.refunded_amount
                    WHEN vt.invoice_type = 'PURCHASERETURN' THEN pr.total_refund_amount - pr.refunded_amount
                    ELSE NULL
                END
            FROM voucher_transactions vt
            LEFT JOIN sales s ON vt.invoice_type = 'SALE' AND s.id = vt.invoice_id::integer
            LEFT JOIN purchase p ON vt.invoice_type = 'PURCHASE' AND p.id = vt.invoice_id::integer
            LEFT JOIN sale_return sr ON vt.invoice_type = 'SALERETURN'
            LEFT JOIN purchase_return pr ON vt.invoice_type = 'PURCHASERETURN'
            WHERE vt.voucher_id = v.id
            LIMIT 1
          ) as invoice_balance
      ${baseQuery}
    `;

    query = this._appendVoucherSort(query, sort);

    const { page = 1, page_size = 10 } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const queryParams = [...params, limit, offset];

    const [dataRes, countRes] = await Promise.all([
      db.query(query, queryParams),
      db.query(`SELECT COUNT(*) as total_count ${baseQuery}`, params),
    ]);

    const rows = dataRes.rows;
    let currentBalance = openingBalance;

    const data = rows.map((row) => {
      const debit = parseFloat(row.debit);
      const credit = parseFloat(row.credit);
      currentBalance = currentBalance + debit - credit;
      return {
        ...row,
        debit,
        credit,
        balance:
          row.invoice_balance !== null &&
          typeof row.invoice_balance !== "undefined"
            ? parseFloat(row.invoice_balance)
            : currentBalance,
        type: debit > 0 ? "Debit" : "Credit",
      };
    });

    return {
      opening_balance: openingBalance,
      data: data,
      total_count: parseInt(countRes.rows[0].total_count, 10),
    };
  }

  // 3. Dispatcher for Transactional Report
  async getReport(db, tenantId, filters = {}) {
    const { ledger_id } = filters;
    if (this._hasLedgerId(ledger_id)) {
      return this.getSpecificLedgerReport(db, tenantId, filters);
    } else {
      return this.getAllVouchers(db, tenantId, filters);
    }
  }

  // ... (Keep remaining monthly report methods as they are) ...
  async getMonthlyReport(db, tenantId, filters = {}) {
    const { ledger_id } = filters;
    if (this._hasLedgerId(ledger_id)) {
      return this._getSpecificLedgerMonthly(db, tenantId, filters);
    } else {
      return this._getAllLedgersSummary(db, tenantId, filters);
    }
  }

  async _getSpecificLedgerMonthly(db, tenantId, filters) {
    const { ledger_id, start_date, end_date, sort } = filters;
    let query = `
      SELECT 
          TO_CHAR(date, 'YYYY-MM') as month_key,
          TO_CHAR(date, 'FMMonth YYYY') as label,
          SUM(CASE WHEN to_ledger_id = $1 THEN amount ELSE 0 END) as total_debit,
          SUM(CASE WHEN from_ledger_id = $1 THEN amount ELSE 0 END) as total_credit
      FROM voucher
      WHERE tenant_id = $2
      AND (to_ledger_id = $1 OR from_ledger_id = $1)
    `;
    const params = [ledger_id, tenantId];
    let paramIndex = 3;
    if (start_date && start_date !== "null") {
      query += ` AND date >= $${paramIndex++}`;
      params.push(start_date);
    }
    if (end_date && end_date !== "null") {
      query += ` AND date <= $${paramIndex++}`;
      params.push(end_date);
    }
    query += ` GROUP BY TO_CHAR(date, 'YYYY-MM'), TO_CHAR(date, 'FMMonth YYYY') ORDER BY month_key ASC`;
    const { rows } = await db.query(query, params);
    let openingBalanceQuery = `
      SELECT COALESCE(SUM(CASE WHEN to_ledger_id = $1 THEN amount WHEN from_ledger_id = $1 THEN -amount ELSE 0 END), 0) as opening_balance
      FROM voucher WHERE tenant_id = $2 AND (to_ledger_id = $1 OR from_ledger_id = $1)
    `;
    const opParams = [ledger_id, tenantId];
    if (start_date && start_date !== "null") {
      openingBalanceQuery += ` AND date < $3`;
      opParams.push(start_date);
    }
    const opRes = await db.query(openingBalanceQuery, opParams);
    let runningBalance = parseFloat(opRes.rows[0].opening_balance);
    let calculatedRows = rows.map((row) => {
      const debit = parseFloat(row.total_debit);
      const credit = parseFloat(row.total_credit);
      runningBalance = runningBalance + debit - credit;
      return {
        ...row,
        total_debit: debit,
        total_credit: credit,
        balance: runningBalance,
      };
    });
    if (sort) {
      const isDesc = sort.startsWith("-");
      const key = sort.replace("-", "");
      if (
        key === "total_debit" ||
        key === "total_credit" ||
        key === "balance"
      ) {
        calculatedRows.sort((a, b) =>
          isDesc ? b[key] - a[key] : a[key] - b[key]
        );
      } else if (key === "label") {
        calculatedRows.sort((a, b) =>
          isDesc
            ? b.label.localeCompare(a.label)
            : a.label.localeCompare(b.label)
        );
      }
    }
    return calculatedRows;
  }

  async _getAllLedgersSummary(db, tenantId, filters) {
    const {
      start_date,
      end_date,
      sort,
      label,
      total_debit,
      total_credit,
      balance,
    } = filters;
    const params = [tenantId];
    let paramIndex = 2;
    let dateClause = "";
    if (start_date && start_date !== "null") {
      dateClause += ` AND v.date >= $${paramIndex++}`;
      params.push(start_date);
    }
    if (end_date && end_date !== "null") {
      dateClause += ` AND v.date <= $${paramIndex++}`;
      params.push(end_date);
    }
    let query = `
      WITH summary AS (
        SELECT 
            l.id as ledger_id, l.name as label, 
            COALESCE(SUM(CASE WHEN v.to_ledger_id = l.id THEN v.amount ELSE 0 END), 0) as total_debit, 
            COALESCE(SUM(CASE WHEN v.from_ledger_id = l.id THEN v.amount ELSE 0 END), 0) as total_credit
        FROM ledger l
        LEFT JOIN voucher v ON (v.to_ledger_id = l.id OR v.from_ledger_id = l.id) AND v.tenant_id = $1 ${dateClause}
        WHERE l.tenant_id = $1
        GROUP BY l.id, l.name
      ), final_data AS ( SELECT *, (total_debit - total_credit) as balance FROM summary ) SELECT * FROM final_data WHERE 1=1
    `;
    if (label) {
      query += ` AND label ILIKE $${paramIndex++}`;
      params.push(`%${label}%`);
    }
    if (total_debit) {
      query += ` AND total_debit = $${paramIndex++}`;
      params.push(total_debit);
    }
    if (total_credit) {
      query += ` AND total_credit = $${paramIndex++}`;
      params.push(total_credit);
    }
    if (balance) {
      query += ` AND balance = $${paramIndex++}`;
      params.push(balance);
    }
    if (sort) {
      const isDesc = sort.startsWith("-");
      const key = sort.replace("-", "");
      const map = {
        label: "label",
        total_debit: "total_debit",
        total_credit: "total_credit",
        balance: "balance",
      };
      query += ` ORDER BY ${map[key] || "label"} ${isDesc ? "DESC" : "ASC"}`;
    } else {
      query += ` ORDER BY label ASC`;
    }
    const { rows } = await db.query(query, params);
    return rows;
  }
}

module.exports = LedgerRepository;
