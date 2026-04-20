class StockDetailedReportService {
  // constructor removed

  async generateSummary(tenant_id, filters, db) {
    const { start_date, end_date } = filters;

    const params = [tenant_id];
    let dateRangeCondition = "";
    let beforeDateCondition = "AND 1=0";

    if (start_date && end_date) {
      params.push(start_date, end_date);
      dateRangeCondition = `AND date BETWEEN $2::timestamptz AND $3::timestamptz`;
      beforeDateCondition = `AND date < $2::timestamptz`;
    }

    const sql = `
            WITH purchases_in AS (
                SELECT pi.item_id, COALESCE(SUM(pi.quantity),0)::bigint AS qty
                FROM purchase_item pi JOIN purchase p ON p.id = pi.purchase_id
                WHERE pi.tenant_id = $1 ${dateRangeCondition.replace(
                  "date",
                  "p.date"
                )} GROUP BY pi.item_id
            ),
            sales_in AS (
                SELECT si.item_id, COALESCE(SUM(si.quantity),0)::bigint AS qty
                FROM sale_item si JOIN sales s ON s.id = si.sales_id
                WHERE si.tenant_id = $1 ${dateRangeCondition.replace(
                  "date",
                  "s.date"
                )} GROUP BY si.item_id
            ),
            purchase_return_in AS (
                SELECT pr.item_id, COALESCE(SUM(pr.return_quantity),0)::bigint AS qty
                FROM purchase_return pr
                WHERE pr.tenant_id = $1 ${dateRangeCondition.replace(
                  "date",
                  "pr.date"
                )} GROUP BY pr.item_id
            ),
            sale_return_in AS (
                SELECT sr.item_id, COALESCE(SUM(sr.return_quantity),0)::bigint AS qty
                FROM sale_return sr WHERE sr.tenant_id = $1 ${dateRangeCondition.replace(
                  "date",
                  "sr.date"
                )} GROUP BY sr.item_id
            ),
            -- FIX: Simplified and corrected the opening stock calculation logic
            opening_stock AS (
                SELECT
                    item_id,
                    SUM(quantity) as opening_qty
                FROM (
                    -- Stock IN (Positive values)
                    SELECT pi.item_id, pi.quantity FROM purchase_item pi JOIN purchase p ON p.id = pi.purchase_id WHERE pi.tenant_id = $1 ${beforeDateCondition.replace("date", "p.date")}
                    UNION ALL
                    SELECT sr.item_id, sr.return_quantity as quantity FROM sale_return sr WHERE sr.tenant_id = $1 ${beforeDateCondition.replace("date", "sr.date")}
                    
                    UNION ALL

                    -- Stock OUT (Negative values)
                    SELECT si.item_id, -si.quantity as quantity FROM sale_item si JOIN sales s ON s.id = si.sales_id WHERE si.tenant_id = $1 ${beforeDateCondition.replace("date", "s.date")}
                    UNION ALL
                    SELECT pr.item_id, -pr.return_quantity as quantity FROM purchase_return pr WHERE pr.tenant_id = $1 ${beforeDateCondition.replace("date", "pr.date")}
                ) as before_data
                GROUP BY item_id
            )
            SELECT
                i.id as item_id, i.name,
                COALESCE(os.opening_qty, 0) AS opening_qty,
                COALESCE(purchases_in.qty, 0) + COALESCE(sale_return_in.qty, 0) AS qty_in,
                COALESCE(sales_in.qty, 0) + COALESCE(purchase_return_in.qty, 0) AS qty_out,
                COALESCE(os.opening_qty, 0) + (COALESCE(purchases_in.qty, 0) + COALESCE(sale_return_in.qty, 0)) - (COALESCE(sales_in.qty, 0) + COALESCE(purchase_return_in.qty, 0)) AS closing_qty
            FROM item i
            LEFT JOIN opening_stock os ON os.item_id = i.id
            LEFT JOIN purchases_in ON purchases_in.item_id = i.id
            LEFT JOIN sales_in ON sales_in.item_id = i.id
            LEFT JOIN purchase_return_in ON purchase_return_in.item_id = i.id
            LEFT JOIN sale_return_in ON sale_return_in.item_id = i.id
            WHERE i.tenant_id = $1 ORDER BY i.name;
        `;

    const { rows } = await db.query(sql, params);
    return rows;
  }
}

module.exports = StockDetailedReportService;