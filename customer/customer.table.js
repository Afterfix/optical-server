module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.customer') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "customer" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE customer (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,

          -- Basic Info
          name VARCHAR(255) NOT NULL,
          contact_no VARCHAR(20),

          -- Prescription History - Right Eye
          right_sph   DECIMAL(6, 2),
          right_cyl   DECIMAL(6, 2),
          right_axis  DECIMAL(6, 2),
          right_add   DECIMAL(6, 2),
          right_ipd   DECIMAL(6, 2),

          -- Prescription History - Left Eye
          left_sph    DECIMAL(6, 2),
          left_cyl    DECIMAL(6, 2),
          left_axis   DECIMAL(6, 2),
          left_add    DECIMAL(6, 2),
          left_ipd    DECIMAL(6, 2),

          -- Additional
          remarks     TEXT,

          created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE (tenant_id, name)
        );
      `);
      console.log('✅ "customer" table created.');

      // Indexes for performance
      await client.query(
        `CREATE INDEX idx_customer_tenant_id ON customer(tenant_id);`,
      );
      await client.query(`CREATE INDEX idx_customer_name ON customer(name);`);

      console.log('✅ Indexes for "customer" table created.');
    }
  } catch (err) {
    console.error('❌ Error creating/updating "customer" table:', err.message);
    throw err;
  }
};
