class CostCenterSummaryService {
  // REMOVED: constructor(db)

  // ADDED: db param
  async generateSummary(db, tenant_id, filters) {
    const { start_date, end_date } = filters;

    const params = [tenant_id];
    const whereClauses = ["tenant_id = $1"];
    let paramIndex = 2;

    if (start_date && end_date) {
      whereClauses.push(
        `date BETWEEN $${paramIndex}::timestamptz AND $${
          paramIndex + 1
        }::timestamptz`
      );
      params.push(start_date, end_date);
    }

    const whereCondition = `WHERE ${whereClauses.join(" AND ")}`;

    const sql = `
        WITH sales_sum AS (
            SELECT cost_center_id, COALESCE(SUM(total_amount),0)::numeric(20,2) as sales_total
            FROM sales ${whereCondition} GROUP BY cost_center_id
        ),
        sale_return_sum AS (
            SELECT cost_center_id, COALESCE(SUM(total_refund_amount),0)::numeric(20,2) as sale_return_total
            FROM sale_return ${whereCondition} GROUP BY cost_center_id
        ),
        purchase_sum AS (
            SELECT cost_center_id, COALESCE(SUM(total_amount),0)::numeric(20,2) as purchase_total
            FROM purchase ${whereCondition} GROUP BY cost_center_id
        ),
        purchase_return_sum AS (
            SELECT cost_center_id, COALESCE(SUM(total_refund_amount),0)::numeric(20,2) as purchase_return_total
            FROM purchase_return ${whereCondition} GROUP BY cost_center_id
        ),
        expense_sum AS (
            SELECT cost_center_id, COALESCE(SUM(amount),0)::numeric(20,2) as expense_total
            FROM expenses ${whereCondition} GROUP BY cost_center_id
        )
        SELECT
            cc.id AS cost_center_id, 
            cc.name AS cost_center_name,
            COALESCE(ss.sales_total, 0) AS sales,
            COALESCE(srs.sale_return_total, 0) AS sale_returns,
            (COALESCE(ss.sales_total, 0) - COALESCE(srs.sale_return_total, 0)) AS income,
            COALESCE(ps.purchase_total, 0) AS purchase,
            COALESCE(prs.purchase_return_total, 0) AS purchase_returns,
            ((COALESCE(ps.purchase_total, 0) - COALESCE(prs.purchase_return_total, 0)) + COALESCE(es.expense_total, 0)) AS expense,
            ((COALESCE(ss.sales_total, 0) - COALESCE(srs.sale_return_total, 0)) - ((COALESCE(ps.purchase_total, 0) - COALESCE(prs.purchase_return_total, 0)) + COALESCE(es.expense_total, 0))) AS net_profit
        FROM cost_center cc
        LEFT JOIN sales_sum ss ON ss.cost_center_id = cc.id
        LEFT JOIN sale_return_sum srs ON srs.cost_center_id = cc.id
        LEFT JOIN purchase_sum ps ON ps.cost_center_id = cc.id
        LEFT JOIN purchase_return_sum prs ON prs.cost_center_id = cc.id
        LEFT JOIN expense_sum es ON es.cost_center_id = cc.id
        WHERE cc.tenant_id = $1 ORDER BY cc.name;
    `;

    const { rows } = await db.query(sql, params);
    return rows;
  }
}

module.exports = CostCenterSummaryService;