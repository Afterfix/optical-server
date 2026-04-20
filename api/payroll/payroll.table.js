module.exports = async (client) => {
  try {
    const result = await client.query(`
            SELECT to_regclass('public.payroll') AS table_name;
        `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "payroll" table already exists.');
    } else {
      await client.query(`
                CREATE TABLE payroll (
                    id SERIAL PRIMARY KEY,
                    tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE, 
                    employee_id INTEGER REFERENCES employee(id) ON DELETE CASCADE NOT NULL,
                    done_by_id INTEGER REFERENCES "done_by"(id) ON DELETE SET NULL,
                    cost_center_id INTEGER REFERENCES "cost_center"(id) ON DELETE SET NULL,
                    salary DECIMAL(12, 2) NOT NULL,
                    account_id INTEGER REFERENCES account(id) ON DELETE CASCADE NOT NULL,
                    pay_date DATE NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);
      console.log('✅ "payroll" table created.');

      await client.query(
        `CREATE INDEX idx_payroll_tenant_id ON payroll(tenant_id);`
      );
      console.log('✅ Index "idx_payroll_tenant_id" created.');

      await client.query(
        `CREATE INDEX idx_payroll_employee_id ON payroll(employee_id);`
      );
      console.log('✅ Index "idx_payroll_employee_id" created.');

      await client.query(
        `CREATE INDEX idx_payroll_done_by_id ON payroll(done_by_id);`
      );
      console.log('✅ Index "idx_payroll_done_by_id" created.');

      await client.query(
        `CREATE INDEX idx_payroll_cost_center_id ON payroll(cost_center_id);`
      );
      console.log('✅ Index "idx_payroll_cost_center_id" created.');
    }
  } catch (err) {
    console.error('❌ Failed to create "payroll" table:', err.message);
    throw err;
  }
};
