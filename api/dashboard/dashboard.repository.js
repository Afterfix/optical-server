class DashboardRepository {
  async getFinancialSummary(db, tenantId, period = "month") {
    // Determine the date filter based on period
    let dateFilter = "INTERVAL '1 month'";
    if (period === "today") dateFilter = "INTERVAL '1 day'";
    if (period === "week") dateFilter = "INTERVAL '1 week'";

    const salesQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(paid_amount), 0) as paid
      FROM sales 
      WHERE tenant_id = $1 AND order_date >= NOW() - ${dateFilter}
    `;

    const purchaseQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(paid_amount), 0) as paid
      FROM purchase 
      WHERE tenant_id = $1 AND date >= NOW() - ${dateFilter}
    `;

    const expenseQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(amount_paid), 0) as paid
      FROM expenses 
      WHERE tenant_id = $1 AND date >= NOW() - ${dateFilter}
    `;

    const serviceQuery = `
      SELECT 
        COALESCE(SUM(total_price), 0) as total_profit
      FROM sale_item 
      WHERE tenant_id = $1 AND lens_id IS NOT NULL AND created_at >= NOW() - ${dateFilter}
    `;

    const [sales, purchase, expense, service] = await Promise.all([
      db.query(salesQuery, [tenantId]),
      db.query(purchaseQuery, [tenantId]),
      db.query(expenseQuery, [tenantId]),
      db.query(serviceQuery, [tenantId]),
    ]);

    return {
      sales: sales.rows[0],
      purchase: purchase.rows[0],
      expense: {
        ...expense.rows[0],
        balance: expense.rows[0].total - expense.rows[0].paid
      },
      service: service.rows[0],
      today: {
        serviceProfit: service.rows[0].total_profit, // For now mapping this
        serviceCost: 0 // placeholder
      }
    };
  }

  async getWeeklySalesPurchases(db, tenantId) {
    const query = `
      WITH RECURSIVE days AS (
        SELECT CURRENT_DATE - INTERVAL '6 days' as d
        UNION ALL
        SELECT d + INTERVAL '1 day' FROM days WHERE d < CURRENT_DATE
      )
      SELECT 
        TO_CHAR(days.d, 'Dy') as day,
        COALESCE((SELECT SUM(total_amount) FROM sales WHERE tenant_id = $1 AND DATE(order_date) = days.d), 0) as "Sales",
        COALESCE((SELECT SUM(total_amount) FROM purchase WHERE tenant_id = $1 AND DATE(date) = days.d), 0) as "Purchases"
      FROM days
      ORDER BY days.d
    `;
    const { rows } = await db.query(query, [tenantId]);
    return rows;
  }

  async getTopSellingProducts(db, tenantId, period = "month") {
    // Simplified: Show grouping by category or brands if items table isn't easily summary-able
    const query = `
      SELECT 
        COALESCE(c.name, 'Other') as name,
        COALESCE(SUM(si.total_price), 0) as value
      FROM sale_item si
      LEFT JOIN frame_variants fv ON si.frame_variant_id = fv.id
      LEFT JOIN frame f ON fv.frame_id = f.id
      LEFT JOIN category c ON f.category_id = c.id
      WHERE si.tenant_id = $1
      GROUP BY c.name
      LIMIT 5
    `;
    const { rows } = await db.query(query, [tenantId]);
    return rows;
  }

  async getStockAlerts(db, tenantId) {
    const query = `
      SELECT 
        f.name || ' (' || fv.color || ' ' || fv.size || ')' as product,
        fv.stock_qty as quantity,
        fv.sku as code
      FROM frame_variants fv
      JOIN frame f ON fv.frame_id = f.id
      WHERE fv.tenant_id = $1 AND fv.stock_qty < 5
      ORDER BY fv.stock_qty ASC
      LIMIT 5
    `;
    const { rows } = await db.query(query, [tenantId]);
    return rows;
  }

  async getRecentSales(db, tenantId) {
    const query = `
      SELECT 
        s.id,
        p.name as party,
        s.invoice_number as reference,
        s.order_date as date,
        s.total_amount as "grandTotal",
        s.payment_status as "paymentStatus"
      FROM sales s
      JOIN party p ON s.party_id = p.id
      WHERE s.tenant_id = $1
      ORDER BY s.order_date DESC
      LIMIT 5
    `;
    const { rows } = await db.query(query, [tenantId]);
    return rows;
  }
}

module.exports = DashboardRepository;
