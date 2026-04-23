module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.frame_variants') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "frame_variants" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE frame_variants (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,
          frame_id INTEGER REFERENCES frame(id) ON DELETE CASCADE,
          
          color VARCHAR(50),
          size VARCHAR(50),
          sku VARCHAR(100) UNIQUE NOT NULL,
          barcode VARCHAR(100),
          stock_qty INTEGER DEFAULT 0,
          image TEXT,
          
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ "frame_variants" table created.');

      // Indexes for performance
      await client.query(
        `CREATE INDEX idx_frame_variants_frame_id ON frame_variants(frame_id);`
      );
      await client.query(
        `CREATE INDEX idx_frame_variants_sku ON frame_variants(sku);`
      );
      await client.query(
        `CREATE INDEX idx_frame_variants_tenant_id ON frame_variants(tenant_id);`
      );

      console.log('✅ Indexes for "frame_variants" table created.');
    }

  

  } catch (err) {
    console.error('❌ Error creating/updating "frame_variants" table:', err.message);
    throw err;
  }
};