class SalesItemRepository {
  async createMany(client, salesId, items, tenantId) {
    const query = `
      INSERT INTO sale_item (
        tenant_id, sales_id, frame_variant_id, lens_id, prescription_id, 
        quantity, frame_price, lens_price, addon_price, tax_amount, total_price
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    for (const item of items) {
      await client.query(query, [
        tenantId,
        salesId,
        item.frame_variant_id || null,
        item.lens_id || null,
        item.prescription_id || null,
        item.quantity || 1,
        item.frame_price || 0,
        item.lens_price || 0,
        item.addon_price || 0,
        item.tax_amount || 0,
        item.total_price,
      ]);
    }
  }

  async getBySalesId(db, salesId) {
    // Joining tables here is helpful for displaying the order details
    const query = `
      SELECT si.*, 
             fv.sku, 
             l.name as lens_name
      FROM sale_item si
      LEFT JOIN frame_variants fv ON si.frame_variant_id = fv.id
      LEFT JOIN lenses l ON si.lens_id = l.id
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
