module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.transaction_ledger') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "transaction_ledger" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE transaction_ledger (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          transaction_id INTEGER NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
          account_id INTEGER NOT NULL REFERENCES account(id) ON DELETE CASCADE,
          debit NUMERIC(12,2) DEFAULT 0 CHECK (debit >= 0),
          credit NUMERIC(12,2) DEFAULT 0 CHECK (credit >= 0),
          created_at TIMESTAMP DEFAULT now()
        );
      `)
      console.log('✅ "transaction_ledger" table created.')

      await client.query(`
        CREATE INDEX idx_transaction_ledger_tenant_id ON transaction_ledger(tenant_id);
      `)
      await client.query(`
        CREATE INDEX idx_transaction_ledger_transaction_id ON transaction_ledger(transaction_id);
      `)
       await client.query(`
        CREATE INDEX idx_transaction_ledger_account_id ON transaction_ledger(account_id);
      `)
      console.log('✅ Indexes created on tenant_id, transaction_id, and account_id columns of "transaction_ledger" table.')
    }
  } catch (err) {
    console.error('❌ Error creating "transaction_ledger" table:', err.message)
    throw err
  }
}