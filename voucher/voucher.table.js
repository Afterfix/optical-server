module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.voucher') AS table_name;
    `);
    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      // Logic to add column if table already exists
      await client.query(`
        ALTER TABLE voucher 
        ADD COLUMN IF NOT EXISTS expense_type_id INTEGER REFERENCES "expense_type"(id) ON DELETE SET NULL;
      `);
      console.log(
        'ℹ️ "voucher" table already exists. Ensured "expense_type_id" exists.'
      );
    } else {
      await client.query(`
        CREATE TABLE voucher (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,
          amount DECIMAL(10, 2) NOT NULL,
          date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          description TEXT,
          voucher_no VARCHAR(100) NOT NULL UNIQUE,
          voucher_type INTEGER NOT NULL, -- 0 for paid, 1 for received
          from_ledger_id INTEGER REFERENCES "ledger"(id) ON DELETE SET NULL,
          to_ledger_id INTEGER REFERENCES "ledger"(id) ON DELETE SET NULL,
          cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
          done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
          mode_of_payment_id INTEGER REFERENCES mode_of_payment(id),
          expense_type_id INTEGER REFERENCES "expense_type"(id) ON DELETE SET NULL
        );
      `);
      console.log('✅ "voucher" table created.');
      await client.query(
        `CREATE INDEX idx_voucher_tenant_id ON voucher(tenant_id);`
      );
      await client.query(
        `CREATE INDEX idx_voucher_from_ledger_id ON voucher(from_ledger_id);`
      );
      await client.query(
        `CREATE INDEX idx_voucher_to_ledger_id ON voucher(to_ledger_id);`
      );
      await client.query(
        `CREATE INDEX idx_voucher_cost_center_id ON voucher(cost_center_id);`
      );
      await client.query(
        `CREATE INDEX idx_voucher_done_by_id ON voucher(done_by_id);`
      );
      await client.query(
        `CREATE INDEX idx_voucher_mode_of_payment_id ON voucher(mode_of_payment_id);`
      );
      console.log('✅ Indexes created for "voucher" table.');
    }
  } catch (err) {
    console.error('❌ Error creating "voucher" table:', err.message);
    throw err;
  }
};
