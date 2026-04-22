module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.lens_addons') AS table_name;
    `);
    const tableExists = result.rows[0].table_name !== null;
    if (tableExists) {
      console.log('ℹ️ "lens_addons" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE lens_addons (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL, -- e.g., 'Anti-glare', 'Blue cut', 'UV'
          price NUMERIC(12, 2) DEFAULT 0,
          stock NUMERIC(12, 2) DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ "lens_addons" table created.');

      // Indexes for performance
      await client.query(
        `CREATE INDEX idx_lens_addons_tenant_id ON lens_addons(tenant_id);`
      );

      console.log('✅ Indexes for "lens_addons" table created.');
    }

    // Ensure 'stock' column exists for existing tables
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lens_addons' AND column_name='stock') THEN
          ALTER TABLE lens_addons ADD COLUMN stock NUMERIC(12, 2) DEFAULT 0;
        END IF;
      END $$;
    `);

  } catch (err) {
    console.error('❌ Error creating/updating "lens_addons" table:', err.message);
    throw err;
  }
};