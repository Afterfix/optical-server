module.exports = async (client) => {
  try {
    const result = await client.query(`
        SELECT to_regclass('public."brand"') AS table_name;
      `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "brand" table already exists.')
    } else {
      await client.query(`
          CREATE TABLE "brand" (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
            cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
            UNIQUE (tenant_id, name)
             );
        `)

      console.log('✅ "brand" table has been created.')
      await client.query(`
          CREATE INDEX idx_brand_tenant_id ON brand(tenant_id);
        `)
      await client.query(
        `CREATE INDEX idx_brand_done_by_id ON brand(done_by_id);`
      )
      await client.query(
        `CREATE INDEX idx_brand_cost_center_id ON brand(cost_center_id);`
      )
    }
  } catch (err) {
    console.error('❌ Failed to create "brand" table:', err.message)
    throw err
  }
}
