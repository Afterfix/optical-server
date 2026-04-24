module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.sale_item') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "sale_item" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE sale_item (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,
          sales_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
          item_id INTEGER REFERENCES item(id) ON DELETE SET NULL,
         prescription_id INTEGER REFERENCES prescription(id) ON DELETE SET NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          total_price DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('✅ "sale_item" table has been created.');

      // Indexes
      await client.query(
        "CREATE INDEX idx_sale_item_tenant_id ON sale_item(tenant_id);",
      );
      await client.query(
        "CREATE INDEX idx_sale_item_sales_id ON sale_item(sales_id);",
      );
      await client.query(
        "CREATE INDEX idx_sale_item_prescription_id ON sale_item(prescription_id);",
      );
      

      console.log('✅ Indexes for "sale_item" table created.');
    }
  } catch (err) {
    console.error('❌ Failed to create "sale_item" table:', err.message);
    throw err;
  }
};
