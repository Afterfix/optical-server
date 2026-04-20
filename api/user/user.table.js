module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public."user"') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "user" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE "user" (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE SET NULL, 
          role_id INTEGER REFERENCES "role"(id) ON DELETE SET NULL, 
          username VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL,
          active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (tenant_id, username)
        );
      `)

      console.log('✅ "user" table has been created.')
    }
  } catch (err) {
    console.error('❌ Failed to create "user" table:', err.message)
    throw err
  }
}
