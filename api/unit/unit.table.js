module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public."unit"') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "unit" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE "unit" (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          name VARCHAR(100) NOT NULL,
          symbol VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
          cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
          UNIQUE (tenant_id, name)
        );
      `)

      console.log('✅ "unit" table has been created.')
      await client.query(`
        CREATE INDEX idx_unit_tenant_id ON unit(tenant_id);
      `)
      await client.query(
        `CREATE INDEX idx_unit_done_by_id ON unit(done_by_id);`
      )
      await client.query(
        `CREATE INDEX idx_unit_cost_center_id ON unit(cost_center_id);`
      )
    }
  } catch (err) {
    console.error('❌ Failed to create "unit" table:', err.message)
    throw err
  }
}