module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.expenses') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "expenses" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE expenses (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          description TEXT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          expense_type_id INTEGER REFERENCES "expense_type"(id) ON DELETE CASCADE,
          date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ledger_id INTEGER REFERENCES ledger(id) ON DELETE CASCADE,
          done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
          cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL
        );
      `);
      console.log('✅ "expenses" table has been created.');

      await client.query(
        `CREATE INDEX idx_expenses_tenant_id ON expenses(tenant_id);`
      );
      await client.query(
        `CREATE INDEX idx_expenses_ledger_id ON expenses(ledger_id);`
      );
      await client.query(
        `CREATE INDEX idx_expenses_expense_type_id ON expenses(expense_type_id);`
      );
      await client.query(
        `CREATE INDEX idx_expenses_done_by_id ON expenses(done_by_id);`
      );
      await client.query(
        `CREATE INDEX idx_expenses_cost_center_id ON expenses(cost_center_id);`
      );
      console.log('✅ Indexes for "expenses" table have been created.');
    }
  } catch (err) {
    console.error('❌ Failed to create "expenses" table:', err.message);
    throw err;
  }
};
