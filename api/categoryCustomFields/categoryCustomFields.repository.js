class CategoryCustomFieldsRepository {

  async getAllByCategoryId(db, categoryId, tenantId) {
    const { rows } = await db.query(
      `SELECT * FROM category_custom_fields
       WHERE category_id = $1 AND tenant_id = $2
       ORDER BY id DESC`,
      [categoryId, tenantId]
    );
    return rows;
  }

  async create(db, data) {
    const { tenant_id, category_id, label, type, is_required } = data;

    const { rows } = await db.query(
      `INSERT INTO category_custom_fields 
       (tenant_id, category_id, label, type, is_required)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenant_id, category_id, label, type, is_required]
    );

    return rows[0];
  }

  async delete(db, id, tenantId) {
    const { rows } = await db.query(
      `DELETE FROM category_custom_fields 
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [id, tenantId]
    );

    return rows[0];
  }
}

module.exports = CategoryCustomFieldsRepository;