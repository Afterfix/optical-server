const { pool } = require('./config/db');
async function check() {
  const client = await pool.connect();
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'mode_of_payment' AND column_name = 'default_ledger_id'`
  );
  console.log(res.rows.length > 0 ? '✅ COLUMN EXISTS' : '❌ COLUMN MISSING');
  client.release();
  pool.end();
}
check().catch(e => { console.error(e.message); process.exit(1); });
