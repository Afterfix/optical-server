module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public."category"') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "category" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE "category" (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
          cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
          UNIQUE (tenant_id, name)
          );
      `);
      console.log('✅ "category" table has been created.');

      await client.query(`
        CREATE INDEX idx_category_tenant_id ON category(tenant_id);
      `);
      await client.query(
        `CREATE INDEX idx_category_done_by_id ON category(done_by_id);`,
      );
      await client.query(
        `CREATE INDEX idx_category_cost_center_id ON category(cost_center_id);`,
      );
      console.log('✅ Indexes for "category" table created.');
    }
  } catch (err) {
    console.error('❌ Failed to create "category" table:', err.message);
    throw err;
  }
};
