module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.purchase_item') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "purchase_item" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE purchase_item (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          purchase_id INTEGER NOT NULL REFERENCES purchase(id) ON DELETE CASCADE,
          item_id INTEGER NOT NULL REFERENCES item(id) ON DELETE CASCADE,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10, 2) NOT NULL,
          total_price DECIMAL(10, 2) NOT NULL,
          tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `)
      console.log('✅ "purchase_item" table has been created.')

      await client.query(
        'CREATE INDEX idx_purchase_item_tenant_id ON purchase_item(tenant_id);'
      )
      await client.query(
        'CREATE INDEX idx_purchase_item_purchase_id ON purchase_item(purchase_id);'
      )
      await client.query(
        'CREATE INDEX idx_purchase_item_item_id ON purchase_item(item_id);'
      )
      console.log('✅ Indexes for "purchase_item" table created.')
    }
  } catch (err) {
    console.error('❌ Failed to create "purchase_item" table:', err.message)
    throw err
  }
}
