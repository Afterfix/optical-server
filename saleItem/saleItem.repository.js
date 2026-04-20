class SalesItemRepository {
  // constructor removed

  async createMany(client, salesId, items, tenantId) {
    const query = `
      INSERT INTO sale_item (tenant_id, sales_id, item_id, quantity, unit_price, total_price, tax_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
    for (const item of items) {
      await client.query(query, [
        tenantId,
        salesId,
        item.item_id,
        item.quantity,
        item.unit_price,
        item.total_price,
        item.tax_amount,
      ])
    }
  }

  async getBySalesId(db, salesId) {
    const { rows } = await db.query(
      'SELECT * FROM sale_item WHERE sales_id = $1',
      [salesId]
    )
    return rows
  }

  async deleteBySalesId(client, salesId) {
    await client.query('DELETE FROM sale_item WHERE sales_id = $1', [salesId])
  }
}

module.exports = SalesItemRepository