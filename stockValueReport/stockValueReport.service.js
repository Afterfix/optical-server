class StockValueReportService {

  async generateSummary(tenant_id, filters, db) {
    const { categoryId } = filters;
    let query = `
      SELECT (i.stock_quantity * i.purchase_price) as total_value
      FROM item i
      WHERE i.tenant_id = $1 AND i.stock_quantity > 0
    `;
    const params = [tenant_id];

    if (categoryId) {
      query += ` AND i.category_id = $${params.length + 1}`;
      params.push(categoryId);
    }
    const result = await db.query(query, params);
    const totalWorth = result.rows.reduce(
      (sum, item) => sum + parseFloat(item.total_value || 0),
      0
    );

    return {
      total_inventory_value: totalWorth,
      item_count: result.rowCount,
    };
  }

  async generatePaginatedSummary(tenant_id, filters, db) {
    const { page = 1, page_size = 10 } = filters;
    const limit = parseInt(page_size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    let query = `
      SELECT 
        i.id, -- <--- ADD THIS LINE TO SELECT THE UNIQUE ID
        i.name, i.sku, i.stock_quantity, i.purchase_price,
        (i.stock_quantity * i.purchase_price) as total_value,
        c.name as category_name,
        COUNT(*) OVER() AS total_count
      FROM item i
      LEFT JOIN category c ON i.category_id = c.id
      WHERE i.tenant_id = $1 AND i.stock_quantity > 0
      ORDER BY i.name ASC
      LIMIT $2 OFFSET $3
    `;
    const params = [tenant_id, limit, offset];

    const { rows } = await db.query(query, params);
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    const items = rows.map(({ total_count, ...rest }) => rest);
    const page_count = totalCount > 0 ? Math.ceil(totalCount / limit) : 0;

    return { data: items, count: totalCount, page_count };
  }
}

module.exports = StockValueReportService;