module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.purchase_item') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "purchase_item" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE purchase_item (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          purchase_id INTEGER NOT NULL REFERENCES purchase(id) ON DELETE CASCADE,
          frame_variant_id INTEGER REFERENCES frame_variants(id) ON DELETE SET NULL,
          -- lens_id INTEGER REFERENCES lenses(id) ON DELETE SET NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          total_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ "purchase_item" table has been created.');

      await client.query(
        "CREATE INDEX idx_purchase_item_tenant_id ON purchase_item(tenant_id);",
      );
      await client.query(
        "CREATE INDEX idx_purchase_item_purchase_id ON purchase_item(purchase_id);",
      );
      await client.query(
        "CREATE INDEX idx_purchase_item_frame_variant_id ON purchase_item(frame_variant_id);",
      );
      await client.query(
        "CREATE INDEX idx_purchase_item_lens_id ON purchase_item(lens_id);",
      );

      console.log('✅ Indexes for "purchase_item" table created.');
    }
  } catch (err) {
    console.error('❌ Failed to create "purchase_item" table:', err.message);
    throw err;
  }
};
