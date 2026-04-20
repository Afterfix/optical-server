module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.transaction_payments') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "transaction_payments" table already exists.');

      const checkCol = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='transaction_payments' AND column_name='mode_of_payment_id';
      `);

    } else {
      await client.query(`
        CREATE TABLE transaction_payments (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES tenant(id) ON DELETE CASCADE, 
          account_id INTEGER NOT NULL REFERENCES account(id),
          amount DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          mode_of_payment_id INTEGER REFERENCES mode_of_payment(id),
          sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
          sale_return_id INTEGER REFERENCES sale_return(id) ON DELETE CASCADE,
          purchase_id INTEGER REFERENCES purchase(id) ON DELETE CASCADE,
          purchase_return_id INTEGER REFERENCES purchase_return(id) ON DELETE CASCADE,

          CONSTRAINT check_single_transaction_link CHECK (
            (sale_id IS NOT NULL)::int +
            (sale_return_id IS NOT NULL)::int +
            (purchase_id IS NOT NULL)::int +
            (purchase_return_id IS NOT NULL)::int <= 1
          )
        );
      `);

      console.log('✅ "transaction_payments" table has been created.');

      await client.query(`
        CREATE INDEX idx_srp_tenant_id ON transaction_payments(tenant_id);
      `);
      await client.query(`
        CREATE INDEX idx_srp_sale_return_id ON transaction_payments(sale_return_id);
      `);
      await client.query(`
        CREATE INDEX idx_srp_account_id ON transaction_payments(account_id);
      `);
      await client.query(`
        CREATE INDEX idx_srp_mode_of_payment_id ON transaction_payments(mode_of_payment_id);
      `);

      console.log('✅ Indexes for "transaction_payments" table created.');
    }
  } catch (err) {
    console.error('❌ Failed to create "transaction_payments" table:', err.message);
    throw err;
  }
};