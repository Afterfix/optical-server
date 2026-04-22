module.exports = async (client) => {
  try {
    const result = await client.query(`
      SELECT to_regclass('public.prescription') AS table_name;
    `);

    const tableExists = result.rows[0].table_name !== null;

    if (tableExists) {
      console.log('ℹ️ "prescription" table already exists. Checking for missing columns...');
      // Ensure tenant_id exists
      await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prescription' AND column_name='tenant_id') THEN
            ALTER TABLE prescription ADD COLUMN tenant_id INTEGER REFERENCES tenant(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);
    } else {
      await client.query(`
        CREATE TABLE prescription (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES party(id) ON DELETE CASCADE,
          tenant_id INTEGER REFERENCES tenant(id) ON DELETE CASCADE,
          prescription_date DATE DEFAULT CURRENT_DATE,
          right_sph DECIMAL(6, 2),
          right_cyl DECIMAL(6, 2),
          right_axis DECIMAL(6, 2),
          right_add DECIMAL(6, 2),
          right_ipd DECIMAL(6, 2),
          left_sph DECIMAL(6, 2),
          left_cyl DECIMAL(6, 2),
          left_axis DECIMAL(6, 2),
          left_add DECIMAL(6, 2),
          left_ipd DECIMAL(6, 2),
          doctor_name VARCHAR(255),
          remarks TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ "prescription" table created.');
    }

    // Indices for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prescription_customer_id ON prescription(customer_id);
      CREATE INDEX IF NOT EXISTS idx_prescription_tenant_id ON prescription(tenant_id);
    `);
    console.log('✅ Indices for "prescription" table ensured.');
  } catch (err) {
    console.error('❌ Error creating/updating "prescription" table:', err.message);
    throw err;
  }
};