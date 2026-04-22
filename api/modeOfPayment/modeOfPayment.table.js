module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.mode_of_payment') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "mode_of_payment" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE mode_of_payment (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
            cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
            default_ledger_id INTEGER REFERENCES "ledger"(id) ON DELETE SET NULL,
            UNIQUE (tenant_id, name)
        );
      `)
      console.log('✅ "mode_of_payment" table has been created.')

      // Create indexes
      await client.query(
        `CREATE INDEX idx_mop_tenant_id ON mode_of_payment(tenant_id);`
      )
      await client.query(
        `CREATE INDEX idx_mop_done_by_id ON mode_of_payment(done_by_id);`
      )
      await client.query(
        `CREATE INDEX idx_mop_cost_center_id ON mode_of_payment(cost_center_id);`
      )
      console.log('✅ Indexes for "mode_of_payment" table have been created.')
    }

    // Apply migration: add default_ledger_id if not exists
    await client.query(`
      ALTER TABLE mode_of_payment
      ADD COLUMN IF NOT EXISTS default_ledger_id INTEGER REFERENCES "ledger"(id) ON DELETE SET NULL;
    `);
    console.log('✅ mode_of_payment.default_ledger_id column ensured.');
  } catch (err) {
    console.error('❌ Failed to create "mode_of_payment" table:', err.message)
    throw err
  }
}