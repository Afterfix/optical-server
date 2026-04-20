class PeriodicProfitReportService {

  async generateSummary(db, tenant_id, filters) {
    const { start_date, end_date } = filters;

    const params = [tenant_id];
    let dateFilterSales = "";
    let dateFilterExpenses = "";

    if (start_date && end_date) {
      const dateFilter = `AND date BETWEEN $${params.length + 1} AND $${
        params.length + 2
      }`;
      dateFilterSales = dateFilter.replace("date", "s.date");
      dateFilterExpenses = dateFilter;
      params.push(start_date, end_date);
    }

    const query = `
            WITH sales_data AS (
                SELECT 
                    SUM(si.total_price - si.tax_amount) as sales,
                    SUM(si.quantity * i.purchase_price) as cost
                FROM sale_item si
                JOIN sales s ON si.sales_id = s.id
                JOIN item i ON si.item_id = i.id
                WHERE s.tenant_id = $1 ${dateFilterSales}
            ),
            expense_data AS (
                SELECT SUM(amount) as expense
                FROM expenses 
                WHERE tenant_id = $1 ${dateFilterExpenses}
            )
            -- UPDATED SECTION --
            SELECT 
                COALESCE((SELECT sales FROM sales_data), 0)::NUMERIC(15, 2) as total_sales,
                COALESCE((SELECT cost FROM sales_data), 0)::NUMERIC(15, 2) as total_cost,
                COALESCE((SELECT expense FROM expense_data), 0)::NUMERIC(15, 2) as total_expenses,
                (COALESCE((SELECT sales FROM sales_data), 0) - COALESCE((SELECT cost FROM sales_data), 0) - COALESCE((SELECT expense FROM expense_data), 0))::NUMERIC(15, 2) as net_profit;
        `;

    const { rows } = await db.query(query, params);
    return rows[0];
  }
}

module.exports = PeriodicProfitReportService;