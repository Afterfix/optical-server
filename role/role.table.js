module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.role') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "role" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE "role" (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          name VARCHAR(255) NOT NULL,
          permissions JSONB, 
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (tenant_id, name)
        );
      `)
      console.log('✅ "role" table has been created.')

      await client.query(`
        CREATE INDEX idx_role_tenant_id ON role(tenant_id);
      `)
      console.log('✅ Indexes for "role" table have been created.')
    }
  } catch (err) {
    console.error('❌ Failed to create "role" table:', err.message)
    throw err
  }
}
