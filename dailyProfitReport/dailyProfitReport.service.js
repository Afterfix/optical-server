class DailyProfitReportService {

  async generateSummary(db, tenant_id, filters) {
    const { filterBy, filterValue, start_date, end_date } = filters;

    // --- Sales & COGS Query ---
    let salesQuery = `
            SELECT 
                SUM(si.total_price - si.tax_amount) as net_sales,
                SUM(si.quantity * i.purchase_price) as cogs
            FROM sale_item si
            JOIN sales s ON si.sales_id = s.id
            JOIN item i ON si.item_id = i.id
            WHERE si.tenant_id = $1
        `;
    const salesParams = [tenant_id];

    if (start_date && end_date) {
      salesQuery += ` AND s.date BETWEEN $${salesParams.length + 1} AND $${
        salesParams.length + 2
      }`;
      salesParams.push(start_date, end_date);
    }
    if (filterBy === "customer" && filterValue) {
      salesQuery += ` AND s.party_id = $${salesParams.length + 1}`;
      salesParams.push(filterValue);
    } else if (filterBy === "product" && filterValue) {
      salesQuery += ` AND si.item_id = $${salesParams.length + 1}`;
      salesParams.push(filterValue);
    }

    const salesResult = await db.query(salesQuery, salesParams);
    const netSales = parseFloat(salesResult.rows[0].net_sales || 0);
    const cogs = parseFloat(salesResult.rows[0].cogs || 0);

    let jobQuery = `
            SELECT SUM(service_charges) as service_revenue, SUM(service_cost) as service_cost
            FROM job_sheets WHERE tenant_id = $1
        `;
    const jobParams = [tenant_id];
    if (start_date && end_date) {
      jobQuery += ` AND date BETWEEN $${jobParams.length + 1} AND $${
        jobParams.length + 2
      }`;
      jobParams.push(start_date, end_date);
    }
    const jobResult = await db.query(jobQuery, jobParams);
    const serviceRevenue = parseFloat(jobResult.rows[0].service_revenue || 0);
    const serviceCost = parseFloat(jobResult.rows[0].service_cost || 0);

    let expenseQuery = `SELECT SUM(amount) as total FROM expenses WHERE tenant_id = $1`;
    const expenseParams = [tenant_id];
    if (start_date && end_date) {
      expenseQuery += ` AND date BETWEEN $${expenseParams.length + 1} AND $${
        expenseParams.length + 2
      }`;
      expenseParams.push(start_date, end_date);
    }
    const expenseRes = await db.query(expenseQuery, expenseParams);
    const expenseTotal = parseFloat(expenseRes.rows[0].total || 0);

    const finalCogs = cogs + serviceCost;
    const totalRevenue = netSales + serviceRevenue;
    const netProfit = totalRevenue - finalCogs - expenseTotal;

    return {
      dates: { start_date, end_date },
      breakdown: {
        product_sales: Number(netSales.toFixed(2)),
        service_revenue: Number(serviceRevenue.toFixed(2)),
        product_cost: Number(cogs.toFixed(2)),
        service_cost: Number(serviceCost.toFixed(2)),
        expenses: Number(expenseTotal.toFixed(2)),
      },
      financials: {
        total_revenue: Number(totalRevenue.toFixed(2)),
        total_cost: Number(finalCogs.toFixed(2)),
        net_profit: Number(netProfit.toFixed(2)),
      },
    };
  }
}

module.exports = DailyProfitReportService;