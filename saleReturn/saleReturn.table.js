// --- START OF FILE saleReturn.table.js ---

module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.sale_return') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log(
        'ℹ️ "sale_return" table already exists. Checking for schema updates...'
      );
    } else {
      await client.query(`
        CREATE TABLE sale_return (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          sale_id INTEGER NOT NULL,
          item_id INTEGER NOT NULL,
          done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
          cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
          return_quantity INTEGER NOT NULL,
          date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          reason TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          refunded_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          invoice_number VARCHAR(100) NOT NULL,
          total_refund_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES item(id)
        );
      `);
      console.log('✅ "sale_return" table has been created.');

      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_sale_return_tenant_id ON sale_return(tenant_id);`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_sale_return_sale_id ON sale_return(sale_id);`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_sale_return_item_id ON sale_return(item_id);`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_sale_return_done_by_id ON sale_return(done_by_id);`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_sale_return_cost_center_id ON sale_return(cost_center_id);`
      );
    }
  } catch (err) {
    console.error(
      '❌ Failed to create/update "sale_return" table:',
      err.message
    );
    throw err;
  }
};
