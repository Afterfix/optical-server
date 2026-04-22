module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.services') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "services" table already exists.');
    } else {
      await client.query(`
        CREATE TABLE services (
          id SERIAL PRIMARY KEY,
          tenant_id INTEGER REFERENCES "tenant"(id) ON DELETE CASCADE,
          customer_id INTEGER REFERENCES party(id) ON DELETE CASCADE,
          
          item_name VARCHAR(255),
          issue_report TEXT,
          diagnosis TEXT,
          service TEXT,
          service_charge NUMERIC(12, 2) DEFAULT 0,
          service_charge_status VARCHAR(50) DEFAULT 'unpaid',
          estimate_date TIMESTAMP,
          complete_date TIMESTAMP,
          
          description TEXT,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
          cost NUMERIC(12, 2) DEFAULT 0,
          delivery_date TIMESTAMP,
          
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ "services" table created.');
      // Indexes for performance
      await client.query(
        `CREATE INDEX idx_services_tenant_id ON services(tenant_id);`
      );
      await client.query(
        `CREATE INDEX idx_services_customer_id ON services(customer_id);`
      );
      await client.query(
        `CREATE INDEX idx_services_status ON services(status);`
      );

      console.log('✅ Indexes for "services" table created.');
    }
  } catch (err) {
    console.error('❌ Error creating/updating "services" table:', err.message);
    throw err;
  }
};