class SalesItemRepository {
  async createMany(client, salesId, items, tenantId) {
    const query = `
      INSERT INTO sale_item (
        tenant_id, sales_id, item_id, prescription_id,
        quantity, unit_price, tax_amount, total_price
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    for (const item of items) {
      await client.query(query, [
        tenantId,
        salesId,
        item.item_id || null,
        item.prescription_id || null,
        item.quantity || 1,
        item.unit_price || item.item_price || 0,
        item.tax_amount || 0,
        item.total_price,
      ]);
    }
  }

  async getBySalesId(db, salesId) {
    const query = `
      SELECT si.*, 
             i.name as item_name,
             i.sku as item_sku
      FROM sale_item si
      LEFT JOIN item i ON si.item_id = i.id
      WHERE si.sales_id = $1
    `;
    const { rows } = await db.query(query, [salesId]);
    return rows;
  }

  async deleteBySalesId(client, salesId) {
    await client.query("DELETE FROM sale_item WHERE sales_id = $1", [salesId]);
  }
}

module.exports = SalesItemRepository;
