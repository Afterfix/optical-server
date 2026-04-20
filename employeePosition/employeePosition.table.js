module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public."employee_position"') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null

    if (tableExists) {
      console.log('ℹ️ "employee_position" table already exists.')
    } else {
      await client.query(`
        CREATE TABLE "employee_position" (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
          cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
          UNIQUE (tenant_id, name)
        );
      `)

      console.log('✅ "employee_position" table has been created.')

      await client.query(`
        CREATE INDEX idx_employeeposition_tenant_id ON "employee_position"(tenant_id);
      `)
      await client.query(
        `CREATE INDEX idx_employeeposition_done_by_id ON "employee_position"(done_by_id);`
      )
      await client.query(
        `CREATE INDEX idx_employeeposition_cost_center_id ON "employee_position"(cost_center_id);`
      )
    }
  } catch (err)
 {
    console.error('❌ Failed to create "employee_position" table:', err.message)
    throw err
  }
}