module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.voucher_transactions') AS table_name;
    `);
    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "voucher_transactions" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE voucher_transactions (
          id SERIAL PRIMARY KEY,
          voucher_id INTEGER NOT NULL REFERENCES "voucher"(id) ON DELETE CASCADE,
          invoice_id VARCHAR(50) NOT NULL,
          invoice_type VARCHAR(50) NOT NULL,
          received_amount DECIMAL(10, 2) NOT NULL
        );
      `);
      console.log('✅ "voucher_transactions" table created.');
      await client.query(
        `CREATE INDEX idx_voucher_transactions_voucher_id ON voucher_transactions(voucher_id);`
      );
      console.log(
        '✅ Index created on voucher_transactions(voucher_id).'
      );
    }
  } catch (err) {
    console.error('❌ Error creating "voucher_transactions" table:', err.message);
    throw err;
  }
};
