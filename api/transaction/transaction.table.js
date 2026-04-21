module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.transaction') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "transaction" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE transaction (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
          transaction_type VARCHAR(30) NOT NULL CHECK (
              transaction_type IN (
                'sale', 'purchase','expense', 'deposit','withdrawal','partnership', 'sale_return', 'purchase_return', 'transfer', 'service', 'received'
              )
          ),
          cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
          done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
          reference_id INTEGER,
          description TEXT,
          created_at TIMESTAMP DEFAULT now()
        );
      `);
      console.log('✅ "transaction" table created.');

      await client.query(`
        CREATE INDEX idx_transactions_tenant_id ON transaction(tenant_id);
      `);
      await client.query(`
        CREATE INDEX idx_transactions_reference_id ON transaction(reference_id);
      `);
       await client.query(`
        CREATE INDEX idx_transaction_cost_center_id ON transaction(cost_center_id);
      `);
      await client.query(`
        CREATE INDEX idx_transaction_done_by_id ON transaction(done_by_id);
      `);
      console.log(
        '✅ Indexes created on tenant_id, reference_id, done_by_id and cost_center_id columns of "transaction" table.'
      );
    }
  } catch (err) {
    console.error('❌ Error creating "transaction" table:', err.message);
    throw err;
  }
};