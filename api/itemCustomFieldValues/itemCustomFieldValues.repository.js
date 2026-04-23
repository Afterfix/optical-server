class ItemCustomFieldValuesRepository {

  async getByItemId(db, itemId, tenantId) {
    const { rows } = await db.query(
      `SELECT icfv.*, cf.label, cf.type
       FROM item_custom_field_values icfv
       LEFT JOIN category_custom_fields cf 
         ON cf.id = icfv.field_id
       WHERE icfv.item_id = $1 AND icfv.tenant_id = $2`,
      [itemId, tenantId]
    );

    return rows;
  }

  async bulkInsert(db, values) {
    const query = `
      INSERT INTO item_custom_field_values 
      (tenant_id, item_id, field_id, value)
      VALUES ${values.map((_, i) =>
        `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
      ).join(", ")}
      RETURNING *;
    `;

    const flatValues = values.flatMap(v => [
      v.tenant_id,
      v.item_id,
      v.field_id,
      v.value
    ]);

    const { rows } = await db.query(query, flatValues);
    return rows;
  }

  async deleteByItemId(db, itemId) {
    await db.query(
      `DELETE FROM item_custom_field_values WHERE item_id = $1`,
      [itemId]
    );
  }
}

module.exports = ItemCustomFieldValuesRepository;