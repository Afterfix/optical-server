module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.employee') AS table_name;
    `)

    const tableExists = result.rows[0].table_name !== null
    if (tableExists) {
      console.log('ℹ️ "employee" table already exists.')
    } else {
      await client.query(`
      CREATE TABLE employee (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        address VARCHAR(255),
        employee_position_id INTEGER REFERENCES "employee_position"(id) ON DELETE SET NULL,
        done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
        cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
        salary DECIMAL(12, 2),
        hire_date DATE,
        photos TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (tenant_id, name)
      );
    `)
      console.log('✅ "employee" table created.')

      await client.query(`
        CREATE INDEX  idx_employee_tenant_id ON employee(tenant_id);
        CREATE INDEX  idx_employee_position_id ON employee(employee_position_id);
        CREATE INDEX  idx_employee_done_by_id ON employee(done_by_id);
        CREATE INDEX  idx_employee_cost_center_id ON employee(cost_center_id);
      `)
    }
  } catch (err) {
    console.error('❌ Error creating "employee" table:', err.message)
  }
}
