class PurchaseItemRepository {
  async createMany(client, purchaseId, items, tenantId) {
    const query = `
      INSERT INTO purchase_item (
        tenant_id, purchase_id, frame_variant_id, lens_id, lens_addon_id,
        quantity, unit_price, total_price, tax_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    for (const item of items) {
      // Calculate total if not provided, including tax
      const unitPrice = item.unit_price || 0;
      const tax = item.tax_amount || 0;
      const total = item.quantity * unitPrice + tax;

      await client.query(query, [
        tenantId,
        purchaseId,
        item.frame_variant_id || null,
        item.lens_id || null,
        item.lens_addon_id || null,
        item.quantity,
        unitPrice,
        total,
        tax,
      ]);
    }
  }

  async getByPurchaseId(db, purchaseId) {
    const { rows } = await db.query(
      `SELECT pi.*, fv.sku as frame_sku
       FROM purchase_item pi
       LEFT JOIN frame_variants fv ON pi.frame_variant_id = fv.id
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
