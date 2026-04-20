module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.tenant') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "tenant" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE tenant (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'optical',
            plan VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `)
      console.log('✅ "tenant" table has been created.')
    }
  } catch (err) {
    console.error('❌ Failed to create "tenant" table:', err.message)
    throw err
  }
}