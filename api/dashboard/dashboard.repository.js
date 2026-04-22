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
        COALESCE(SUM(service_charge - cost), 0) as total_profit
      FROM services 
      WHERE tenant_id = $1 AND created_at >= NOW() - ${dateFilter}
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

  async getWeeklySalesPurchases(db, tenantId, period = "month") {
    let query = "";
    if (period === "today") {
      query = `
        WITH hours AS (
          SELECT generate_series(
            date_trunc('day', NOW()) + INTERVAL '6 hours',
            date_trunc('day', NOW()) + INTERVAL '22 hours',
            '2 hour'::interval
          ) as hr
        )
        SELECT 
          TO_CHAR(h.hr, 'HH24:MI') as day,
          (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE tenant_id = $1 AND order_date >= h.hr AND order_date < h.hr + INTERVAL '2 hour') as "Sales",
          (SELECT COALESCE(SUM(total_amount), 0) FROM purchase WHERE tenant_id = $1 AND date >= h.hr AND date < h.hr + INTERVAL '2 hour') as "Purchases"
        FROM hours h
        ORDER BY h.hr;
      `;
    } else if (period === "year") {
      query = `
        WITH months AS (
          SELECT generate_series(
            date_trunc('year', NOW()),
            date_trunc('year', NOW()) + INTERVAL '11 months',
            '1 month'::interval
          ) as mo
        )
        SELECT 
          TO_CHAR(m.mo, 'Mon') as day,
          (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE tenant_id = $1 AND order_date >= m.mo AND order_date < m.mo + INTERVAL '1 month') as "Sales",
          (SELECT COALESCE(SUM(total_amount), 0) FROM purchase WHERE tenant_id = $1 AND date >= m.mo AND date < m.mo + INTERVAL '1 month') as "Purchases"
        FROM months m
        ORDER BY m.mo;
      `;
    } else {
      // Week or Month
      let interval = period === "week" ? "6 days" : "29 days";
      query = `
        WITH days AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '${interval}',
            CURRENT_DATE,
            '1 day'::interval
          )::date as day
        )
        SELECT 
          TO_CHAR(d.day, 'DD Mon') as day,
          (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE tenant_id = $1 AND order_date::date = d.day) as "Sales",
          (SELECT COALESCE(SUM(total_amount), 0) FROM purchase WHERE tenant_id = $1 AND date::date = d.day) as "Purchases"
        FROM days d
        ORDER BY d.day;
      `;
    }
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
    const framesQuery = `
      SELECT 
        f.name || ' (' || fv.color || ' ' || fv.size || ')' as product,
        fv.stock_qty as quantity,
        fv.sku as code,
        'frame' as type
      FROM frame_variants fv
      JOIN frame f ON fv.frame_id = f.id
      WHERE fv.tenant_id = $1
      ORDER BY fv.created_at DESC
      LIMIT 10
    `;
    const lensesQuery = `
      SELECT 
        name as product,
        stock as quantity,
        'LENS-' || id as code,
        'lens' as type
      FROM lenses
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const addonsQuery = `
      SELECT 
        name as product,
        stock as quantity,
        'ADDON-' || id as code,
        'addon' as type
      FROM lens_addons
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const [frames, lenses, addons] = await Promise.all([
      db.query(framesQuery, [tenantId]),
      db.query(lensesQuery, [tenantId]),
      db.query(addonsQuery, [tenantId])
    ]);

    return {
      frames: frames.rows,
      lenses: lenses.rows,
      addons: addons.rows
    };
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
  async getRecentPurchases(db, tenantId) {
    const query = `
      SELECT 
        p.id,
        pt.name as party,
        p.invoice_number as reference,
        p.date,
        p.total_amount as "grandTotal",
        p.status as "paymentStatus"
      FROM purchase p
      JOIN party pt ON p.party_id = pt.id
      WHERE p.tenant_id = $1
      ORDER BY p.date DESC
      LIMIT 10
    `;
    const { rows } = await db.query(query, [tenantId]);
    return rows;
  }
}

module.exports = DashboardRepository;
