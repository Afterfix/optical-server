module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.lenses') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "lenses" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE lenses (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL, -- e.g., 'Single Vision', 'Progressive'
          index_value NUMERIC(4, 2) NOT NULL,  -- e.g., 1.50, 1.60, 1.67
          base_price NUMERIC(12, 2) DEFAULT 0 NOT NULL,
          
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ "lenses" table created.');

      // Indexes for performance
      await client.query(
        `CREATE INDEX idx_lenses_tenant_id ON lenses(tenant_id);`
      );
      await client.query(
        `CREATE INDEX idx_lenses_name ON lenses(name);`
      );

      console.log('✅ Indexes for "lenses" table created.');
    }
  } catch (err) {
    console.error('❌ Error creating/updating "lenses" table:', err.message);
    throw err;
  }
};