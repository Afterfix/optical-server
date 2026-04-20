class TaxSummaryReportService {

  async generateSummary(tenant_id, filters, db) {
    const { start_date, end_date } = filters;

    const params = [tenant_id];
    let dateFilter = "";

    // Dynamically add the date filter if both dates are provided
    if (start_date && end_date) {
      dateFilter = `AND s.date BETWEEN $${params.length + 1} AND $${
        params.length + 2
      }`;
      params.push(start_date, end_date);
    }

    const totalTaxQuery = `
            SELECT COALESCE(SUM(si.tax_amount), 0) as tax_collected
            FROM sale_item si
            JOIN sales s ON si.sales_id = s.id
            WHERE si.tenant_id = $1 ${dateFilter}
        `;
    const totalResult = await db.query(totalTaxQuery, params);

    const breakdownQuery = `
            SELECT s.invoice_number, s.date, p.name as customer, SUM(si.tax_amount) as tax
            FROM sales s
            JOIN sale_item si ON s.id = si.sales_id
            LEFT JOIN party p ON s.party_id = p.id
            WHERE s.tenant_id = $1 ${dateFilter}
            GROUP BY s.id, s.invoice_number, s.date, p.name
            ORDER BY s.date DESC
        `;
    const breakdownResult = await db.query(breakdownQuery, params);

    return {
      total_tax_collected: parseFloat(totalResult.rows[0].tax_collected),
      details: breakdownResult.rows,
    };
  }
}

module.exports = TaxSummaryReportService;