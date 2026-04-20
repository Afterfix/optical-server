module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public."done_by"') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "done_by" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE "done_by" (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `)

      console.log('✅ "done_by" table has been created.')

      await client.query(`
        CREATE INDEX idx_doneby_tenant_id ON "done_by"(tenant_id);
      `)
    }
  } catch (err) {
    console.error('❌ Failed to create "done_by" table:', err.message)
    throw err
  }
}
