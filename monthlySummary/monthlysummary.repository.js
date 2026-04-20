class MonthlySummaryRepository {
  constructor(db) {
    this.db = db;
  }

  _buildDateFilters(query, params, dateColumn, filters) {
    const effectiveFilters = { ...filters };
    if (!effectiveFilters.start_date && !effectiveFilters.end_date) {
      const currentYear = new Date().getFullYear();
      effectiveFilters.start_date = `${currentYear}-01-01`;
      effectiveFilters.end_date = `${currentYear}-12-31`;
    }
    let paramIndex = params.length + 1;
    if (effectiveFilters.start_date) {
      query += ` AND ${dateColumn} >= $${paramIndex++}`;
      params.push(effectiveFilters.start_date);
    }
    if (effectiveFilters.end_date) {
      query += ` AND ${dateColumn} <= $${paramIndex++}`;
      params.push(effectiveFilters.end_date);
    }
    return { query, params };
  }

  async getExpenses(tenantId, filters) {
    let { query, params } = this._buildDateFilters(
      `SELECT
          EXTRACT(YEAR FROM DATE_TRUNC('month', date)) AS year,
          TRIM(TO_CHAR(DATE_TRUNC('month', date), 'Month')) AS month,
          COUNT(*) AS expense_count,
          COALESCE(SUM(amount), 0) AS total_amount,
          COALESCE(SUM(amount_paid), 0) AS total_paid,
          COALESCE(SUM(amount - amount_paid), 0) AS total_balance
        FROM expenses WHERE tenant_id = $1`,
      [tenantId],
      "date",
      filters
    );
    query += ` GROUP BY DATE_TRUNC('month', date) ORDER BY DATE_TRUNC('month', date) DESC`;
    const { rows } = await this.db.query(query, params);
    return rows;
  }

  async getSales(tenantId, filters) {
    let { query, params } = this._buildDateFilters(
      `SELECT
          EXTRACT(YEAR FROM DATE_TRUNC('month', s.date)) AS year,
          TRIM(TO_CHAR(DATE_TRUNC('month', s.date), 'Month')) AS month,
          COUNT(*) AS sale_count,
          COALESCE(SUM(s.paid_amount), 0) AS total_received,
          COALESCE(SUM(s.total_amount - s.paid_amount), 0) AS total_pending
        FROM sales s
        JOIN party c ON s.party_id = c.id
        WHERE c.tenant_id = $1`,
      [tenantId],
      "s.date",
      filters
    );
    query += ` GROUP BY DATE_TRUNC('month', s.date) ORDER BY DATE_TRUNC('month', s.date) DESC`;
    const { rows } = await this.db.query(query, params);
    return rows;
  }

  async getPurchases(tenantId, filters) {
    let { query, params } = this._buildDateFilters(
      `SELECT
          EXTRACT(YEAR FROM DATE_TRUNC('month', p.date)) AS year,
          TRIM(TO_CHAR(DATE_TRUNC('month', p.date), 'Month')) AS month,
          COUNT(*) AS purchase_count,
          COALESCE(SUM(p.paid_amount), 0) AS total_paid,
          COALESCE(SUM(p.total_amount - p.paid_amount), 0) AS total_pending
        FROM purchase p
        JOIN party sup ON p.party_id = sup.id
        WHERE sup.tenant_id = $1`,
      [tenantId],
      "p.date",
      filters
    );
    query += ` GROUP BY DATE_TRUNC('month', p.date) ORDER BY DATE_TRUNC('month', p.date) DESC`;
    const { rows } = await this.db.query(query, params);
    return rows;
  }
}

module.exports = MonthlySummaryRepository;