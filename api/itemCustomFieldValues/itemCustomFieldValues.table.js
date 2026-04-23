module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public."item_custom_field_values"') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "item_custom_field_values" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE "item_custom_field_values" (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,
          item_id INTEGER REFERENCES "item"(id) ON DELETE CASCADE,
          field_id INTEGER REFERENCES "category_custom_fields"(id) ON DELETE CASCADE,
          value TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('✅ "item_custom_field_values" table created.');

      await client.query(`
        CREATE INDEX idx_icfv_tenant_id ON item_custom_field_values(tenant_id);
      `);
      await client.query(`
        CREATE INDEX idx_icfv_item_id ON item_custom_field_values(item_id);
      `);
      await client.query(`
        CREATE INDEX idx_icfv_field_id ON item_custom_field_values(field_id);
      `);

      console.log('✅ Indexes created for "item_custom_field_values".');
    }
  } catch (err) {
    console.error('❌ Failed to create item_custom_field_values:', err.message);
    throw err;
  }
};