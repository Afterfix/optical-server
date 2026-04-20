class PurchaseItemRepository {
  
  async createMany(client, purchaseId, items, tenantId) {
    const query = `
      INSERT INTO purchase_item (tenant_id, purchase_id, item_id, quantity, unit_price, total_price)
      VALUES ($1, $2, $3, $4, $5, $6)
    `
    for (const item of items) {
      const totalPrice = item.quantity * item.unit_price
      await client.query(query, [
        tenantId,
        purchaseId,
        item.item_id,
        item.quantity,
        item.unit_price,
        totalPrice,
      ])
    }
  }

  async deleteByPurchaseId(client, purchaseId) {
    await client.query('DELETE FROM purchase_item WHERE purchase_id = $1', [
      purchaseId,
    ])
  }
}

module.exports = PurchaseItemRepository