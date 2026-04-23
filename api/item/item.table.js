// item.table.js

module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.item') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "item" table already exists.')
    } else {
      await client.query(`
       CREATE TABLE item (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
            done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
            cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            category_id INTEGER REFERENCES category(id),
            sku VARCHAR(255) NOT NULL,
            brand_id INTEGER REFERENCES brand(id),
            bar_code VARCHAR(255),
            stock_quantity INTEGER NOT NULL DEFAULT 0,
            purchase_price DECIMAL(30, 2) NOT NULL,
            selling_price DECIMAL(30, 2) NOT NULL,
            selling_price_with_tax DECIMAL(30, 2) NOT NULL,
            min_stock_level INTEGER NOT NULL,
            party_id INTEGER REFERENCES party(id) ON DELETE SET NULL, 
            tax DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
            image VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (tenant_id, name)
            );
      `)
      console.log('✅ "item" table has been created.')

      await client.query(`CREATE INDEX idx_item_tenant_id ON item(tenant_id);`)
      await client.query(`CREATE INDEX idx_item_party_id ON item(party_id);`) // <<< UPDATED
      await client.query(
        `CREATE INDEX idx_item_category_id ON item(category_id);`
      )
      await client.query(`CREATE INDEX idx_item_brand_id ON item(brand_id);`)
      await client.query(
        `CREATE INDEX idx_item_done_by_id ON item(done_by_id);`
      )
      await client.query(
        `CREATE INDEX idx_item_cost_center_id ON item(cost_center_id);`
      )
      console.log('✅ Indexes for "item" table created.')
    }
  } catch (err) {
    console.error('❌ Failed to create "item" table:', err.message)
    throw err
  }
}
