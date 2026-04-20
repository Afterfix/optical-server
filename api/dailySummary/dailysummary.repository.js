class DailySummaryRepository {
  // REMOVED: constructor(db)

  _buildDateFilters(query, params, dateColumn, filters) {
    const effectiveFilters = { ...filters };

    // Default to last 30 days if no date provided
    if (!effectiveFilters.start_date && !effectiveFilters.end_date) {
      const today = new Date();
      const endDate = today.toISOString().split("T")[0];
      const startDate = new Date(new Date().setDate(today.getDate() - 29))
        .toISOString()
        .split("T")[0];

      effectiveFilters.start_date = startDate;
      effectiveFilters.end_date = endDate;
    }

    let paramIndex = params.length + 1;

    if (effectiveFilters.start_date) {
      // Cast to date for comparison to ignore time
      query += ` AND ${dateColumn}::date >= $${paramIndex++}`;
      params.push(effectiveFilters.start_date);
    }
    if (effectiveFilters.end_date) {
      query += ` AND ${dateColumn}::date <= $${paramIndex++}`;
      params.push(effectiveFilters.end_date);
    }

    return { query, params };
  }

  // ADDED: db param
  async getExpenses(db, tenantId, filters) { 
    let { query, params } = this._buildDateFilters(
      `SELECT
          TO_CHAR(date, 'YYYY-MM-DD') AS summary_date,
          COUNT(*) AS expense_count,
          COALESCE(SUM(amount), 0) AS total_amount,
          COALESCE(SUM(amount_paid), 0) AS total_paid,
          COALESCE(SUM(amount - amount_paid), 0) AS total_balance
        FROM expenses 
        WHERE tenant_id = $1`,
      [tenantId], 
      "date", 
      filters
    );
    query += ` GROUP BY summary_date ORDER BY summary_date`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  // ADDED: db param
  async getSales(db, tenantId, filters) { 
    let { query, params } = this._buildDateFilters(
      `SELECT
          TO_CHAR(date, 'YYYY-MM-DD') AS summary_date,
          COUNT(*) AS sale_count,
          COALESCE(SUM(total_amount), 0) AS total_amount,
          COALESCE(SUM(paid_amount), 0) AS total_received,
          COALESCE(SUM(total_amount - paid_amount), 0) AS total_pending
        FROM sales
        WHERE tenant_id = $1`, 
      [tenantId], 
      "date",
      filters
    );
    query += ` GROUP BY summary_date ORDER BY summary_date`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  // ADDED: db param
  async getPurchases(db, tenantId, filters) { 
    let { query, params } = this._buildDateFilters(
      `SELECT
          TO_CHAR(date, 'YYYY-MM-DD') AS summary_date,
          COUNT(*) AS purchase_count,
          COALESCE(SUM(total_amount), 0) AS total_amount,
          COALESCE(SUM(paid_amount), 0) AS total_paid,
          COALESCE(SUM(total_amount - paid_amount), 0) AS total_pending
        FROM purchase
        WHERE tenant_id = $1`,
      [tenantId], 
      "date",
      filters
    );
    query += ` GROUP BY summary_date ORDER BY summary_date`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  // ADDED: db param
  async getOverallExpenses(db, tenantId, filters) { 
    let { query, params } = this._buildDateFilters(
      `SELECT
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(amount_paid), 0) as total_paid,
          COALESCE(SUM(amount - amount_paid), 0) as total_balance
        FROM expenses WHERE tenant_id = $1`,
      [tenantId], 
      "date",
      filters
    );
    const { rows } = await db.query(query, params);
    return rows[0] || { total_amount: 0, total_paid: 0, total_balance: 0 };
  }

  // ADDED: db param
  async getOverallSales(db, tenantId, filters) { 
    let { query, params } = this._buildDateFilters(
      `SELECT 
        COALESCE(SUM(total_amount), 0) AS total_amount,
        COALESCE(SUM(paid_amount), 0) AS total_received,
        COALESCE(SUM(total_amount - paid_amount), 0) AS total_pending
       FROM sales
       WHERE tenant_id = $1`,
      [tenantId], 
      "date",
      filters
    );
    const { rows } = await db.query(query, params);
    return rows[0] || { total_amount: 0, total_received: 0, total_pending: 0 };
  }

  // ADDED: db param
  async getOverallPurchases(db, tenantId, filters) { 
    let { query, params } = this._buildDateFilters(
      `SELECT 
        COALESCE(SUM(total_amount), 0) AS total_amount,
        COALESCE(SUM(paid_amount), 0) AS total_paid,
        COALESCE(SUM(total_amount - paid_amount), 0) AS total_pending 
       FROM purchase
       WHERE tenant_id = $1`, 
      [tenantId], 
      "date",
      filters
    );
    const { rows } = await db.query(query, params);
    return rows[0] || { total_amount: 0, total_paid: 0, total_pending: 0 };
  }
}

module.exports = DailySummaryRepository;