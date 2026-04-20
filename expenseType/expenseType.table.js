module.exports = async (client) => {
  try {
    const result = await client.query(`
        SELECT to_regclass('public."expense_type"') AS table_name;
      `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "expense_type" table already exists.');
    } else {
      await client.query(`
          CREATE TABLE "expense_type" (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,
            done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
            cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (tenant_id, name)
            );
        `);

      console.log('✅ "expense_type" table has been created.');

      await client.query(`
          CREATE INDEX idx_expensetype_tenant_id ON "expense_type"(tenant_id);
          CREATE INDEX idx_expensetype_done_by_id ON "expense_type"(done_by_id);
          CREATE INDEX idx_expensetype_cost_center_id ON "expense_type"(cost_center_id);

        `);
    }
  } catch (err) {
    console.error('❌ Failed to create "expense_type" table:', err.message);
    throw err;
  }
};
