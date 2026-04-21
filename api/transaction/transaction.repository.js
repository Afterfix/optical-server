class TransactionRepository {
  _buildSelectQuery() {
    return `
      WITH TransactionLedgerDetails AS (
        SELECT
          tl.transaction_id,
          SUM(tl.debit) as debit,
          SUM(tl.credit) as credit,
          MAX(acc.id) as account_id,
          MAX(acc.name) as account_name_from_ledger
        FROM transaction_ledger tl
        JOIN account acc ON tl.account_id = acc.id
        GROUP BY tl.transaction_id
      )
      SELECT
        t.id,
        t.transaction_type,
        t.description,
        t.reference_id,
        t.created_at,
        t.cost_center_id,
        t.done_by_id,
        tld.debit,
        tld.credit,
        CASE WHEN tld.debit > 0 THEN tld.account_name_from_ledger ELSE NULL END as from_account_name,
        CASE WHEN tld.credit > 0 THEN tld.account_name_from_ledger ELSE NULL END as to_account_name,
        cc.name as cost_center_name,
        db.name as done_by_name,
        
        -- Unified Reference Data --
        COALESCE(s.invoice_number, js.invoice_number) as invoice_number,
        COALESCE(p_s.name, p_js.name) as party_name,
        js.item_name,
        et.name as expense_category,
        -----------------------------
        
        tld.account_name_from_ledger as account_name
      FROM transaction t
      JOIN TransactionLedgerDetails tld ON t.id = tld.transaction_id
      
      -- Join Expenses & Expense Type
      LEFT JOIN expenses e ON t.reference_id = e.id AND t.transaction_type = 'expense'
      LEFT JOIN expense_type et ON e.expense_type_id = et.id

      -- Join Sales & Party
      LEFT JOIN sales s ON t.reference_id = s.id AND t.transaction_type = 'sale'
      LEFT JOIN party p_s ON s.party_id = p_s.id

      -- Join Purchase (assuming purchase has party_id)
      LEFT JOIN purchase p ON t.reference_id = p.id AND t.transaction_type = 'purchase'
      
      -- Join Partnership
      LEFT JOIN partnership pt ON t.reference_id = pt.id AND t.transaction_type = 'partnership'
      
      -- Join Job Sheets & Party
      LEFT JOIN party p_js ON js.party_id = p_js.id
      
      LEFT JOIN cost_center cc ON t.cost_center_id = cc.id
      LEFT JOIN done_by db ON t.done_by_id = db.id
    `;
  }

  async createTransaction(client, transactionData) {
    const {
      tenant_id,
      transaction_type,
      reference_id,
      description,
      cost_center_id,
      done_by_id,
    } = transactionData;

    const { rows } = await client.query(
      `
      INSERT INTO transaction 
      (tenant_id, transaction_type, reference_id, description, cost_center_id, done_by_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        tenant_id,
        transaction_type,
        reference_id,
        description,
        cost_center_id,
        done_by_id,
      ]
    );
    return rows[0];
  }

    async getRecentByTenantId(db, tenantId, limit = 5) {
    const query = `
      ${this._buildSelectQuery()}
      WHERE t.tenant_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2
    `;
    const { rows } = await db.query(query, [tenantId, limit]);
    return rows;
  }

  async getById(db, id, tenantId) {
    const query = `
      ${this._buildSelectQuery()}
      WHERE t.id = $1 AND t.tenant_id = $2
    `;
    const { rows } = await db.query(query, [id, tenantId]);
    return rows[0];
  }

  async getAllByTenantId(db, tenantId, filters = {}) {
    const { sort, ...otherFilters } = filters;

    let params = [tenantId];
    let paramIndex = 2;
    let filterClauses = "";

    const filterConfig = {
      transaction_type: { operator: "ILIKE", column: "transaction_type" },
      description: { operator: "ILIKE", column: "description" },
      start_date: { operator: ">=", column: "created_at::date" },
      end_date: { operator: "<=", column: "created_at::date" },
      min_debit: { operator: ">=", column: "debit" },
      max_debit: { operator: "<=", column: "debit" },
      min_credit: { operator: ">=", column: "credit" },
      max_credit: { operator: "<=", column: "credit" },
      account_name: { operator: "ILIKE", column: "account_name" },
      cost_center_name: { operator: "ILIKE", column: "cost_center_name" },
      cost_center_id: { operator: "=", column: "cost_center_id" },
      done_by_id: { operator: "=", column: "done_by_id" },

      invoice_number: {
        operator: "ILIKE",
        column: "COALESCE(s.invoice_number, js.invoice_number)",
      },
      party_name: {
        operator: "ILIKE",
        column: "COALESCE(p_s.name, p_js.name)",
      },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (otherFilters[key] && filterConfig[key]) {
        const { operator, column } = filterConfig[key];
        const value =
          operator === "ILIKE" ? `%${otherFilters[key]}%` : otherFilters[key];
        filterClauses += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    });

    const allowedSortColumns = {
      created_at: "created_at",
      debit: "debit",
      credit: "credit",
      transaction_type: "transaction_type",
      account_name: "account_name",
      cost_center_name: "cost_center_name",
    };

    let sortClause = "ORDER BY created_at DESC";
    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) sortClause = `ORDER BY ${dbColumn} ${direction}`;
    }

    const query = `
      WITH TransactionLedgerDetails AS (
        SELECT
          tl.transaction_id,
          SUM(tl.debit) as debit,
          SUM(tl.credit) as credit,
          MAX(acc.name) as account_name_from_ledger
        FROM transaction_ledger tl
        JOIN account acc ON tl.account_id = acc.id
        WHERE tl.tenant_id = $1
        GROUP BY tl.transaction_id
      ),
      FullTransactionDetails AS (
        SELECT
          t.id,
          t.transaction_type,
          t.description,
          t.reference_id,
          t.created_at,
          t.cost_center_id,
          t.done_by_id,
          tld.debit,
          tld.credit,
          CASE WHEN tld.debit > 0 THEN tld.account_name_from_ledger ELSE NULL END as from_account_name,
          CASE WHEN tld.credit > 0 THEN tld.account_name_from_ledger ELSE NULL END as to_account_name,
          cc.name as cost_center_name,
          db.name as done_by_name,
          
          COALESCE(s.invoice_number, js.invoice_number) as invoice_number,
          COALESCE(p_s.name, p_js.name) as party_name,
          js.item_name,
          et.name as expense_category,
          
          tld.account_name_from_ledger as account_name
        FROM transaction t
        JOIN TransactionLedgerDetails tld ON t.id = tld.transaction_id
        
        LEFT JOIN expenses e ON t.reference_id = e.id AND t.transaction_type = 'expense'
        LEFT JOIN expense_type et ON e.expense_type_id = et.id
        
        LEFT JOIN sales s ON t.reference_id = s.id AND t.transaction_type = 'sale'
        LEFT JOIN party p_s ON s.party_id = p_s.id
        
        LEFT JOIN purchase p ON t.reference_id = p.id AND t.transaction_type = 'purchase'
        LEFT JOIN partnership pt ON t.reference_id = pt.id AND t.transaction_type = 'partnership'
        
        LEFT JOIN party p_js ON js.party_id = p_js.id
        
        LEFT JOIN cost_center cc ON t.cost_center_id = cc.id
        LEFT JOIN done_by db ON t.done_by_id = db.id
        WHERE t.tenant_id = $1
      )
      SELECT * FROM FullTransactionDetails
      WHERE 1=1 ${filterClauses}
      ${sortClause}
    `;

    const { rows } = await db.query(query, params);
    return rows;
  }

  async getPaginatedTransactions(db, tenantId, filters = {}) {
    const { page = 1, page_size = 10, sort, ...otherFilters } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    let params = [tenantId];
    let paramIndex = 2;
    let filterClauses = "";

    const filterConfig = {
      transaction_type: { operator: "ILIKE", column: "transaction_type" },
      description: { operator: "ILIKE", column: "description" },
      start_date: { operator: ">=", column: "created_at::date" },
      end_date: { operator: "<=", column: "created_at::date" },
      min_debit: { operator: ">=", column: "debit" },
      max_debit: { operator: "<=", column: "debit" },
      min_credit: { operator: ">=", column: "credit" },
      max_credit: { operator: "<=", column: "credit" },
      account_name: { operator: "ILIKE", column: "account_name" },
      cost_center_name: { operator: "ILIKE", column: "cost_center_name" },
      cost_center_id: { operator: "=", column: "cost_center_id" },
      done_by_id: { operator: "=", column: "done_by_id" },

      invoice_number: { operator: "ILIKE", column: "invoice_number" },
      party_name: { operator: "ILIKE", column: "party_name" },
    };

    Object.keys(otherFilters).forEach((key) => {
      if (otherFilters[key] && filterConfig[key]) {
        const { operator, column } = filterConfig[key];
        const value =
          operator === "ILIKE" ? `%${otherFilters[key]}%` : otherFilters[key];
        filterClauses += ` AND ${column} ${operator} $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    });

    const allowedSortColumns = {
      created_at: "created_at",
      debit: "debit",
      credit: "credit",
      transaction_type: "transaction_type",
      account_name: "account_name",
      cost_center_name: "cost_center_name",
    };
    let sortClause = "ORDER BY created_at DESC";
    if (sort) {
      const direction = sort.startsWith("-") ? "DESC" : "ASC";
      const columnKey = sort.startsWith("-") ? sort.substring(1) : sort;
      const dbColumn = allowedSortColumns[columnKey];
      if (dbColumn) sortClause = `ORDER BY ${dbColumn} ${direction}`;
    }

    const query = `
      WITH TransactionLedgerDetails AS (
        SELECT
          tl.transaction_id,
          SUM(tl.debit) as debit,
          SUM(tl.credit) as credit,
          MAX(acc.name) as account_name_from_ledger
        FROM transaction_ledger tl
        JOIN account acc ON tl.account_id = acc.id
        WHERE tl.tenant_id = $1
        GROUP BY tl.transaction_id
      ),
      FullTransactionDetails AS (
        SELECT
          t.id,
          t.transaction_type,
          t.description,
          t.reference_id,
          t.created_at,
          t.cost_center_id,
          t.done_by_id,
          tld.debit,
          tld.credit,
          CASE WHEN tld.debit > 0 THEN tld.account_name_from_ledger ELSE NULL END as from_account_name,
          CASE WHEN tld.credit > 0 THEN tld.account_name_from_ledger ELSE NULL END as to_account_name,
          cc.name as cost_center_name,
          db.name as done_by_name,
          
          COALESCE(s.invoice_number, js.invoice_number) as invoice_number,
          COALESCE(p_s.name, p_js.name) as party_name,
          js.item_name,
          et.name as expense_category,

          tld.account_name_from_ledger as account_name
        FROM transaction t
        JOIN TransactionLedgerDetails tld ON t.id = tld.transaction_id
        
        LEFT JOIN expenses e ON t.reference_id = e.id AND t.transaction_type = 'expense'
        LEFT JOIN expense_type et ON e.expense_type_id = et.id

        LEFT JOIN sales s ON t.reference_id = s.id AND t.transaction_type = 'sale'
        LEFT JOIN party p_s ON s.party_id = p_s.id

        LEFT JOIN purchase p ON t.reference_id = p.id AND t.transaction_type = 'purchase'
        LEFT JOIN partnership pt ON t.reference_id = pt.id AND t.transaction_type = 'partnership'
        
        LEFT JOIN party p_js ON js.party_id = p_js.id
        
        LEFT JOIN cost_center cc ON t.cost_center_id = cc.id
        LEFT JOIN done_by db ON t.done_by_id = db.id
        WHERE t.tenant_id = $1
      ),
      FilteredTransactions AS (
          SELECT * FROM FullTransactionDetails
          WHERE 1=1 ${filterClauses}
      )
      SELECT *, COUNT(*) OVER() as total_count
      FROM FilteredTransactions
      ${sortClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const { rows } = await db.query(query, params);

    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const entries = rows.map(({ total_count, ...rest }) => rest);

    return { entries, totalCount };
  }

  async findByReference(client, tenantId, transactionType, referenceId) {
    const { rows } = await client.query(
      `SELECT id FROM transaction WHERE tenant_id = $1 AND transaction_type = $2 AND reference_id = $3`,
      [tenantId, transactionType, referenceId]
    );
    return rows[0];
  }

  async deleteTransactionById(client, id, tenantId) {
    const { rows } = await client.query(
      "DELETE FROM transaction WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId]
    );
    return rows[0];
  }

  async updateTransaction(client, id, tenantId, data) {
    const { description, cost_center_id } = data;
    const { rows } = await client.query(
      `
      UPDATE transaction
      SET description = $1, cost_center_id = $2
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
      `,
      [description, cost_center_id, id, tenantId]
    );
    return rows[0];
  }
}

module.exports = TransactionRepository;
