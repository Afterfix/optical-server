// api/doneBySummary/doneBySummary.service.js
class DoneBySummaryService {
  // No constructor needed

  async generateSummary(tenant_id, filters, db) {
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
            WITH v AS (
                SELECT done_by_id, COUNT(*) AS count_vouchers, COALESCE(SUM(total_amount),0)::numeric(20,2) AS total_amount
                FROM (
                    SELECT done_by_id, total_amount FROM sales ${whereCondition}
                    UNION ALL
                    SELECT done_by_id, total_amount FROM purchase ${whereCondition}
                ) t
                GROUP BY done_by_id
            )
            SELECT d.id as done_by_id, d.name,
                COALESCE(v.count_vouchers, 0) as count,
                COALESCE(v.total_amount, 0) as total_amount
            FROM done_by d
            LEFT JOIN v ON v.done_by_id = d.id
            WHERE d.tenant_id = $1 ORDER BY d.name;
        `;

    // Use passed db
    const { rows } = await db.query(sql, params);
    return rows;
  }
}

module.exports = DoneBySummaryService;