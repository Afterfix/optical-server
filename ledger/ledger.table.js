module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.ledger') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "ledger" table already exists.');
    } else {
      await client.query(`
       CREATE TABLE ledger (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
            done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
            cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
            name VARCHAR(255) NOT NULL,
            balance DECIMAL(30, 2) NOT NULL DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (tenant_id, name)
        );
      `);
      console.log('✅ "ledger" table has been created.');

      await client.query(`CREATE INDEX idx_ledger_tenant_id ON ledger(tenant_id);`);
      await client.query(
        `CREATE INDEX idx_ledger_done_by_id ON ledger(done_by_id);`
      );
      await client.query(
        `CREATE INDEX idx_ledger_cost_center_id ON ledger(cost_center_id);`
      );
      console.log('✅ Indexes for "ledger" table created.');
    }
  } catch (err) {
    console.error('❌ Failed to create "ledger" table:', err.message);
    throw err;
  }
};