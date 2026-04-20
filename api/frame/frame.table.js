module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.frame') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "frame" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE frame (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          brand_id INTEGER REFERENCES brand(id) ON DELETE SET NULL,
          model_no VARCHAR(100),
          category_id INTEGER REFERENCES category(id) ON DELETE SET NULL,
          gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'unisex')),
          frame_type VARCHAR(50) CHECK (frame_type IN ('full rim', 'rimless', 'half rim')),
          material VARCHAR(100),
          cost_price NUMERIC(12, 2) DEFAULT 0,
          selling_price NUMERIC(12, 2) DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ "frame" table created.');

      // Performance Indexes
      await client.query(`CREATE INDEX idx_frame_tenant_id ON frame(tenant_id);`);
      await client.query(`CREATE INDEX idx_frame_brand_id ON frame(brand_id);`);
      await client.query(`CREATE INDEX idx_frame_category_id ON frame(category_id);`);

      console.log('✅ Indexes for "frame" table created.');
    }
  } catch (err) {
    console.error('❌ Error creating/updating "frame" table:', err.message);
    throw err;
  }
};