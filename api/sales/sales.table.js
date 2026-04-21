

module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.sales') AS table_name;
    `)
    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "sales" table already exists.')

    } else {
      await client.query(`
        CREATE TABLE sales (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          customer_id INTEGER NOT NULL REFERENCES customer(id), 
          done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
          cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
          total_amount DECIMAL(10, 2) NOT NULL,
          paid_amount DECIMAL(10, 2) NOT NULL,
          change_return DECIMAL(10, 2) DEFAULT 0.00,
          discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          expected_delivery TIMESTAMP,
          actual_delivery TIMESTAMP,
          order_status VARCHAR(20) DEFAULT 'pending',
          payment_status VARCHAR(255) NOT NULL,
          invoice_number VARCHAR(100) NOT NULL,
          note TEXT DEFAULT NULL
        );
      `)
      console.log('✅ "sales" table created.')

      await client.query(
        `CREATE INDEX idx_sales_tenant_id ON sales(tenant_id);`
      )
      await client.query(`CREATE INDEX idx_sales_customer_id ON sales(customer_id);`)
      await client.query(
        `CREATE INDEX idx_sales_done_by_id ON sales(done_by_id);`
      )
      await client.query(
        `CREATE INDEX idx_sales_cost_center_id ON sales(cost_center_id);`
      )
      console.log('✅ Indexes for "sales" table created.')
    }
  } catch (err) {
    console.error('❌ Error creating "sales" table:', err.message)
    throw err
  }
}