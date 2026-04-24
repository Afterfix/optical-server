class PurchaseItemRepository {
  async createMany(client, purchaseId, items, tenantId) {
    const query = `
      INSERT INTO purchase_item (
        tenant_id, purchase_id, item_id,
        quantity, unit_price, total_price, tax_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    for (const item of items) {
      // Calculate total if not provided, including tax
      const unitPrice = item.unit_price || 0;
      const tax = item.tax_amount || 0;
      const total = item.quantity * unitPrice + tax;

      await client.query(query, [
        tenantId,
        purchaseId,
        item.item_id || null,
        item.quantity,
        unitPrice,
        total,
        tax,
      ]);
    }
  }

  async getByPurchaseId(db, purchaseId) {
    const { rows } = await db.query(
      `SELECT pi.*, i.name as item_name
       FROM purchase_item pi
       LEFT JOIN item i ON pi.item_id = i.id
       WHERE pi.purchase_id = $1`,
      [purchaseId],
    );
    return rows;
  }

  async deleteByPurchaseId(client, purchaseId) {
    await client.query("DELETE FROM purchase_item WHERE purchase_id = $1", [
      purchaseId,
    ]);
  }
}

module.exports = PurchaseItemRepository;
