module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public."category_custom_fields"') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "category_custom_fields" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE "category_custom_fields" (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,
          category_id INTEGER REFERENCES "category"(id) ON DELETE CASCADE,
          label VARCHAR(100) NOT NULL,
          type VARCHAR(50) NOT NULL,
          is_required BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('✅ "category_custom_fields" table created.');

      await client.query(`
        CREATE INDEX idx_ccf_tenant_id ON category_custom_fields(tenant_id);
      `);
      await client.query(`
        CREATE INDEX idx_ccf_category_id ON category_custom_fields(category_id);
      `);

      console.log('✅ Indexes created for "category_custom_fields".');
    }
  } catch (err) {
    console.error('❌ Failed to create category_custom_fields:', err.message);
    throw err;
  }
};