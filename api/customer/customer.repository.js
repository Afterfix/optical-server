class CustomerRepository {
  async getAll(db, tenantId) {
    const query = `SELECT * FROM customer WHERE tenant_id = $1 ORDER BY created_at DESC`;
    const { rows } = await db.query(query, [tenantId]);
    return rows;
  }

  async create(db, data) {
    const query = `
      INSERT INTO customer (tenant_id, name, contact_no, right_sph, right_cyl, right_axis, right_add, right_ipd, left_sph, left_cyl, left_axis, left_add, left_ipd, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`;
    const values = [data.tenant_id, data.name, data.contact_no, data.right_sph, data.right_cyl, data.right_axis, data.right_add, data.right_ipd, data.left_sph, data.left_cyl, data.left_axis, data.left_add, data.left_ipd, data.remarks];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  async getById(db, id, tenantId) {
    const { rows } = await db.query(`SELECT * FROM customer WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    return rows[0];
  }

  async update(db, id, tenantId, data) {
    const fields = Object.keys(data).map((key, i) => `"${key}" = $${i + 1}`).join(', ');
    const query = `UPDATE customer SET ${fields}, updated_at = NOW() WHERE id = $${Object.keys(data).length + 1} AND tenant_id = $${Object.keys(data).length + 2} RETURNING *`;
    const { rows } = await db.query(query, [...Object.values(data), id, tenantId]);
    return rows[0];
  }

  async delete(db, id, tenantId) {
    const { rows } = await db.query(`DELETE FROM customer WHERE id = $1 AND tenant_id = $2 RETURNING id`, [id, tenantId]);
    return rows[0];
  }
}
module.exports = CustomerRepository;