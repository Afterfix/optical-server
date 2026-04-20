module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public."cost_center"') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "cost_center" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE "cost_center" (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `)

      console.log('✅ "cost_center" table has been created.')

      await client.query(`
        CREATE INDEX idx_costcenter_tenant_id ON "cost_center"(tenant_id);
      `)
    }
  } catch (err) {
    console.error('❌ Failed to create "cost_center" table:', err.message)
    throw err
  }
}
