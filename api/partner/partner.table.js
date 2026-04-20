module.exports = async (client) => {
  try {
    const result = await client.query(`
        SELECT to_regclass('public.partner') AS table_name;
        `);

    const tableExists = result.rows[0].table_name !== null;
    if (tableExists) {
      console.log('ℹ️ "partner" table already exists.');
    } else {
      await client.query(`
                CREATE TABLE partner (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
                done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL, -- <<< ADDED
                cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL, -- <<< ADDED
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (tenant_id, name)
                );
                `);
      console.log('✅ "partner" table created.');
      await client.query(
        `CREATE INDEX idx_partner_tenant_id ON partner(tenant_id);`,
      );
      await client.query(
        `CREATE INDEX idx_partner_done_by_id ON partner(done_by_id);`,
      ); // <<< ADDED
      await client.query(
        `CREATE INDEX idx_partner_cost_center_id ON partner(cost_center_id);`,
      ); // <<< ADDED
      console.log('✅ Indexes for "partner" table created.');
    }
  } catch (err) {
    console.error('❌ Error creating "partner" table:', err.message);
  }
};
